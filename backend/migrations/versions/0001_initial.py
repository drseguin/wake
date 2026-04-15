"""initial schema (profiles, marinas, crews, waypoints, location_shares)

Revision ID: 0001
Revises:
Create Date: 2026-04-15

"""
import geoalchemy2
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


# Initial marinas seeded for the 1000 Islands area. Coordinates are
# approximate — admins can fine-tune via the Marinas admin page.
SEED_MARINAS = [
    ('Pecks Marina',                'POINT(-75.864 44.453)'),
    ('Ivy Lea Marina',              'POINT(-75.999 44.358)'),
    ('The Landing',                 'POINT(-76.166 44.328)'),
    ('Gananoque Municipal Marina',  'POINT(-76.164 44.330)'),
]


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS postgis')

    op.create_table(
        'marinas',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('name', sa.String(length=120), nullable=False, unique=True),
        sa.Column(
            'location',
            geoalchemy2.types.Geography(geometry_type='POINT', srid=4326),
            nullable=False,
        ),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('CURRENT_TIMESTAMP')),
    )

    op.create_table(
        'profiles',
        sa.Column('username', sa.String(length=120), primary_key=True),
        sa.Column('display_name', sa.String(length=120), nullable=True),
        sa.Column('handle_type', sa.String(length=16), nullable=False,
                  server_default='name'),
        sa.Column('boat_name', sa.String(length=120), nullable=True),
        sa.Column('boat_type', sa.String(length=16), nullable=True),
        sa.Column('home_marina_id', sa.Integer(),
                  sa.ForeignKey('marinas.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('CURRENT_TIMESTAMP')),
    )

    op.create_table(
        'crews',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(length=80), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_by', sa.String(length=120),
                  sa.ForeignKey('profiles.username', ondelete='RESTRICT'),
                  nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('CURRENT_TIMESTAMP')),
    )

    op.create_table(
        'crew_members',
        sa.Column('crew_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('crews.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('username', sa.String(length=120),
                  sa.ForeignKey('profiles.username', ondelete='CASCADE'),
                  primary_key=True),
        sa.Column('role', sa.String(length=16), nullable=False, server_default='member'),
        sa.Column('joined_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('CURRENT_TIMESTAMP')),
    )

    op.create_table(
        'crew_invitations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('crew_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('crews.id', ondelete='CASCADE'), nullable=False),
        sa.Column('invited_username', sa.String(length=120),
                  sa.ForeignKey('profiles.username', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('invited_by', sa.String(length=120),
                  sa.ForeignKey('profiles.username', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('responded_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_invitations_recipient_pending', 'crew_invitations',
                    ['invited_username', 'status'])
    op.create_index('ix_invitations_crew', 'crew_invitations', ['crew_id'])

    op.create_table(
        'crew_messages',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('crew_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('crews.id', ondelete='CASCADE'), nullable=False),
        sa.Column('username', sa.String(length=120),
                  sa.ForeignKey('profiles.username', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_messages_crew_created', 'crew_messages',
                    ['crew_id', 'created_at'])

    op.create_table(
        'waypoints',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('owner_username', sa.String(length=120),
                  sa.ForeignKey('profiles.username', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column(
            'location',
            geoalchemy2.types.Geography(geometry_type='POINT', srid=4326),
            nullable=False,
        ),
        sa.Column('icon', sa.String(length=16), nullable=False, server_default='other'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_waypoints_owner', 'waypoints', ['owner_username'])

    op.create_table(
        'waypoint_shares',
        sa.Column('waypoint_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('waypoints.id', ondelete='CASCADE'),
                  primary_key=True),
        sa.Column('crew_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('crews.id', ondelete='CASCADE'),
                  primary_key=True),
    )

    op.create_table(
        'location_shares',
        sa.Column('username', sa.String(length=120),
                  sa.ForeignKey('profiles.username', ondelete='CASCADE'),
                  primary_key=True),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            'last_location',
            geoalchemy2.types.Geography(geometry_type='POINT', srid=4326),
            nullable=True,
        ),
        sa.Column('heading_deg', sa.Float(), nullable=True),
        sa.Column('speed_kts', sa.Float(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('CURRENT_TIMESTAMP')),
    )

    # Seed default marinas (approximate coordinates — admin can refine).
    for name, point_wkt in SEED_MARINAS:
        op.execute(sa.text(
            "INSERT INTO marinas (name, location) "
            "VALUES (:name, ST_GeogFromText(:wkt))"
        ).bindparams(name=name, wkt=f'SRID=4326;{point_wkt}'))


def downgrade() -> None:
    op.drop_table('location_shares')
    op.drop_table('waypoint_shares')
    op.drop_index('ix_waypoints_owner', table_name='waypoints')
    op.drop_table('waypoints')
    op.drop_index('ix_messages_crew_created', table_name='crew_messages')
    op.drop_table('crew_messages')
    op.drop_index('ix_invitations_crew', table_name='crew_invitations')
    op.drop_index('ix_invitations_recipient_pending', table_name='crew_invitations')
    op.drop_table('crew_invitations')
    op.drop_table('crew_members')
    op.drop_table('crews')
    op.drop_table('profiles')
    op.drop_table('marinas')
