"""
Profile model — one row per Keycloak user.

@fileoverview A profile is created lazily on first call to GET /profile.
Identifies the user by Keycloak `preferred_username` (the same identifier
used elsewhere in the app for ownership). Stores the boater's display
preferences (use real name vs boat name), boat info, and home marina.

@author David Seguin
@version 1.0.0
@since 2026
@license Professional - All Rights Reserved
"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from . import Base


# Boat type vocabulary kept as plain strings (no enum) so admins can
# adjust by editing this list + frontend dropdown without a migration.
BOAT_TYPES = ('power', 'sail', 'pontoon', 'paddle', 'seadoo', 'other')

HANDLE_TYPES = ('name', 'boat')


class Profile(Base):
    __tablename__ = 'profiles'

    username: Mapped[str] = mapped_column(String(120), primary_key=True)
    display_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    handle_type: Mapped[str] = mapped_column(String(16), default='name', nullable=False)
    boat_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    boat_type: Mapped[str | None] = mapped_column(String(16), nullable=True)
    home_marina_id: Mapped[int | None] = mapped_column(
        ForeignKey('marinas.id', ondelete='SET NULL'),
        nullable=True,
    )
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

    def effective_handle(self) -> str:
        """Return the label this user wants other boaters to see."""
        if self.handle_type == 'boat' and self.boat_name:
            return self.boat_name
        return self.display_name or self.username
