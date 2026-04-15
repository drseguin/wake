"""
SQLAlchemy declarative base + model imports for WAKE App.

@fileoverview Declares the shared `Base` and re-exports every model so that
`Base.metadata` knows about all tables (required for Alembic autogenerate
and metadata.create_all).

@author David Seguin
@version 1.0.0
@since 2026
@license Professional - All Rights Reserved
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Shared declarative base for all WAKE app models."""
    pass


from .marina import Marina  # noqa: E402,F401
from .profile import Profile  # noqa: E402,F401
from .crew import Crew, CrewMember, CrewInvitation, CrewMessage  # noqa: E402,F401
from .waypoint import Waypoint, WaypointShare  # noqa: E402,F401
from .location import (  # noqa: E402,F401
    AUDIENCE_MODES,
    DURATION_MODES,
    UNTIL_MOVE_THRESHOLD_M,
    LocationShare,
    LocationShareCrew,
)
