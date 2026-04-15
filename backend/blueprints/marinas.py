"""
Marinas API blueprint.

@fileoverview Public read of marina list (used in profile dropdowns and
shown on the map). Admin-gated create/update/delete so the catalogue can
grow over time without a code change.

@author David Seguin
@version 1.0.0
@since 2026
@license Professional - All Rights Reserved
"""

from flask import Blueprint, jsonify, request
from sqlalchemy import select

from db import SessionLocal
from models import Marina
from utils.auth import require_auth, require_role
from utils.geo import point_to_latlng, point_wkt, valid_latlng
from utils.logger import logger


bp = Blueprint('marinas', __name__, url_prefix='/api/v1/marinas')


def _serialize(m: Marina) -> dict:
    latlng = point_to_latlng(m.location)
    return {
        'id': m.id,
        'name': m.name,
        'lat': latlng[0] if latlng else None,
        'lng': latlng[1] if latlng else None,
        'notes': m.notes,
    }


@bp.route('', methods=['GET'])
@require_auth
def list_marinas():
    """Return every marina, sorted by name."""
    db = SessionLocal()
    rows = db.execute(select(Marina).order_by(Marina.name)).scalars().all()
    return jsonify([_serialize(m) for m in rows])


@bp.route('', methods=['POST'])
@require_role()
def create_marina():
    """Admin: add a new marina."""
    body = request.get_json(silent=True) or {}
    name = (body.get('name') or '').strip()
    lat = body.get('lat')
    lng = body.get('lng')
    notes = body.get('notes')

    if not name:
        return jsonify({'error': 'name is required'}), 400
    if not valid_latlng(lat, lng):
        return jsonify({'error': 'lat and lng must be valid coordinates'}), 400

    db = SessionLocal()
    if db.execute(select(Marina).where(Marina.name == name)).scalar_one_or_none():
        return jsonify({'error': 'marina with that name already exists'}), 409

    marina = Marina(
        name=name[:120],
        location=point_wkt(float(lat), float(lng)),
        notes=(notes or None),
    )
    db.add(marina)
    db.commit()
    db.refresh(marina)
    logger.info(f'Marina created: {marina.name} (id={marina.id})')
    return jsonify(_serialize(marina)), 201


@bp.route('/<int:marina_id>', methods=['PUT'])
@require_role()
def update_marina(marina_id):
    """Admin: update an existing marina."""
    body = request.get_json(silent=True) or {}
    db = SessionLocal()
    marina = db.get(Marina, marina_id)
    if marina is None:
        return jsonify({'error': 'marina not found'}), 404

    if 'name' in body:
        new_name = (body['name'] or '').strip()
        if not new_name:
            return jsonify({'error': 'name cannot be empty'}), 400
        marina.name = new_name[:120]

    if 'lat' in body or 'lng' in body:
        lat = body.get('lat')
        lng = body.get('lng')
        if not valid_latlng(lat, lng):
            return jsonify({'error': 'lat and lng must be valid coordinates'}), 400
        marina.location = point_wkt(float(lat), float(lng))

    if 'notes' in body:
        marina.notes = (body['notes'] or None)

    db.commit()
    logger.info(f'Marina updated: {marina.name} (id={marina.id})')
    return jsonify(_serialize(marina))


@bp.route('/<int:marina_id>', methods=['DELETE'])
@require_role()
def delete_marina(marina_id):
    """Admin: remove a marina. Profiles referencing it are set to NULL."""
    db = SessionLocal()
    marina = db.get(Marina, marina_id)
    if marina is None:
        return jsonify({'error': 'marina not found'}), 404
    db.delete(marina)
    db.commit()
    logger.info(f'Marina deleted: id={marina_id}')
    return jsonify({'ok': True})
