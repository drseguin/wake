"""
Crew + membership + invitations + messages.

@fileoverview A Crew is a small group of boaters who opt to share location
and waypoints with each other and chat. Membership is mediated by
invitations (no auto-add). The owner can remove members; any member can
leave themselves.

@author David Seguin
@version 1.0.0
@since 2026
@license Professional - All Rights Reserved
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from . import Base


CREW_ROLES = ('owner', 'member')

INVITATION_STATUSES = ('pending', 'accepted', 'declined')


class Crew(Base):
    __tablename__ = 'crews'

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str] = mapped_column(
        ForeignKey('profiles.username', ondelete='RESTRICT'),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    members: Mapped[list['CrewMember']] = relationship(
        back_populates='crew', cascade='all, delete-orphan'
    )


class CrewMember(Base):
    __tablename__ = 'crew_members'

    crew_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey('crews.id', ondelete='CASCADE'), primary_key=True
    )
    username: Mapped[str] = mapped_column(
        ForeignKey('profiles.username', ondelete='CASCADE'), primary_key=True
    )
    role: Mapped[str] = mapped_column(String(16), default='member', nullable=False)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    crew: Mapped[Crew] = relationship(back_populates='members')


class CrewInvitation(Base):
    __tablename__ = 'crew_invitations'

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    crew_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey('crews.id', ondelete='CASCADE'), nullable=False
    )
    invited_username: Mapped[str] = mapped_column(
        ForeignKey('profiles.username', ondelete='CASCADE'), nullable=False
    )
    invited_by: Mapped[str] = mapped_column(
        ForeignKey('profiles.username', ondelete='CASCADE'), nullable=False
    )
    status: Mapped[str] = mapped_column(String(16), default='pending', nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    responded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    __table_args__ = (
        Index('ix_invitations_recipient_pending', 'invited_username', 'status'),
        Index('ix_invitations_crew', 'crew_id'),
    )


class CrewMessage(Base):
    __tablename__ = 'crew_messages'

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    crew_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey('crews.id', ondelete='CASCADE'), nullable=False
    )
    username: Mapped[str] = mapped_column(
        ForeignKey('profiles.username', ondelete='CASCADE'), nullable=False
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        Index('ix_messages_crew_created', 'crew_id', 'created_at'),
    )
