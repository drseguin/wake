"""
Blueprint registry for WAKE App.

@fileoverview Single entry point that registers every feature blueprint
with the Flask app. Keeps app.py free of repetitive `app.register_blueprint`
boilerplate.

@author David Seguin
@version 1.0.0
@since 2026
@license Professional - All Rights Reserved
"""

from .profile import bp as profile_bp
from .marinas import bp as marinas_bp
from .users import bp as users_bp
from .crews import bp as crews_bp
from .waypoints import bp as waypoints_bp
from .location import bp as location_bp


def register_blueprints(app):
    app.register_blueprint(profile_bp)
    app.register_blueprint(marinas_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(crews_bp)
    app.register_blueprint(waypoints_bp)
    app.register_blueprint(location_bp)
