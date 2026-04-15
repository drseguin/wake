"""
Crews + invitations + members + messages.

@fileoverview A user can be in many crews. Crews are created by an "owner"
who can invite (or remove) members and delete the crew. Any member can
leave themselves and post messages. Invitations are pending until the
recipient accepts or declines.

@author David Seguin
@version 1.0.0
@since 2026
@license Professional - All Rights Reserved
"""

from datetime import datetime, timezone

from flask import Blueprint, g, jsonify, request
from sqlalchemy import and_, delete, func, or_, select

from db import SessionLocal
from models import Crew, CrewInvitation, CrewMember, CrewMessage, Profile
from utils.auth import require_auth
from utils.logger import logger


bp = Blueprint('crews', __name__, url_prefix='/api/v1')


# ---------------------------------------------------------------- helpers --

def _is_member(db, crew_id, username) -> bool:
    return db.execute(
        select(CrewMember).where(
            and_(CrewMember.crew_id == crew_id, CrewMember.username == username)
        )
    ).scalar_one_or_none() is not None


def _is_owner(db, crew_id, username) -> bool:
    row = db.execute(
        select(CrewMember).where(
            and_(CrewMember.crew_id == crew_id, CrewMember.username == username)
        )
    ).scalar_one_or_none()
    return row is not None and row.role == 'owner'


def _serialize_crew(db, crew: Crew, with_members: bool = False) -> dict:
    member_count = db.execute(
        select(func.count(CrewMember.username)).where(CrewMember.crew_id == crew.id)
    ).scalar() or 0

    out = {
        'id': str(crew.id),
        'name': crew.name,
        'description': crew.description,
        'created_by': crew.created_by,
        'created_at': crew.created_at.isoformat() if crew.created_at else None,
        'member_count': member_count,
    }
    if with_members:
        rows = db.execute(
            select(CrewMember, Profile)
            .join(Profile, Profile.username == CrewMember.username)
            .where(CrewMember.crew_id == crew.id)
            .order_by(CrewMember.joined_at)
        ).all()
        out['members'] = [
            {
                'username': cm.username,
                'role': cm.role,
                'joined_at': cm.joined_at.isoformat() if cm.joined_at else None,
                'display': prof.effective_handle(),
                'boat_name': prof.boat_name,
            }
            for cm, prof in rows
        ]
    return out


def _serialize_invitation(db, inv: CrewInvitation) -> dict:
    crew = db.get(Crew, inv.crew_id)
    inviter = db.get(Profile, inv.invited_by)
    return {
        'id': str(inv.id),
        'crew_id': str(inv.crew_id),
        'crew_name': crew.name if crew else '',
        'invited_username': inv.invited_username,
        'invited_by': inv.invited_by,
        'invited_by_display': inviter.effective_handle() if inviter else inv.invited_by,
        'status': inv.status,
        'created_at': inv.created_at.isoformat() if inv.created_at else None,
    }


def _serialize_message(db, msg: CrewMessage, profile_cache: dict | None = None) -> dict:
    profile_cache = profile_cache or {}
    if msg.username not in profile_cache:
        profile_cache[msg.username] = db.get(Profile, msg.username)
    prof = profile_cache[msg.username]
    return {
        'id': msg.id,
        'crew_id': str(msg.crew_id),
        'username': msg.username,
        'display': prof.effective_handle() if prof else msg.username,
        'body': msg.body,
        'created_at': msg.created_at.isoformat() if msg.created_at else None,
    }


# ------------------------------------------------------------------ crews --

@bp.route('/crews', methods=['GET'])
@require_auth
def list_my_crews():
    db = SessionLocal()
    username = g.user.get('username')
    rows = db.execute(
        select(Crew)
        .join(CrewMember, CrewMember.crew_id == Crew.id)
        .where(CrewMember.username == username)
        .order_by(Crew.name)
    ).scalars().all()
    return jsonify([_serialize_crew(db, c) for c in rows])


