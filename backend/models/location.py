"""
LocationShare + audience — who sees a broadcasting user's position.

@fileoverview One LocationShare row per user holds the latest fix plus
an `audience_mode` that decides who can see it:

  - 'all'    → every crewmate in every crew I belong to
  - 'crews'  → only members of the crews listed in LocationShareCrew
  - 'marina' → only users whose Profile.home_marina_id matches mine

PUT /location/me upserts this row; GET /location/crews filters visible
broadcasters per the rules above.

@author David Seguin
@version 2.0.0
@since 2026
@license Professional - All Rights Reserved
"""

import uuid
from datetime import datetime, timezone

from geoalchemy2 import Geography
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from . import Base


AUDIENCE_MODES = ('all', 'crews', 'marina')

# Duration semantics:
#   'indefinite' → expires_at IS NULL, no anchor
#   'hours'      → expires_at = now + N hours, no anchor
#   'until_move' → no expires_at, anchor_location captured at enable time;
#                  server auto-disables when the user drifts beyond
#                  UNTIL_MOVE_THRESHOLD_M.
DURATION_MODES = ('indefinite', 'hours', 'until_move')
UNTIL_MOVE_THRESHOLD_M = 250.0


class LocationShare(Base):
    __tablename__ = 'location_shares'

    username: Mapped[str] = mapped_column(
        ForeignKey('profiles.username', ondelete='CASCADE'),
        primary_key=True,
    )
    enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    audience_mode: Mapped[str] = mapped_column(
        String(16), default='all', nullable=False
    )
    last_location = mapped_column(
        Geography(geometry_type='POINT', srid=4326), nullable=True
    )
    # Point captured at share-enable time when duration='until_move'.
    # NULL in every other case. Used to detect drift.
    anchor_location = mapped_column(
        Geography(geometry_type='POINT', srid=4326), nullable=True
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    heading_deg: Mapped[float | None] = mapped_column(Float, nullable=True)
    speed_kts: Mapped[float | None] = mapped_column(Float, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class LocationShareCrew(Base):
    """Selected-crew audience rows. Present only when audience_mode='crews'."""

    __tablename__ = 'location_share_crews'

    username: Mapped[str] = mapped_column(
        ForeignKey('location_shares.username', ondelete='CASCADE'),
        primary_key=True,
    )
    crew_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('crews.id', ondelete='CASCADE'),
        primary_key=True,
    )
