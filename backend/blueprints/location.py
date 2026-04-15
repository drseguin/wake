"""
Live location sharing API.

@fileoverview The signed-in user opts in to broadcasting their position
with a chosen audience and duration:

  Audience
    - 'all'    → every crew they belong to
    - 'crews'  → a hand-picked subset of their crews
    - 'marina' → boaters whose home_marina matches theirs

  Duration
    - 'indefinite' → until the user turns it off
    - 'hours'      → auto-off after N hours (expires_at)
    - 'until_move' → auto-off once the user drifts > UNTIL_MOVE_THRESHOLD_M
                      from the point captured when sharing was enabled

PUT /location/me upserts the share row (and audience crews). GET
/location/crews returns the latest position of every broadcaster the
caller is allowed to see, honouring expiry and drift rules on read.
Stale rules (>10 min faded, >1h hidden) stay client-side.

@author David Seguin
@version 2.1.0
@since 2026
@license Professional - All Rights Reserved
"""

from datetime import datetime, timedelta, timezone

from flask import Blueprint, g, jsonify, request
from geoalchemy2.functions import ST_DWithin
from sqlalchemy import and_, delete, or_, select

from db import SessionLocal
from models import (
    AUDIENCE_MODES,
    DURATION_MODES,
    UNTIL_MOVE_THRESHOLD_M,
    CrewMember,
    LocationShare,
    LocationShareCrew,
    Profile,
)
from utils.auth import require_auth
from utils.geo import point_to_latlng, point_wkt, valid_latlng
from utils.logger import logger


bp = Blueprint('location', __name__, url_prefix='/api/v1/location')

MAX_DURATION_HOURS = 24 * 14  # two weeks is already a lot


def _audience_crew_ids(db, username: str) -> list[str]:
    rows = db.execute(
        select(LocationShareCrew.crew_id).where(
            LocationShareCrew.username == username
        )
    ).all()
    return [str(r[0]) for r in rows]


def _duration_state(share: LocationShare) -> dict:
    """Derive the client-facing duration fields from the stored row."""
    if share.expires_at is not None:
        return {
            'duration_mode': 'hours',
            'expires_at': share.expires_at.isoformat(),
        }
    if share.anchor_location is not None:
        anchor = point_to_latlng(share.anchor_location)
        return {
            'duration_mode': 'until_move',
            'anchor_lat': anchor[0] if anchor else None,
            'anchor_lng': anchor[1] if anchor else None,
        }
    return {'duration_mode': 'indefinite'}


def _serialize_self(db, share: LocationShare | None) -> dict:
    if share is None:
        return {
            'enabled': False,
            'audience_mode': 'all',
            'audience_crew_ids': [],
            'duration_mode': 'indefinite',
            'expires_at': None,
            'anchor_lat': None, 'anchor_lng': None,
            'lat': None, 'lng': None,
            'heading_deg': None, 'speed_kts': None,
            'updated_at': None,
        }
    latlng = point_to_latlng(share.last_location)
    out = {
        'enabled': share.enabled,
        'audience_mode': share.audience_mode,
        'audience_crew_ids': _audience_crew_ids(db, share.username),
        'expires_at': None,
        'anchor_lat': None, 'anchor_lng': None,
        'lat': latlng[0] if latlng else None,
        'lng': latlng[1] if latlng else None,
        'heading_deg': share.heading_deg,
        'speed_kts': share.speed_kts,
        'updated_at': share.updated_at.isoformat() if share.updated_at else None,
    }
    out.update(_duration_state(share))
    return out


def _auto_expire(share: LocationShare, new_lat: float | None,
                 new_lng: float | None) -> str | None:
    """
    Apply auto-off rules in place. Returns a reason string if sharing was
    turned off, else None. Mutates the share row but does not commit.
    """
    if not share.enabled:
        return None
    now = datetime.now(timezone.utc)
    if share.expires_at is not None and share.expires_at <= now:
        share.enabled = False
        share.expires_at = None
        return 'timer'
    if share.anchor_location is not None and new_lat is not None and new_lng is not None:
        anchor = point_to_latlng(share.anchor_location)
        if anchor is None:
            return None
        # Cheap haversine — good enough at boat scale (<1km).
        from math import asin, cos, radians, sin, sqrt
        lat1, lng1 = radians(anchor[0]), radians(anchor[1])
        lat2, lng2 = radians(new_lat), radians(new_lng)
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        h = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
        meters = 2 * 6371000 * asin(min(1.0, sqrt(h)))
        if meters > UNTIL_MOVE_THRESHOLD_M:
            share.enabled = False
            share.anchor_location = None
            return 'moved'
    return None