@bp.route('/crews', methods=['POST'])
@require_auth
def create_crew():
    body = request.get_json(silent=True) or {}
    name = (body.get('name') or '').strip()
    description = (body.get('description') or '').strip() or None
    if not name:
        return jsonify({'error': 'name is required'}), 400

    db = SessionLocal()
    username = g.user.get('username')

    # Caller must already have a profile (auto-created on first GET /profile).
    if db.get(Profile, username) is None:
        db.add(Profile(username=username, display_name=username))
        db.flush()

    crew = Crew(name=name[:80], description=description, created_by=username)
    db.add(crew)
    db.flush()
    db.add(CrewMember(crew_id=crew.id, username=username, role='owner'))
    db.commit()
    db.refresh(crew)
    logger.info(f'Crew created: {crew.name} by {username}')
    return jsonify(_serialize_crew(db, crew, with_members=True)), 201


@bp.route('/crews/<uuid:crew_id>', methods=['GET'])
@require_auth
def get_crew(crew_id):
    db = SessionLocal()
    username = g.user.get('username')
    crew = db.get(Crew, crew_id)
    if crew is None:
        return jsonify({'error': 'crew not found'}), 404
    if not _is_member(db, crew_id, username):
        return jsonify({'error': 'forbidden'}), 403
    return jsonify(_serialize_crew(db, crew, with_members=True))


@bp.route('/crews/<uuid:crew_id>', methods=['DELETE'])
@require_auth
def delete_crew(crew_id):
    db = SessionLocal()
    username = g.user.get('username')
    crew = db.get(Crew, crew_id)
    if crew is None:
        return jsonify({'error': 'crew not found'}), 404
    if not _is_owner(db, crew_id, username):
        return jsonify({'error': 'only the owner can delete this crew'}), 403
    db.delete(crew)
    db.commit()
    logger.info(f'Crew deleted: id={crew_id}')
    return jsonify({'ok': True})


# ---------------------------------------------------------- invitations --

