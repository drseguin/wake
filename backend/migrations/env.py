"""
Alembic environment for WAKE App.

@fileoverview Sets up Alembic to use the same DATABASE_URL the Flask app
sees and to autogenerate against the models in `backend/models`.

@author David Seguin
@version 1.0.0
@since 2026
@license Professional - All Rights Reserved
"""

import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# Make `backend/` importable when alembic is run from inside it.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import Base  # noqa: E402

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

database_url = os.environ.get('DATABASE_URL')
if database_url:
    config.set_main_option('sqlalchemy.url', database_url)

target_metadata = Base.metadata


def _include_object(obj, name, type_, reflected, compare_to):
    """Skip PostGIS internal tables/views from autogenerate."""
    if type_ == 'table' and name in {'spatial_ref_sys'}:
        return False
    return True


def run_migrations_offline() -> None:
    context.configure(
        url=config.get_main_option('sqlalchemy.url'),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={'paramstyle': 'named'},
        include_object=_include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix='sqlalchemy.',
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=_include_object,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
