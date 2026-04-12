"""
Configuration Manager for Base App Backend

@fileoverview Loads application configuration from environment variables
and the keycloak.json file. Provides a centralized Config object used
by all backend modules.

@author David Seguin
@version 1.0.0
@since 2026
@license Professional - All Rights Reserved

Key Features:
- Environment-based configuration (12-factor app)
- Keycloak config loaded from keycloak.json
- SINGLE_USER_MODE toggle for development without Keycloak

Dependencies:
- python-dotenv for .env file loading
- json for keycloak.json parsing

Security Considerations:
- Secret key must be changed in production
- Keycloak client secret should be rotated regularly

Performance Notes:
- Configuration loaded once at startup
"""

import json
import os

from dotenv import load_dotenv

load_dotenv()


def _load_keycloak_config():
    """
    Load Keycloak configuration from keycloak.json.

    @returns {dict} Keycloak configuration dictionary
    @throws {FileNotFoundError} When keycloak.json is missing
    """
    config_path = os.path.join(os.path.dirname(__file__), 'keycloak.json')
    with open(config_path, 'r') as f:
        return json.load(f)


class Config:
    """Application configuration loaded from environment and config files."""

    APP_NAME = os.environ.get('APP_NAME', 'Base App')
    SECRET_KEY = os.environ.get('FLASK_SECRET_KEY', 'dev-secret-key-change-in-production')
    REDIS_URL = os.environ.get('REDIS_URL', 'redis://redis:6379/0')
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'DEBUG').upper()
    KEYCLOAK = _load_keycloak_config()
    SINGLE_USER_MODE = KEYCLOAK.get('single_user_mode', False)
