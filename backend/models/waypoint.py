"""
Waypoint + waypoint-share models.

@fileoverview A waypoint is a saved point on the map (anchorage, fuel
dock, fishing spot, hazard, marina, …). Waypoints are owned by a single
user and can optionally be shared with one or more crews via the
waypoint_shares join table.

@author David Seguin
@version 1.0.0
@since 2026
@license Professional - All Rights Reserved
"""

import uuid
from datetime import datetime, timezone

from geoalchemy2 import Geography
from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from . import Base


WAYPOINT_ICONS = (
    'anchor',
    'fuel',
    'fishing',
    'hazard',
    'marina',
    'other',
)


class Waypoint(Base):
    __tablename__ = 'waypoints'

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_username: Mapped[str] = mapped_column(
        ForeignKey('profiles.username', ondelete='CASCADE'), nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    location = mapped_column(
        Geography(geometry_type='POINT', srid=4326), nullable=False
    )
    icon: Mapped[str] = mapped_column(String(16), default='other', nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        Index('ix_waypoints_owner', 'owner_username'),
    )


class WaypointShare(Base):
    __tablename__ = 'waypoint_shares'

    waypoint_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey('waypoints.id', ondelete='CASCADE'), primary_key=True
    )
    crew_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey('crews.id', ondelete='CASCADE'), primary_key=True
    )