@bp.route('/crews/<uuid:crew_id>/invitations', methods=['POST'])
@require_auth
def create_invitation(crew_id):
    body = request.get_json(silent=True) or {}
    invitee = (body.get('username') or '').strip()
    if not invitee:
        return jsonify({'error': 'username is required'}), 400

    db = SessionLocal()
    me = g.user.get('username')
    if not _is_member(db, crew_id, me):
        return jsonify({'error': 'forbidden'}), 403
    if invitee == me:
        return jsonify({'error': 'you are already in this crew'}), 400
    if db.get(Profile, invitee) is None:
        return jsonify({'error': 'unknown user'}), 404
    if _is_member(db, crew_id, invitee):
        return jsonify({'error': 'user is already a member'}), 409

    # No duplicate pending invitations.
    existing = db.execute(
        select(CrewInvitation).where(
            and_(
                CrewInvitation.crew_id == crew_id,
                CrewInvitation.invited_username == invitee,
                CrewInvitation.status == 'pending',
            )
        )
    ).scalar_one_or_none()
    if existing:
        return jsonify({'error': 'invitation already pending'}), 409

    inv = CrewInvitation(
        crew_id=crew_id,
        invited_username=invitee,
        invited_by=me,
        status='pending',
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    logger.info(f'Invitation sent to {invitee} for crew {crew_id} by {me}')
    return jsonify(_serialize_invitation(db, inv)), 201


@bp.route('/invitations', methods=['GET'])
@require_auth
def list_my_invitations():
    db = SessionLocal()
    me = g.user.get('username')
    rows = db.execute(
        select(CrewInvitation).where(
            and_(
                CrewInvitation.invited_username == me,
                CrewInvitation.status == 'pending',
            )
        ).order_by(CrewInvitation.created_at.desc())
    ).scalars().all()
    return jsonify([_serialize_invitation(db, inv) for inv in rows])


@bp.route('/invitations/<uuid:inv_id>/accept', methods=['POST'])
@require_auth
def accept_invitation(inv_id):
    db = SessionLocal()
    me = g.user.get('username')
    inv = db.get(CrewInvitation, inv_id)
    if inv is None or inv.invited_username != me:
        return jsonify({'error': 'invitation not found'}), 404
    if inv.status != 'pending':
        return jsonify({'error': 'invitation no longer pending'}), 409

    inv.status = 'accepted'
    inv.responded_at = datetime.now(timezone.utc)
    if not _is_member(db, inv.crew_id, me):
        db.add(CrewMember(crew_id=inv.crew_id, username=me, role='member'))
    db.commit()
    logger.info(f'{me} accepted invitation {inv_id}')
    return jsonify(_serialize_invitation(db, inv))


@bp.route('/invitations/<uuid:inv_id>/decline', methods=['POST'])
@require_auth
def decline_invitation(inv_id):
    db = SessionLocal()
    me = g.user.get('username')
    inv = db.get(CrewInvitation, inv_id)
    if inv is None or inv.invited_username != me:
        return jsonify({'error': 'invitation not found'}), 404
    if inv.status != 'pending':
        return jsonify({'error': 'invitation no longer pending'}), 409

    inv.status = 'declined'
    inv.responded_at = datetime.now(timezone.utc)
    db.commit()
    logger.info(f'{me} declined invitation {inv_id}')
    return jsonify(_serialize_invitation(db, inv))


# --------------------------------------------------------------- members --

@bp.route('/crews/<uuid:crew_id>/members/<string:username>', methods=['DELETE'])
@require_auth
def remove_member(crew_id, username):
    db = SessionLocal()
    me = g.user.get('username')
    if not _is_member(db, crew_id, me):
        return jsonify({'error': 'forbidden'}), 403
    if username != me and not _is_owner(db, crew_id, me):
        return jsonify({'error': 'only the owner can remove other members'}), 403

    # The owner can't kick themselves while still owner — they should delete the crew.
    if username == me and _is_owner(db, crew_id, me):
        return jsonify({'error': 'owner must delete the crew instead of leaving'}), 400

    db.execute(delete(CrewMember).where(
        and_(CrewMember.crew_id == crew_id, CrewMember.username == username)
    ))
    db.commit()
    logger.info(f'{username} removed from crew {crew_id} by {me}')
    return jsonify({'ok': True})


# -------------------------------------------------------------- messages --

@bp.route('/crews/<uuid:crew_id>/messages', methods=['GET'])
@require_auth
def list_messages(crew_id):
    db = SessionLocal()
    me = g.user.get('username')
    if not _is_member(db, crew_id, me):
        return jsonify({'error': 'forbidden'}), 403

    before_id = request.args.get('before', type=int)
    limit = min(int(request.args.get('limit', 50)), 200)
    stmt = select(CrewMessage).where(CrewMessage.crew_id == crew_id)
    if before_id:
        stmt = stmt.where(CrewMessage.id < before_id)
    stmt = stmt.order_by(CrewMessage.id.desc()).limit(limit)
    rows = db.execute(stmt).scalars().all()
    cache: dict = {}
    return jsonify([_serialize_message(db, m, cache) for m in rows])


@bp.route('/crews/<uuid:crew_id>/messages', methods=['POST'])
@require_auth
def post_message(crew_id):
    body = request.get_json(silent=True) or {}
    text = (body.get('body') or '').strip()
    if not text:
        return jsonify({'error': 'body cannot be empty'}), 400
    if len(text) > 4000:
        return jsonify({'error': 'body too long (max 4000 chars)'}), 400

    db = SessionLocal()
    me = g.user.get('username')
    if not _is_member(db, crew_id, me):
        return jsonify({'error': 'forbidden'}), 403

    msg = CrewMessage(crew_id=crew_id, username=me, body=text)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return jsonify(_serialize_message(db, msg)), 201
