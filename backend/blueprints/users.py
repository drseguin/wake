"""
Users API blueprint.

@fileoverview Lightweight user search used by the crew-invite typeahead.
Matches on display_name or boat_name (case-insensitive prefix). Returns
a public-safe subset of profile data — never email, roles, etc.

@author David Seguin
@version 1.0.0
@since 2026
@license Professional - All Rights Reserved
"""

from flask import Blueprint, g, jsonify, request
from sqlalchemy import or_, select

from db import SessionLocal
from models import Profile
from utils.auth import require_auth


bp = Blueprint('users', __name__, url_prefix='/api/v1/users')


@bp.route('/search', methods=['GET'])
@require_auth
def search():
    """Return up to 20 profiles whose display or boat name matches `q`."""
    q = (request.args.get('q') or '').strip()
    if len(q) < 2:
        return jsonify([])

    me = g.user.get('username')
    pattern = f'{q}%'

    db = SessionLocal()
    rows = db.execute(
        select(Profile).where(
            or_(
                Profile.display_name.ilike(pattern),
                Profile.boat_name.ilike(pattern),
                Profile.username.ilike(pattern),
            )
        ).where(Profile.username != me)
        .order_by(Profile.display_name)
        .limit(20)
    ).scalars().all()

    return jsonify([
        {
            'username': p.username,
            'display': p.effective_handle(),
            'boat_name': p.boat_name,
        }
        for p in rows
    ])
