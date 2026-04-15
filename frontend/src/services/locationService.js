/**
 * locationService — single source of truth for the user's position.
 *
 * @fileoverview Wraps navigator.geolocation.watchPosition once for the
 * whole app, and (when sharing is enabled) POSTs the latest position to
 * the backend every 30s. Components subscribe via subscribePosition() and
 * receive callbacks on every fresh fix.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 */

import api from './api';
import logger from '../utils/logger';

const PUSH_INTERVAL_MS = 30_000;

class LocationService {
  constructor() {
    this.position = null;        // { lat, lng, accuracy, heading, speed }
    this.error = null;
    this.sharing = false;
    this.subscribers = new Set();
    this.sharingSubscribers = new Set();
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

  /** Subscribe to changes in the sharing flag. Returns an unsubscribe fn. */
  subscribeSharing(cb) {
    this.sharingSubscribers.add(cb);
    cb(this.sharing);
    return () => this.sharingSubscribers.delete(cb);
  }

  /** Pull the current sharing state from the backend on app load. */
  async hydrateSharing() {
    try {
      const me = await api.getMyLocation();
      this._setSharingFlag(!!me.enabled);
      if (me.enabled) this._startPushTimer();
    } catch (err) {
      logger.warn(`Could not hydrate location sharing: ${err.message}`);
    }
  }

  /** Turn broadcasting on or off. */
  async setSharing(enabled) {
    if (this.sharing === enabled) return;
    this._setSharingFlag(enabled);
    if (enabled) {
      this._startPushTimer();
      await this._pushNow();
    } else {
      this._stopPushTimer();
      try {
        await api.putMyLocation({ enabled: false });
      } catch (err) {
        logger.warn(`Failed to clear sharing flag on backend: ${err.message}`);
      }
    }
  }

  // ----- internals -----

  _setSharingFlag(v) {
    this.sharing = v;
    this.sharingSubscribers.forEach((cb) => cb(v));
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
    if (!this.sharing || !this.position) return;
    try {
      await api.putMyLocation({
        enabled: true,
        lat: this.position.lat,
        lng: this.position.lng,
        heading_deg: this.position.heading,
        speed_kts: this.position.speed != null ? this.position.speed * 1.94384 : null,
      });
    } catch (err) {
      logger.warn(`Location push failed: ${err.message}`);
    }
  }
}

const locationService = new LocationService();
export default locationService;