@bp.route('/me', methods=['GET'])
@require_auth
def get_me():
    db = SessionLocal()
    me = g.user.get('username')
    share = db.get(LocationShare, me)
    if share is not None:
        # Clean up an expired timer on read so the client sees a consistent
        # state without needing a push.
        if _auto_expire(share, None, None):
            db.commit()
            db.refresh(share)
    return jsonify(_serialize_self(db, share))


@bp.route('/me', methods=['PUT'])
@require_auth
def put_me():
    body = request.get_json(silent=True) or {}
    enabled = bool(body.get('enabled'))
    lat = body.get('lat')
    lng = body.get('lng')
    heading = body.get('heading_deg')
    speed = body.get('speed_kts')
    audience_mode = body.get('audience_mode')
    crew_ids_raw = body.get('audience_crew_ids') or []
    duration_mode = body.get('duration_mode')
    duration_hours = body.get('duration_hours')

    db = SessionLocal()
    me = g.user.get('username')
    profile = db.get(Profile, me)
    if profile is None:
        profile = Profile(username=me, display_name=me)
        db.add(profile)
        db.flush()

    if enabled and profile.home_marina_id is None:
        return jsonify({
            'error': 'home_marina_required',
            'message': 'Set your home marina in your Profile before sharing location.',
        }), 400

    share = db.get(LocationShare, me)
    is_new_share = share is None
    if is_new_share:
        share = LocationShare(username=me, enabled=enabled)
        db.add(share)

    was_enabled = share.enabled
    share.enabled = enabled

    if audience_mode is not None:
        if audience_mode not in AUDIENCE_MODES:
            return jsonify({'error': f'audience_mode must be one of {AUDIENCE_MODES}'}), 400
        share.audience_mode = audience_mode

    # Validate and update position first so duration 'until_move' can
    # anchor on the freshly posted fix.
    if lat is not None or lng is not None:
        if not valid_latlng(lat, lng):
            return jsonify({'error': 'lat and lng must be valid coordinates'}), 400
        share.last_location = point_wkt(float(lat), float(lng))

    if heading is not None:
        try:
            share.heading_deg = float(heading) % 360.0
        except (TypeError, ValueError):
            return jsonify({'error': 'heading_deg must be a number'}), 400
    if speed is not None:
        try:
            share.speed_kts = max(0.0, float(speed))
        except (TypeError, ValueError):
            return jsonify({'error': 'speed_kts must be a number'}), 400

    # Duration: only set when the client explicitly sends one (so periodic
    # position pushes don't reset the timer/anchor).
    if duration_mode is not None:
        if duration_mode not in DURATION_MODES:
            return jsonify({'error': f'duration_mode must be one of {DURATION_MODES}'}), 400

        if duration_mode == 'hours':
            try:
                hrs = float(duration_hours)
            except (TypeError, ValueError):
                return jsonify({'error': 'duration_hours must be a number'}), 400
            if not (0 < hrs <= MAX_DURATION_HOURS):
                return jsonify({
                    'error': f'duration_hours must be > 0 and <= {MAX_DURATION_HOURS}'
                }), 400
            share.expires_at = datetime.now(timezone.utc) + timedelta(hours=hrs)
            share.anchor_location = None

        elif duration_mode == 'until_move':
            share.expires_at = None
            anchor = share.last_location
            if anchor is None and lat is not None and lng is not None:
                anchor = point_wkt(float(lat), float(lng))
            if anchor is None:
                return jsonify({
                    'error': 'until_move requires a position — no GPS fix yet',
                }), 400
            share.anchor_location = anchor

        else:  # indefinite
            share.expires_at = None
            share.anchor_location = None

    # Clear timer/anchor on explicit disable so a later enable starts fresh.
    if was_enabled and not enabled:
        share.expires_at = None
        share.anchor_location = None

    # Per-crew audience: accept only crews the user is currently in.
    db.execute(
        delete(LocationShareCrew).where(LocationShareCrew.username == me)
    )
    if share.audience_mode == 'crews':
        my_crew_ids = set(db.scalars(
            select(CrewMember.crew_id).where(CrewMember.username == me)
        ).all())
        wanted = {str(c) for c in crew_ids_raw}
        valid = {cid for cid in my_crew_ids if str(cid) in wanted}
        for cid in valid:
            db.add(LocationShareCrew(username=me, crew_id=cid))

    # Re-check auto-expire using the freshly posted coords — this handles
    # the case where periodic position pushes cross the drift threshold.
    _auto_expire(share, lat, lng)

    db.commit()
    db.refresh(share)
    logger.debug(
        f'Location updated for {me} '
        f'(enabled={share.enabled}, audience={share.audience_mode}, '
        f'expires_at={share.expires_at})'
    )
    return jsonify(_serialize_self(db, share))


