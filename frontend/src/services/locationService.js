/**
 * locationService — single source of truth for the user's position.
 *
 * @fileoverview Wraps navigator.geolocation.watchPosition once for the
 * whole app, and (when sharing is enabled) POSTs the latest position to
 * the backend every 30s. Components subscribe via subscribePosition() and
 * receive callbacks on every fresh fix. Sharing settings (on/off + the
 * chosen audience) live here too.
 *
 * @author David Seguin
 * @version 1.1.0
 * @since 2026
 * @license Professional - All Rights Reserved
 */

import api from './api';
import logger from '../utils/logger';

const PUSH_INTERVAL_MS = 30_000;

const DEFAULT_SHARE_STATE = {
  enabled: false,
  audience_mode: 'all',    // 'all' | 'crews' | 'marina'
  audience_crew_ids: [],
  duration_mode: 'indefinite', // 'indefinite' | 'hours' | 'until_move'
  expires_at: null,
};

class LocationService {
  constructor() {
    this.position = null;        // { lat, lng, accuracy, heading, speed }
    this.error = null;
    this.shareState = { ...DEFAULT_SHARE_STATE };
    this.subscribers = new Set();
    this.shareSubscribers = new Set();
    this.watchId = null;
    this.intervalId = null;
  }

  /** Kick off the geolocation watch. Idempotent. */
  start() {
    if (this.watchId != null || !('geolocation' in navigator)) return;
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.position = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: Number.isFinite(pos.coords.heading) ? pos.coords.heading : null,
          speed: Number.isFinite(pos.coords.speed) ? pos.coords.speed : null,
        };
        this.error = null;
        this.subscribers.forEach((cb) => cb(this.position, null));
      },
      (err) => {
        logger.warn(`Geolocation error: ${err.message}`);
        this.error = err.message;
        this.subscribers.forEach((cb) => cb(this.position, err.message));
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
  }

  /** Subscribe to position updates. Returns an unsubscribe fn. */
  subscribePosition(cb) {
    this.subscribers.add(cb);
    if (this.position || this.error) cb(this.position, this.error);
    return () => this.subscribers.delete(cb);
  }

  /** Subscribe to sharing state changes. Callback receives the full share state. */
  subscribeShare(cb) {
    this.shareSubscribers.add(cb);
    cb(this.shareState);
    return () => this.shareSubscribers.delete(cb);
  }

  /** Pull the current sharing state from the backend on app load. */
  async hydrateSharing() {
    try {
      const me = await api.getMyLocation();
      this._setShareState(this._fromServer(me));
      if (me.enabled) this._startPushTimer();
    } catch (err) {
      logger.warn(`Could not hydrate location sharing: ${err.message}`);
    }
  }

  /**
   * Turn broadcasting on/off and/or change the audience/duration.
   *
   * @param {Object} next
   * @param {boolean} next.enabled
   * @param {'all'|'crews'|'marina'} [next.audience_mode]
   * @param {string[]} [next.audience_crew_ids]
   * @param {'indefinite'|'hours'|'until_move'} [next.duration_mode]
   * @param {number} [next.duration_hours] - required when duration_mode='hours'
   */
  async updateSharing(next) {
    const payload = {
      enabled: !!next.enabled,
      audience_mode: next.audience_mode || this.shareState.audience_mode,
      audience_crew_ids: next.audience_crew_ids || this.shareState.audience_crew_ids,
    };

    if (next.duration_mode) {
      payload.duration_mode = next.duration_mode;
      if (next.duration_mode === 'hours') {
        payload.duration_hours = Number(next.duration_hours);
      }
    }

    // Include a current fix on enable so the backend has coords immediately
    // (also needed to anchor 'until_move').
    if (payload.enabled && this.position) {
      payload.lat = this.position.lat;
      payload.lng = this.position.lng;
      payload.heading_deg = this.position.heading;
      payload.speed_kts = this.position.speed != null
        ? this.position.speed * 1.94384
        : null;
    }

    const saved = await api.putMyLocation(payload);
    this._setShareState(this._fromServer(saved));

    if (saved.enabled) {
      this._startPushTimer();
    } else {
      this._stopPushTimer();
    }
    return saved;
  }

  _fromServer(s) {
    return {
      enabled: !!s.enabled,
      audience_mode: s.audience_mode || 'all',
      audience_crew_ids: s.audience_crew_ids || [],
      duration_mode: s.duration_mode || 'indefinite',
      expires_at: s.expires_at || null,
    };
  }

  // ----- internals -----

  _setShareState(next) {
    this.shareState = { ...this.shareState, ...next };
    this.shareSubscribers.forEach((cb) => cb(this.shareState));
  }

  _startPushTimer() {
    if (this.intervalId != null) return;
    this.intervalId = setInterval(() => { this._pushNow(); }, PUSH_INTERVAL_MS);
  }

  _stopPushTimer() {
    if (this.intervalId != null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async _pushNow() {
    if (!this.shareState.enabled || !this.position) return;
    try {
      const saved = await api.putMyLocation({
        enabled: true,
        lat: this.position.lat,
        lng: this.position.lng,
        heading_deg: this.position.heading,
        speed_kts: this.position.speed != null ? this.position.speed * 1.94384 : null,
      });
      // Server may have auto-disabled sharing (timer expired, or drifted
      // past the 'until_move' anchor). Reflect that locally.
      this._setShareState(this._fromServer(saved));
      if (!saved.enabled) this._stopPushTimer();
    } catch (err) {
      logger.warn(`Location push failed: ${err.message}`);
    }
  }
}

const locationService = new LocationService();
export default locationService;
