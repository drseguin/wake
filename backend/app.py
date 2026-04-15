"""
WAKE App Backend - Flask Application

@fileoverview Main Flask application providing authentication endpoints
(Keycloak SSO with PKCE), health checks, and configuration API. Supports
SINGLE_USER_MODE for local development without Keycloak.

@author David Seguin
@version 1.0.0
@since 2026
@license Professional - All Rights Reserved

Key Features:
- Keycloak SSO authentication with OAuth2 PKCE flow
- SINGLE_USER_MODE for development without Keycloak
- Redis-backed session management
- Health check endpoint for monitoring
- Configuration endpoint for frontend

Dependencies:
- Flask, Flask-CORS
- Redis for session storage
- Requests for Keycloak API calls

Security Considerations:
- HTTPOnly, Secure cookies for session tokens
- PKCE (S256) for OAuth2 authorization code flow
- CSRF protection via state parameter
- All tokens stored server-side in Redis

Performance Notes:
- Redis session lookup on every authenticated request
- Keycloak token exchange is a synchronous HTTP call
"""

import hashlib
import json
import os
import secrets
import base64
import uuid
from datetime import datetime, timezone

import redis
import requests
from flask import Flask, g, jsonify, request, redirect, make_response
from flask_cors import CORS

from config import Config
from utils.logger import logger
from utils.auth import require_auth
import db as db_module
from blueprints import register_blueprints


