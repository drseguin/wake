"""
Live location sharing API.

@fileoverview The signed-in user can opt in to broadcasting their position
to every crew they belong to. PUT /location/me upserts the share row. GET
/location/crews returns the latest position of every crewmate who is
currently broadcasting (regardless of which crew — the user may belong to
several). Stale rules (>10 min faded, >1h hidden) are enforced client-side.

@author David Seguin
@version 1.0.0
@since 2026
@license Professional - All Rights Reserved
"""

from flask import Blueprint, g, jsonify, request
from sqlalchemy import select

from db import SessionLocal
from models import CrewMember, LocationShare, Profile
from utils.auth import require_auth
from utils.geo import point_to_latlng, point_wkt, valid_latlng
from utils.logger import logger


bp = Blueprint('location', __name__, url_prefix='/api/v1/location')


def _serialize_self(share: LocationShare | None) -> dict:
    if share is None:
        return {'enabled': False, 'lat': None, 'lng': None,
                'heading_deg': None, 'speed_kts': None, 'updated_at': None}
    latlng = point_to_latlng(share.last_location)
    return {
        'enabled': share.enabled,
        'lat': latlng[0] if latlng else None,
        'lng': latlng[1] if latlng else None,
        'heading_deg': share.heading_deg,
        'speed_kts': share.speed_kts,
        'updated_at': share.updated_at.isoformat() if share.updated_at else None,
    }


@bp.route('/me', methods=['GET'])
@require_auth
def get_me():
    db = SessionLocal()
    me = g.user.get('username')
    return jsonify(_serialize_self(db.get(LocationShare, me)))


@bp.route('/me', methods=['PUT'])
@require_auth
def put_me():
    body = request.get_json(silent=True) or {}
    enabled = bool(body.get('enabled'))
    lat = body.get('lat')
    lng = body.get('lng')
    heading = body.get('heading_deg')
    speed = body.get('speed_kts')

    db = SessionLocal()
    me = g.user.get('username')
    if db.get(Profile, me) is None:
        # Auto-create stub so FK doesn't fail.
        db.add(Profile(username=me, display_name=me))
        db.flush()

    share = db.get(LocationShare, me)
    if share is None:
        share = LocationShare(username=me, enabled=enabled)
        db.add(share)

    share.enabled = enabled

    if lat is not None or lng is not None:
        if not valid_latlng(lat, lng):
            return jsonify({'error': 'lat and lng must be valid coordinates'}), 400
        share.last_location = point_wkt(float(lat), float(lng))

    if heading is not None:
        try:
            share.heading_deg = float(heading) % 360.0
        except (TypeError, ValueError):
            return jsonify({'error': 'heading_deg must be a number'}), 400
    if speed is not None:
        try:
            share.speed_kts = max(0.0, float(speed))
        except (TypeError, ValueError):
            return jsonify({'error': 'speed_kts must be a number'}), 400

    db.commit()
    db.refresh(share)
    logger.debug(f'Location updated for {me} (enabled={enabled})')
    return jsonify(_serialize_self(share))


@bp.route('/crews', methods=['GET'])
@require_auth
def crew_locations():
    """Return latest broadcast position for every member of any of my crews."""
    db = SessionLocal()
    me = g.user.get('username')

    my_crew_ids_subq = select(CrewMember.crew_id).where(CrewMember.username == me)
    crewmates_subq = (
        select(CrewMember.username)
        .where(CrewMember.crew_id.in_(my_crew_ids_subq))
        .where(CrewMember.username != me)
    )

    rows = db.execute(
        select(LocationShare, Profile)
        .join(Profile, Profile.username == LocationShare.username)
        .where(LocationShare.username.in_(crewmates_subq))
        .where(LocationShare.enabled.is_(True))
        .where(LocationShare.last_location.isnot(None))
    ).all()

    out = []
    seen = set()
    for share, prof in rows:
        if share.username in seen:
            continue
        seen.add(share.username)
        latlng = point_to_latlng(share.last_location)
        if latlng is None:
            continue
        out.append({
            'username': share.username,
            'display': prof.effective_handle(),
            'boat_name': prof.boat_name,
            'boat_type': prof.boat_type,
            'lat': latlng[0],
            'lng': latlng[1],
            'heading_deg': share.heading_deg,
            'speed_kts': share.speed_kts,
            'updated_at': share.updated_at.isoformat() if share.updated_at else None,
        })
    return jsonify(out)
