"""
Waypoints API blueprint.

@fileoverview CRUD for user-owned map pins. A waypoint can be private
(only the owner sees it) or shared with one or more of the owner's
crews — every member of those crews then sees the waypoint on their
map and in their list. Shares are owned by the waypoint owner; a crew
member cannot reshare someone else's waypoint.

@author David Seguin
@version 1.0.0
@since 2026
@license Professional - All Rights Reserved
"""

import uuid

from flask import Blueprint, g, jsonify, request
from sqlalchemy import delete, or_, select

from db import SessionLocal
from models import Crew, CrewMember, Waypoint, WaypointShare
from models.waypoint import WAYPOINT_ICONS
from utils.auth import require_auth
from utils.geo import point_to_latlng, point_wkt, valid_latlng
from utils.logger import logger


bp = Blueprint('waypoints', __name__, url_prefix='/api/v1/waypoints')


def _serialize(w: Waypoint, share_crew_ids: list[uuid.UUID]) -> dict:
    latlng = point_to_latlng(w.location)
    return {
        'id': str(w.id),
        'owner_username': w.owner_username,
        'name': w.name,
        'description': w.description,
        'lat': latlng[0] if latlng else None,
        'lng': latlng[1] if latlng else None,
        'icon': w.icon,
        'crew_ids': [str(c) for c in share_crew_ids],
        'created_at': w.created_at.isoformat() if w.created_at else None,
        'updated_at': w.updated_at.isoformat() if w.updated_at else None,
    }


def _user_crew_ids(db, username: str) -> list[uuid.UUID]:
    rows = db.execute(
        select(CrewMember.crew_id).where(CrewMember.username == username)
    ).scalars().all()
    return list(rows)


def _share_ids_for(db, waypoint_id: uuid.UUID) -> list[uuid.UUID]:
    rows = db.execute(
        select(WaypointShare.crew_id).where(WaypointShare.waypoint_id == waypoint_id)
    ).scalars().all()
    return list(rows)


def _validate_crew_ids(db, username: str, crew_ids: list[str]) -> tuple[list[uuid.UUID], str | None]:
    """Return (parsed_uuids, error_msg). Owner must be a member of every crew."""
    parsed: list[uuid.UUID] = []
    for cid in crew_ids:
        try:
            parsed.append(uuid.UUID(cid))
        except (TypeError, ValueError):
            return [], f'invalid crew id: {cid}'
    if not parsed:
        return [], None
    my_crews = set(_user_crew_ids(db, username))
    for pid in parsed:
        if pid not in my_crews:
            return [], 'you can only share with crews you belong to'
    return parsed, None


@bp.route('', methods=['GET'])
@require_auth
def list_waypoints():
    """Return waypoints I own + waypoints shared with any of my crews."""
    db = SessionLocal()
    username = g.user.get('username')
    my_crews = _user_crew_ids(db, username)

    if my_crews:
        shared_subq = select(WaypointShare.waypoint_id).where(
            WaypointShare.crew_id.in_(my_crews)
        )
        stmt = select(Waypoint).where(
            or_(Waypoint.owner_username == username, Waypoint.id.in_(shared_subq))
        ).order_by(Waypoint.created_at.desc())
    else:
        stmt = select(Waypoint).where(
            Waypoint.owner_username == username
        ).order_by(Waypoint.created_at.desc())

    waypoints = db.execute(stmt).scalars().all()
    out = []
    for w in waypoints:
        shares = _share_ids_for(db, w.id)
        out.append(_serialize(w, shares))
    return jsonify(out)


