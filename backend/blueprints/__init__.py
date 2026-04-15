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


def register_blueprints(app):
    app.register_blueprint(profile_bp)
    app.register_blueprint(marinas_bp)
