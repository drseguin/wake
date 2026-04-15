"""location sharing audience + duration

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-15

"""
import geoalchemy2
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'location_shares',
        sa.Column(
            'audience_mode',
            sa.String(length=16),
            nullable=False,
            server_default='all',
        ),
    )
    # Drop the server_default now that existing rows are backfilled — model
    # carries the application-level default going forward.
    op.alter_column('location_shares', 'audience_mode', server_default=None)

    op.add_column(
        'location_shares',
        sa.Column(
            'anchor_location',
            geoalchemy2.types.Geography(geometry_type='POINT', srid=4326),
            nullable=True,
        ),
    )
    op.add_column(
        'location_shares',
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        'location_share_crews',
        sa.Column(
            'username',
            sa.String(length=120),
            sa.ForeignKey('location_shares.username', ondelete='CASCADE'),
            primary_key=True,
        ),
        sa.Column(
            'crew_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('crews.id', ondelete='CASCADE'),
            primary_key=True,
        ),
    )


def downgrade() -> None:
    op.drop_table('location_share_crews')
    op.drop_column('location_shares', 'expires_at')
    op.drop_column('location_shares', 'anchor_location')
    op.drop_column('location_shares', 'audience_mode')
