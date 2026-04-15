"""
Profile API blueprint.

@fileoverview GET/PUT for the current user's boater profile. The profile
row is created on first read so the frontend can always assume a profile
exists for the logged-in user. Display label rules:
  - handle_type='name'  -> display_name (or username fallback)
  - handle_type='boat'  -> boat_name (or display_name fallback)

@author David Seguin
@version 1.0.0
@since 2026
@license Professional - All Rights Reserved
"""

from flask import Blueprint, g, jsonify, request

from db import SessionLocal
from models import Profile, Marina
from models.profile import BOAT_TYPES, HANDLE_TYPES
from utils.auth import require_auth
from utils.logger import logger


bp = Blueprint('profile', __name__, url_prefix='/api/v1/profile')


def _serialize(profile: Profile, marina_name: str | None) -> dict:
    return {
        'username': profile.username,
        'display_name': profile.display_name,
        'handle_type': profile.handle_type,
        'boat_name': profile.boat_name,
        'boat_type': profile.boat_type,
        'home_marina_id': profile.home_marina_id,
        'home_marina_name': marina_name,
        'effective_handle': profile.effective_handle(),
    }


def _get_or_create(db, username: str, fallback_display_name: str) -> Profile:
    profile = db.get(Profile, username)
    if profile is None:
        profile = Profile(
            username=username,
            display_name=fallback_display_name or username,
            handle_type='name',
        )
        db.add(profile)
        db.commit()
        logger.info(f'Created stub profile for {username}')
    return profile


def _marina_name(db, marina_id: int | None) -> str | None:
    if marina_id is None:
        return None
    m = db.get(Marina, marina_id)
    return m.name if m else None


@bp.route('', methods=['GET'])
@require_auth
def get_profile():
    """Return (creating if needed) the current user's profile."""
    db = SessionLocal()
    username = g.user.get('username') or 'unknown'
    fallback = (
        (g.user.get('firstName') or '').strip()
        or g.user.get('username')
        or 'unknown'
    )
    profile = _get_or_create(db, username, fallback)
    return jsonify(_serialize(profile, _marina_name(db, profile.home_marina_id)))


@bp.route('', methods=['PUT'])
@require_auth
def put_profile():
    """Update display name / handle type / boat info / home marina."""
    body = request.get_json(silent=True) or {}
    if not isinstance(body, dict):
        return jsonify({'error': 'Body must be a JSON object'}), 400

    db = SessionLocal()
    username = g.user.get('username') or 'unknown'
    fallback = (g.user.get('firstName') or '').strip() or username
    profile = _get_or_create(db, username, fallback)

    if 'display_name' in body:
        name = (body['display_name'] or '').strip()
        if not name:
            return jsonify({'error': 'display_name cannot be empty'}), 400
        profile.display_name = name[:120]

    if 'handle_type' in body:
        ht = body['handle_type']
        if ht not in HANDLE_TYPES:
            return jsonify({'error': f'handle_type must be one of {HANDLE_TYPES}'}), 400
        profile.handle_type = ht

    if 'boat_name' in body:
        bn = body['boat_name']
        profile.boat_name = (bn or '').strip()[:120] or None

    if 'boat_type' in body:
        bt = body['boat_type']
        if bt is not None and bt not in BOAT_TYPES:
            return jsonify({'error': f'boat_type must be one of {BOAT_TYPES}'}), 400
        profile.boat_type = bt or None

    if 'home_marina_id' in body:
        mid = body['home_marina_id']
        if mid is None:
            profile.home_marina_id = None
        else:
            try:
                mid_int = int(mid)
            except (TypeError, ValueError):
                return jsonify({'error': 'home_marina_id must be an integer'}), 400
            if db.get(Marina, mid_int) is None:
                return jsonify({'error': 'unknown marina'}), 400
            profile.home_marina_id = mid_int

    # Reject "boat" handle without a boat name.
    if profile.handle_type == 'boat' and not profile.boat_name:
        return jsonify({
            'error': 'Set a boat_name before choosing the boat handle'
        }), 400

    db.commit()
    logger.debug(f'Updated profile for {username}: {list(body.keys())}')
    return jsonify(_serialize(profile, _marina_name(db, profile.home_marina_id)))