@bp.route('', methods=['POST'])
@require_auth
def create_waypoint():
    """Create a waypoint (optionally shared with one or more of my crews)."""
    body = request.get_json(silent=True) or {}
    name = (body.get('name') or '').strip()
    lat = body.get('lat')
    lng = body.get('lng')
    icon = body.get('icon') or 'other'
    description = (body.get('description') or '').strip() or None
    crew_ids = body.get('crew_ids') or []

    if not name:
        return jsonify({'error': 'name is required'}), 400
    if not valid_latlng(lat, lng):
        return jsonify({'error': 'lat and lng must be valid coordinates'}), 400
    if icon not in WAYPOINT_ICONS:
        return jsonify({'error': f'icon must be one of {WAYPOINT_ICONS}'}), 400
    if not isinstance(crew_ids, list):
        return jsonify({'error': 'crew_ids must be a list'}), 400

    db = SessionLocal()
    username = g.user.get('username')
    parsed_crews, err = _validate_crew_ids(db, username, crew_ids)
    if err:
        return jsonify({'error': err}), 400

    waypoint = Waypoint(
        owner_username=username,
        name=name[:120],
        description=description,
        location=point_wkt(float(lat), float(lng)),
        icon=icon,
    )
    db.add(waypoint)
    db.flush()  # assigns waypoint.id

    for cid in parsed_crews:
        db.add(WaypointShare(waypoint_id=waypoint.id, crew_id=cid))

    db.commit()
    db.refresh(waypoint)
    logger.info(f'Waypoint created: {waypoint.name} by {username}')
    return jsonify(_serialize(waypoint, parsed_crews)), 201


@bp.route('/<uuid:waypoint_id>', methods=['PUT'])
@require_auth
def update_waypoint(waypoint_id):
    """Owner-only update. Replaces share set when crew_ids is provided."""
    body = request.get_json(silent=True) or {}
    db = SessionLocal()
    username = g.user.get('username')
    waypoint = db.get(Waypoint, waypoint_id)
    if waypoint is None:
        return jsonify({'error': 'waypoint not found'}), 404
    if waypoint.owner_username != username:
        return jsonify({'error': 'forbidden'}), 403

    if 'name' in body:
        new_name = (body['name'] or '').strip()
        if not new_name:
            return jsonify({'error': 'name cannot be empty'}), 400
        waypoint.name = new_name[:120]

    if 'description' in body:
        d = (body['description'] or '').strip()
        waypoint.description = d or None

    if 'lat' in body or 'lng' in body:
        if not valid_latlng(body.get('lat'), body.get('lng')):
            return jsonify({'error': 'lat and lng must be valid coordinates'}), 400
        waypoint.location = point_wkt(float(body['lat']), float(body['lng']))

    if 'icon' in body:
        if body['icon'] not in WAYPOINT_ICONS:
            return jsonify({'error': f'icon must be one of {WAYPOINT_ICONS}'}), 400
        waypoint.icon = body['icon']

    if 'crew_ids' in body:
        if not isinstance(body['crew_ids'], list):
            return jsonify({'error': 'crew_ids must be a list'}), 400
        parsed_crews, err = _validate_crew_ids(db, username, body['crew_ids'])
        if err:
            return jsonify({'error': err}), 400
        db.execute(delete(WaypointShare).where(WaypointShare.waypoint_id == waypoint.id))
        for cid in parsed_crews:
            db.add(WaypointShare(waypoint_id=waypoint.id, crew_id=cid))

    db.commit()
    db.refresh(waypoint)
    shares = _share_ids_for(db, waypoint.id)
    return jsonify(_serialize(waypoint, shares))


@bp.route('/<uuid:waypoint_id>', methods=['DELETE'])
@require_auth
def delete_waypoint(waypoint_id):
    """Owner-only delete."""
    db = SessionLocal()
    username = g.user.get('username')
    waypoint = db.get(Waypoint, waypoint_id)
    if waypoint is None:
        return jsonify({'error': 'waypoint not found'}), 404
    if waypoint.owner_username != username:
        return jsonify({'error': 'forbidden'}), 403
    db.delete(waypoint)
    db.commit()
    logger.info(f'Waypoint deleted: id={waypoint_id}')
    return jsonify({'ok': True})
