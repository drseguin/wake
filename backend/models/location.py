"""
LocationShare model — current broadcast position per user.

@fileoverview One row per user. `enabled=True` means the user is
broadcasting their position to all crews they belong to. The row is
upserted by PUT /location/me; recipients query GET /location/crews to
see crewmates' last known position.

@author David Seguin
@version 1.0.0
@since 2026
@license Professional - All Rights Reserved
"""

from datetime import datetime, timezone

from geoalchemy2 import Geography
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from . import Base


class LocationShare(Base):
    __tablename__ = 'location_shares'

    username: Mapped[str] = mapped_column(
        ForeignKey('profiles.username', ondelete='CASCADE'),
        primary_key=True,
    )
    enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_location = mapped_column(
        Geography(geometry_type='POINT', srid=4326), nullable=True
    )
    heading_deg: Mapped[float | None] = mapped_column(Float, nullable=True)
    speed_kts: Mapped[float | None] = mapped_column(Float, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
