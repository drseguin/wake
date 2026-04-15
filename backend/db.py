"""
Database engine + session for WAKE App backend.

@fileoverview SQLAlchemy 2.x engine, scoped session factory, and a Flask
teardown hook that closes the session at the end of every request. The
DATABASE_URL is supplied by docker-compose and points at the PostGIS-enabled
`wake-db` service.

@author David Seguin
@version 1.0.0
@since 2026
@license Professional - All Rights Reserved
"""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker

from utils.logger import logger


DATABASE_URL = os.environ.get(
    'DATABASE_URL',
    'postgresql+psycopg://wake:wake@wake-db:5432/wake'
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=10,
    future=True,
)

SessionLocal = scoped_session(
    sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
)


def init_app(app):
    """Register the per-request session teardown on a Flask app."""
    @app.teardown_appcontext
    def _remove_session(exc=None):
        SessionLocal.remove()

    logger.info(f'Database initialised: {_safe_url()}')


def _safe_url():
    """Return DATABASE_URL with the password redacted for logging."""
    try:
        from sqlalchemy.engine.url import make_url
        url = make_url(DATABASE_URL)
        if url.password:
            url = url.set(password='***')
        return str(url)
    except Exception:
        return '<database_url>'
