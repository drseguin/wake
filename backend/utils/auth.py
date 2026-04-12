"""
Auth Decorators and Session Helpers

@fileoverview Provides reusable Flask decorators for gating endpoints on
authentication and Keycloak realm roles. Loads the session from Redis using
the `auth_token` cookie; falls back to a synthetic admin when SINGLE_USER_MODE
is enabled. Role name defaults to the `admin_role` from `backend/keycloak.json`.

@author David Seguin
@version 1.0.0
@since 2026
@license Professional - All Rights Reserved

Key Features:
- `@require_auth` — 401 if no valid session
- `@require_role(role)` — 401 if unauthenticated, 403 if role missing
- Single source of truth for the admin role (Keycloak config)

Dependencies:
- redis (session lookup)
- Flask (request, jsonify, g)

Security Considerations:
- Sessions are server-side in Redis; cookie carries only an opaque id
- Role list comes from the JWT decoded at callback time; never trusted from client

Performance Notes:
- One Redis GET per gated request; connection pooled via redis.from_url
"""

from functools import wraps
import json

import redis
from flask import g, jsonify, request

from config import Config
from utils.logger import logger


_redis_client = None


def _redis():
    """Return a lazily-initialised Redis client (connection pooled)."""
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(Config.REDIS_URL, decode_responses=True)
    return _redis_client


def load_session():
    """
    Load the current session from Redis, or return a synthetic admin in
    SINGLE_USER_MODE.

    @returns {dict|None} Session dict with `user_info`, or None if unauthenticated
    """
    if Config.SINGLE_USER_MODE:
        admin_role = Config.KEYCLOAK.get('admin_role', 'admin')
        return {
            'user_info': {
                'username': 'admin',
                'email': 'admin@localhost',
                'firstName': 'Local',
                'lastName': 'Admin',
                'roles': [admin_role],
            }
        }

    token = request.cookies.get('auth_token')
    if not token:
        return None

    raw = _redis().get(f'session:{token}')
    if not raw:
        return None

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        logger.error('Corrupted session data in Redis')
        return None


def require_auth(fn):
    """
    Decorator: return 401 unless the request has a valid session.

    On success, sets `g.user` to the session's user_info dict.
    """
    @wraps(fn)
    def wrapped(*args, **kwargs):
        session = load_session()
        if session is None:
            return jsonify({'error': 'Not authenticated'}), 401
        g.user = session['user_info']
        return fn(*args, **kwargs)
    return wrapped


def require_role(role=None):
    """
    Decorator: return 401 if unauthenticated, 403 if the user lacks `role`.

    When `role` is None, falls back to `Config.KEYCLOAK['admin_role']`.

    @param {str|None} role - Realm role name; defaults to configured admin_role
    """
    def decorator(fn):
        @wraps(fn)
        def wrapped(*args, **kwargs):
            required = role or Config.KEYCLOAK.get('admin_role')
            session = load_session()
            if session is None:
                return jsonify({'error': 'Not authenticated'}), 401

            user_info = session['user_info']
            roles = user_info.get('roles', [])
            if required not in roles:
                logger.warning(
                    f'Role check failed for {user_info.get("username")}: '
                    f'required "{required}", have {roles}'
                )
                return jsonify({'error': 'Forbidden'}), 403

            g.user = user_info
            return fn(*args, **kwargs)
        return wrapped
    return decorator
