/**
 * ConnectionStatus
 *
 * @fileoverview Tiny LED indicator rendered in the header that polls
 * `/api/v1/health`. Green = healthy, yellow = degraded (slow/stale response),
 * red = unreachable. After N consecutive failed polls a non-dismissible
 * overlay is shown so the user stops interacting with a broken backend.
 *
 * Adapted from REF_APPS/Translate/frontend/src/components/ConnectionStatus.js
 * but trimmed to match the base template — the full version has per-component
 * LEDs (redis, translation, job queue) which this app does not yet need.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 *
 * Key Features:
 * - Polls every 15s (default) with a 10s request timeout
 * - Overlay opens only after 3 consecutive failures to ride out blips
 * - Manual "Retry now" button in the overlay
 *
 * Dependencies:
 * - api.getHealth
 * - Tooltip for hover text
 *
 * Performance Notes:
 * - Hidden while the initial health check is in flight to avoid a flash
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import api from '../services/api';
import logger from '../utils/logger';
import Tooltip from './Tooltip';

const POLL_INTERVAL_MS = 15000;
const OVERLAY_AFTER_FAILS = 3;

function ConnectionStatus() {
  const [status, setStatus] = useState('unknown');
  const [consecutiveFails, setConsecutiveFails] = useState(0);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);

  const check = useCallback(async () => {
    try {
      const data = await api.getHealth();
      if (!mountedRef.current) return;
      if (data?.status === 'healthy') {
        setStatus('healthy');
        setConsecutiveFails(0);
      } else {
        setStatus('degraded');
        setConsecutiveFails((n) => n + 1);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      logger.warn('Health check failed:', err.message);
      setStatus('unhealthy');
      setConsecutiveFails((n) => n + 1);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    check();
    timerRef.current = setInterval(check, POLL_INTERVAL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(timerRef.current);
    };
  }, [check]);

  if (status === 'unknown') return null;

  const showOverlay = consecutiveFails >= OVERLAY_AFTER_FAILS;
  const label = {
    healthy:   'Backend healthy',
    degraded:  'Backend responding slowly or degraded',
    unhealthy: 'Backend unreachable',
    unknown:   'Checking…',
  }[status];

  return (
    <>
      {showOverlay && (
        <div className="connection-overlay" role="alert" aria-live="assertive">
          <div className="connection-overlay-card card">
            <h2 className="connection-overlay-title">Service unavailable</h2>
            <p className="connection-overlay-message">
              We can't reach the backend right now. Any action you take will fail until it is back.
            </p>
            <button className="btn btn-primary" onClick={check}>Retry now</button>
          </div>
        </div>
      )}

      <Tooltip content={label} placement="bottom">
        <span
          className={`connection-led connection-led--${status}`}
          aria-label={label}
          role="status"
        />
      </Tooltip>
    </>
  );
}

export default ConnectionStatus;