def create_app():
    """
    Create and configure the Flask application.

    @returns {Flask} Configured Flask application instance
    """
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, supports_credentials=True, origins=['https://localhost'])

    redis_client = redis.from_url(Config.REDIS_URL, decode_responses=True)
    kc = Config.KEYCLOAK

    logger.info(f'Starting {Config.APP_NAME} backend')
    logger.info(f'SINGLE_USER_MODE: {Config.SINGLE_USER_MODE}')

    db_module.init_app(app)
    register_blueprints(app)

    # ------------------------------------------------------------------ #
    # Request ID Propagation
    # ------------------------------------------------------------------ #

    @app.before_request
    def _assign_request_id():
        """Stamp every request with an id for end-to-end tracing."""
        incoming = request.headers.get('X-Request-ID', '').strip()
        g.request_id = incoming[:32] if incoming else uuid.uuid4().hex[:12]

    @app.after_request
    def _propagate_request_id(response):
        """Echo the request id back so the frontend can log it."""
        if hasattr(g, 'request_id'):
            response.headers['X-Request-ID'] = g.request_id
        return response

    # ------------------------------------------------------------------ #
    # Health Check
    # ------------------------------------------------------------------ #

    @app.route('/api/v1/health')
    def health():
        """
        Health check endpoint.

        @returns {JSON} Status and timestamp
        """
        logger.debug('Health check requested')
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'version': '1.0.0'
        })

    # ------------------------------------------------------------------ #
    # Frontend Configuration
    # ------------------------------------------------------------------ #

    @app.route('/api/v1/config')
    def get_config():
        """
        Return frontend configuration flags.

        @returns {JSON} Configuration object with single_user_mode flag
        """
        from utils.version_manager import get_version_info
        version_info = get_version_info()
        return jsonify({
            'app_name': Config.APP_NAME,
            'single_user_mode': Config.SINGLE_USER_MODE,
            'admin_role': kc.get('admin_role'),
            'log_level': Config.LOG_LEVEL,
            'version': version_info['version'],
            'build_timestamp': version_info['build_timestamp']
        })

    # ------------------------------------------------------------------ #
    # Authentication Endpoints
    # ------------------------------------------------------------------ #

    @app.route('/api/v1/auth/user')
    def auth_user():
        """
        Return the currently authenticated user's information.

        In SINGLE_USER_MODE, returns a synthetic admin user.
        Otherwise, looks up the session in Redis via the auth_token cookie.

        @returns {JSON} User info (username, email, firstName, lastName, roles)
        @throws {401} When no valid session exists
        """
        if Config.SINGLE_USER_MODE:
            admin_role = kc.get('admin_role', 'admin')
            return jsonify({
                'username': 'admin',
                'email': 'admin@localhost',
                'firstName': 'Local',
                'lastName': 'Admin',
                'roles': [admin_role]
            })

        token = request.cookies.get('auth_token')
        if not token:
            logger.debug('No auth_token cookie found')
            return jsonify({'error': 'Not authenticated'}), 401

        session_data = redis_client.get(f'session:{token}')
        if not session_data:
            logger.debug('Session not found in Redis')
            return jsonify({'error': 'Session expired'}), 401

        session = json.loads(session_data)
        logger.debug(f'User authenticated: {session["user_info"]["username"]}')
        return jsonify(session['user_info'])

    @app.route('/api/v1/auth/login')
    def auth_login():
        """
        Initiate Keycloak OAuth2 login with PKCE.

        Generates a code verifier/challenge pair and state parameter,
        stores them in Redis, and returns the Keycloak authorization URL.

        @returns {JSON} Object with login_url for browser redirect
        """
        if Config.SINGLE_USER_MODE:
            return jsonify({'login_url': '/'})

        logger.info('Initiating Keycloak login')

        # Generate PKCE code verifier and challenge
        code_verifier = secrets.token_urlsafe(64)
        code_challenge = base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode()).digest()
        ).rstrip(b'=').decode()

        # Generate state for CSRF protection
        state = secrets.token_urlsafe(32)

        # Store in Redis (5 minute TTL for login flow)
        redis_client.setex(
            f'auth_state:{state}',
            300,
            json.dumps({'code_verifier': code_verifier})
        )

        # Build Keycloak authorization URL
        auth_url = (
            f'{kc["public_url"]}/realms/{kc["realm"]}/protocol/openid-connect/auth'
            f'?client_id={kc["client_id"]}'
            f'&response_type=code'
            f'&scope=openid+profile+email'
            f'&redirect_uri={kc["app_url"]}/api/v1/auth/callback'
            f'&state={state}'
            f'&code_challenge={code_challenge}'
            f'&code_challenge_method=S256'
            f'&prompt=login'
        )

        logger.debug('Generated Keycloak authorization URL')
        return jsonify({'login_url': auth_url})

    @app.route('/api/v1/auth/callback')
    def auth_callback():
        """
        Handle Keycloak OAuth2 callback.

        Exchanges the authorization code for tokens using the stored
        PKCE code verifier, creates a session in Redis, sets an HTTPOnly
        cookie, and redirects to the app homepage.

        @returns {Redirect} Redirect to app homepage on success
        @throws {400} When state is invalid or code exchange fails
        """
        if Config.SINGLE_USER_MODE:
            return redirect('/')

        code = request.args.get('code')
        state = request.args.get('state')

        if not code or not state:
            logger.error('Missing code or state in callback')
            return jsonify({'error': 'Missing code or state'}), 400

        # Retrieve stored state
        state_data = redis_client.get(f'auth_state:{state}')
        if not state_data:
            logger.error('Invalid or expired state parameter')
            return jsonify({'error': 'Invalid state'}), 400

        state_info = json.loads(state_data)
        redis_client.delete(f'auth_state:{state}')

        # Exchange code for tokens
        logger.debug('Exchanging authorization code for tokens')
        token_url = f'{kc["server_url"]}/realms/{kc["realm"]}/protocol/openid-connect/token'

        try:
            token_response = requests.post(token_url, data={
                'grant_type': 'authorization_code',
                'client_id': kc['client_id'],
                'client_secret': kc['client_secret'],
                'code': code,
                'redirect_uri': f'{kc["app_url"]}/api/v1/auth/callback',
                'code_verifier': state_info['code_verifier'],
            }, timeout=10)

            if token_response.status_code != 200:
                logger.error(f'Token exchange failed: {token_response.status_code}')
                return jsonify({'error': 'Token exchange failed'}), 400

            tokens = token_response.json()
        except requests.RequestException as e:
            logger.error(f'Token exchange request failed: {str(e)}')
            return jsonify({'error': 'Authentication service unavailable'}), 503

        # Get user info from Keycloak
        logger.debug('Fetching user info from Keycloak')
        userinfo_url = f'{kc["server_url"]}/realms/{kc["realm"]}/protocol/openid-connect/userinfo'

        try:
            userinfo_response = requests.get(
                userinfo_url,
                headers={'Authorization': f'Bearer {tokens["access_token"]}'},
                timeout=10
            )
            userinfo = userinfo_response.json()
        except requests.RequestException as e:
            logger.error(f'User info request failed: {str(e)}')
            return jsonify({'error': 'Failed to fetch user info'}), 503

        # Extract roles from access token (realm roles)
        roles = []
        try:
            # Decode JWT payload (no verification needed, already validated by Keycloak)
            payload = tokens['access_token'].split('.')[1]
            # Add padding
            payload += '=' * (4 - len(payload) % 4)
            decoded = json.loads(base64.b64decode(payload))
            roles = decoded.get('realm_access', {}).get('roles', [])
        except (IndexError, json.JSONDecodeError, Exception) as e:
            logger.warn(f'Failed to extract roles from token: {str(e)}')

        # Build user info
        user_info = {
            'username': userinfo.get('preferred_username', ''),
            'email': userinfo.get('email', ''),
            'firstName': userinfo.get('given_name', ''),
            'lastName': userinfo.get('family_name', ''),
            'roles': roles
        }

        # Create session in Redis
        session_id = str(uuid.uuid4())
        session_data = {
            'access_token': tokens['access_token'],
            'refresh_token': tokens.get('refresh_token', ''),
            'id_token': tokens.get('id_token', ''),
            'user_info': user_info,
            'created_at': datetime.now(timezone.utc).isoformat()
        }

        # Session TTL: 8 hours
        redis_client.setex(
            f'session:{session_id}',
            28800,
            json.dumps(session_data)
        )

        logger.info(f'User authenticated: {user_info["username"]}')

        # Set cookie and redirect
        response = make_response(redirect('/'))
        response.set_cookie(
            'auth_token',
            session_id,
            httponly=True,
            secure=True,
            samesite='None',
            path='/'
        )

        return response

    @app.route('/api/v1/auth/refresh', methods=['POST'])
    def auth_refresh():
        """
        Exchange the stored refresh token for a new access token.

        Reads the current session from Redis via the auth_token cookie,
        calls Keycloak's token endpoint with grant_type=refresh_token,
        updates the session, and extends its TTL. Idempotent — safe to call
        repeatedly.

        @returns {JSON} { ok: true } on success
        @throws {401} When no session exists
        @throws {503} When Keycloak is unreachable
        """
        if Config.SINGLE_USER_MODE:
            return jsonify({'ok': True})

        token = request.cookies.get('auth_token')
        if not token:
            return jsonify({'error': 'Not authenticated'}), 401

        raw = redis_client.get(f'session:{token}')
        if not raw:
            return jsonify({'error': 'Session expired'}), 401

        session = json.loads(raw)
        refresh_token = session.get('refresh_token')
        if not refresh_token:
            logger.warn('No refresh token in session; cannot refresh')
            return jsonify({'error': 'No refresh token'}), 401

        token_url = f'{kc["server_url"]}/realms/{kc["realm"]}/protocol/openid-connect/token'
        try:
            resp = requests.post(token_url, data={
                'grant_type': 'refresh_token',
                'client_id': kc['client_id'],
                'client_secret': kc['client_secret'],
                'refresh_token': refresh_token,
            }, timeout=10)
        except requests.RequestException as e:
            logger.error(f'Refresh request failed: {str(e)}')
            return jsonify({'error': 'Authentication service unavailable'}), 503

        if resp.status_code != 200:
            logger.warn(f'Token refresh rejected: {resp.status_code}')
            redis_client.delete(f'session:{token}')
            return jsonify({'error': 'Refresh failed'}), 401

        tokens = resp.json()
        session['access_token'] = tokens['access_token']
        if tokens.get('refresh_token'):
            session['refresh_token'] = tokens['refresh_token']
        if tokens.get('id_token'):
            session['id_token'] = tokens['id_token']

        redis_client.setex(f'session:{token}', 28800, json.dumps(session))
        logger.debug(f'Refreshed session for {session["user_info"].get("username")}')
        return jsonify({'ok': True})

    # ------------------------------------------------------------------ #
    # User Preferences
    # ------------------------------------------------------------------ #

    @app.route('/api/v1/user/preferences', methods=['GET'])
    @require_auth
    def get_preferences():
        """
        Return the current user's persisted preferences (theme, accent, etc.).

        @returns {JSON} Preferences object (empty {} when none saved yet)
        """
        username = g.user.get('username', 'unknown')
        raw = redis_client.get(f'prefs:{username}')
        prefs = json.loads(raw) if raw else {}
        return jsonify(prefs)

    @app.route('/api/v1/user/preferences', methods=['PUT'])
    @require_auth
    def put_preferences():
        """
        Merge the request body into the user's stored preferences. Missing
        keys are left untouched, so clients can PUT a partial object.

        @returns {JSON} The full merged preferences object
        """
        username = g.user.get('username', 'unknown')
        body = request.get_json(silent=True) or {}
        if not isinstance(body, dict):
            return jsonify({'error': 'Body must be a JSON object'}), 400

        raw = redis_client.get(f'prefs:{username}')
        existing = json.loads(raw) if raw else {}
        existing.update(body)
        redis_client.set(f'prefs:{username}', json.dumps(existing))
        logger.debug(f'Saved preferences for {username}: {list(body.keys())}')
        return jsonify(existing)

    @app.route('/api/v1/auth/logout', methods=['POST'])
    def auth_logout():
        """
        Log out the current user.

        Invalidates the Redis session and returns the Keycloak logout URL
        for the frontend to redirect the browser.

        @returns {JSON} Object with logout_url for browser redirect
        """
        if Config.SINGLE_USER_MODE:
            return jsonify({'logout_url': '/'})

        id_token = ''
        token = request.cookies.get('auth_token')
        if token:
            raw = redis_client.get(f'session:{token}')
            if raw:
                try:
                    id_token = json.loads(raw).get('id_token', '') or ''
                except (json.JSONDecodeError, TypeError):
                    id_token = ''
            redis_client.delete(f'session:{token}')
            logger.info('Session invalidated')

        # Keycloak 18+ requires id_token_hint for silent RP-initiated logout;
        # without it the post_logout_redirect_uri is ignored and the user sees
        # a confirmation page (or the redirect fails).
        logout_url = (
            f'{kc["public_url"]}/realms/{kc["realm"]}/protocol/openid-connect/logout'
            f'?post_logout_redirect_uri={kc["app_url"]}'
        )
        if id_token:
            logout_url += f'&id_token_hint={id_token}'
        else:
            logout_url += f'&client_id={kc["client_id"]}'

        response = make_response(jsonify({'logout_url': logout_url}))
        response.delete_cookie('auth_token', path='/')

        return response

    return app


app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
