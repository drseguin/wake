"""
Base App Backend - Flask Application

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
from flask import Flask, jsonify, request, redirect, make_response
from flask_cors import CORS

from config import Config
from utils.logger import logger


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

    logger.info('Starting Base App backend')
    logger.info(f'SINGLE_USER_MODE: {Config.SINGLE_USER_MODE}')

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
        return jsonify({
            'single_user_mode': Config.SINGLE_USER_MODE
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
            return jsonify({
                'username': 'admin',
                'email': 'admin@localhost',
                'firstName': 'Local',
                'lastName': 'Admin',
                'roles': ['base-app-user', 'base-app-admin']
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

        token = request.cookies.get('auth_token')
        if token:
            redis_client.delete(f'session:{token}')
            logger.info('Session invalidated')

        logout_url = (
            f'{kc["public_url"]}/realms/{kc["realm"]}/protocol/openid-connect/logout'
            f'?post_logout_redirect_uri={kc["app_url"]}'
            f'&client_id={kc["client_id"]}'
        )

        response = make_response(jsonify({'logout_url': logout_url}))
        response.delete_cookie('auth_token', path='/')

        return response

    return app


app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