@bp.route('/crews', methods=['GET'])
@require_auth
def crew_locations():
    """
    Return the latest broadcast position of every user the caller is
    allowed to see, honouring audience and duration rules.
    """
    db = SessionLocal()
    me = g.user.get('username')
    my_profile = db.get(Profile, me)
    my_marina = my_profile.home_marina_id if my_profile else None
    now = datetime.now(timezone.utc)

    my_crew_ids_subq = select(CrewMember.crew_id).where(
        CrewMember.username == me
    ).scalar_subquery()

    all_mode_reachers_subq = (
        select(CrewMember.username)
        .where(CrewMember.crew_id.in_(my_crew_ids_subq))
        .where(CrewMember.username != me)
    ).scalar_subquery()

    crews_mode_reachers_subq = (
        select(LocationShareCrew.username)
        .where(LocationShareCrew.crew_id.in_(my_crew_ids_subq))
        .where(LocationShareCrew.username != me)
    ).scalar_subquery()

    marina_cond = (
        and_(
            LocationShare.audience_mode == 'marina',
            Profile.home_marina_id == my_marina,
            Profile.home_marina_id.isnot(None),
        )
        if my_marina is not None
        else None
    )

    conditions = [
        and_(
            LocationShare.audience_mode == 'all',
            LocationShare.username.in_(all_mode_reachers_subq),
        ),
        and_(
            LocationShare.audience_mode == 'crews',
            LocationShare.username.in_(crews_mode_reachers_subq),
        ),
    ]
    if marina_cond is not None:
        conditions.append(marina_cond)

    # "Until move" drift check pushed into SQL via ST_DWithin so we don't
    # pay the cost of fetching every share row and filtering in Python.
    anchor_ok = or_(
        LocationShare.anchor_location.is_(None),
        ST_DWithin(
            LocationShare.last_location,
            LocationShare.anchor_location,
            UNTIL_MOVE_THRESHOLD_M,
        ),
    )

    rows = db.execute(
        select(LocationShare, Profile)
        .join(Profile, Profile.username == LocationShare.username)
        .where(LocationShare.enabled.is_(True))
        .where(LocationShare.last_location.isnot(None))
        .where(LocationShare.username != me)
        .where(or_(
            LocationShare.expires_at.is_(None),
            LocationShare.expires_at > now,
        ))
        .where(anchor_ok)
        .where(or_(*conditions))
    ).all()

    out = []
    seen = set()
    for share, prof in rows:
        if share.username in seen:
            continue
        seen.add(share.username)
        latlng = point_to_latlng(share.last_location)
        if latlng is None:
            continue
        out.append({
            'username': share.username,
            'display': prof.effective_handle(),
            'boat_name': prof.boat_name,
            'boat_type': prof.boat_type,
            'lat': latlng[0],
            'lng': latlng[1],
            'heading_deg': share.heading_deg,
            'speed_kts': share.speed_kts,
            'updated_at': share.updated_at.isoformat() if share.updated_at else None,
        })
    return jsonify(out)
