"""
Marina model.

@fileoverview A marina record represents a known boat-launch / docking
location. Marinas are admin-managed and shown in profile dropdowns and on
the map. Coordinates are stored as a PostGIS Geography(POINT, 4326).

@author David Seguin
@version 1.0.0
@since 2026
@license Professional - All Rights Reserved
"""

from datetime import datetime, timezone

from geoalchemy2 import Geography
from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from . import Base


class Marina(Base):
    __tablename__ = 'marinas'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)
    location = mapped_column(Geography(geometry_type='POINT', srid=4326), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
