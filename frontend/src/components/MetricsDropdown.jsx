/**
 * System Metrics Dropdown
 *
 * @fileoverview Header button that opens a metrics panel showing system
 * health, uptime, stats, and progress bars. Shows placeholder data in
 * the base app; future apps replace with real metrics.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 *
 * Key Features:
 * - Metrics button with health status dot
 * - Uptime hero display
 * - 2x2 stat card grid
 * - Progress bars with gradient fills
 * - Click-outside and Escape to close
 *
 * Dependencies:
 * - SVG icon assets (bar_chart, speed, work, pending, schedule)
 *
 * Security Considerations:
 * - Metrics data fetched from authenticated API (placeholder in base app)
 *
 * Performance Notes:
 * - Dropdown content rendered only when open
 */

import React, { useState, useEffect, useRef } from 'react';
import BarChartIcon from '../assets/icons/bar_chart.svg?react';
import SpeedIcon from '../assets/icons/speed.svg?react';
import WorkIcon from '../assets/icons/work.svg?react';
import PendingIcon from '../assets/icons/pending.svg?react';
import ScheduleIcon from '../assets/icons/schedule.svg?react';

/**
 * Metrics dropdown component.
 *
 * @returns {JSX.Element}
 */
function MetricsDropdown() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setOpen(false);
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div className="metrics-wrapper" ref={wrapperRef}>
      <button
        className={`metrics-dropdown-button ${open ? 'active' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-label="System Metrics"
        aria-expanded={open}
      >
        <BarChartIcon className="metrics-icon" />
        <span className="metrics-status-dot metrics-status-dot--healthy" aria-label="Status: Healthy" />
      </button>

      {open && (
        <div className="metrics-dropdown-panel">
          <div className="metrics-dropdown-header">
            <h3 className="metrics-dropdown-title">System Metrics</h3>
            <div className="metrics-status-badge">
              <span className="status-dot status-dot--healthy" />
              <span className="status-text">Healthy</span>
            </div>
          </div>

          <div className="metrics-dropdown-content">
            <div className="metrics-uptime">
              <div className="metrics-uptime-value">0d 0h</div>
              <div className="metrics-uptime-label">System Uptime</div>
            </div>

            <div className="metrics-stats-grid">
              <div className="metrics-stat-card">
                <div className="metrics-stat-icon metrics-stat-icon--requests">
                  <SpeedIcon />
                </div>
                <div>
                  <div className="metrics-stat-value">0</div>
                  <div className="metrics-stat-label">Requests</div>
                </div>
              </div>

              <div className="metrics-stat-card">
                <div className="metrics-stat-icon metrics-stat-icon--jobs">
                  <WorkIcon />
                </div>
                <div>
                  <div className="metrics-stat-value">0</div>
                  <div className="metrics-stat-label">Jobs</div>
                </div>
              </div>

              <div className="metrics-stat-card">
                <div className="metrics-stat-icon metrics-stat-icon--queue">
                  <PendingIcon />
                </div>
                <div>
                  <div className="metrics-stat-value">0</div>
                  <div className="metrics-stat-label">Queue</div>
                </div>
              </div>

              <div className="metrics-stat-card">
                <div className="metrics-stat-icon metrics-stat-icon--time">
                  <ScheduleIcon />
                </div>
                <div>
                  <div className="metrics-stat-value">0 ms</div>
                  <div className="metrics-stat-label">Avg Time</div>
                </div>
              </div>
            </div>

            <div className="metrics-progress-item">
              <div className="metrics-progress-row">
                <span className="metrics-progress-label">Cache Hit Rate</span>
                <span className="metrics-progress-value">0%</span>
              </div>
              <div className="metrics-progress-bar">
                <div className="metrics-progress-fill metrics-progress-fill--cache" style={{ width: '0%' }} />
              </div>
            </div>

            <div className="metrics-progress-item">
              <div className="metrics-progress-row">
                <span className="metrics-progress-label">Workers Active</span>
                <span className="metrics-progress-value">0%</span>
              </div>
              <div className="metrics-progress-bar">
                <div className="metrics-progress-fill metrics-progress-fill--workers" style={{ width: '0%' }} />
              </div>
            </div>

            <div className="metrics-progress-item">
              <div className="metrics-progress-row">
                <span className="metrics-progress-label">Backend Health</span>
                <span className="metrics-progress-value">100%</span>
              </div>
              <div className="metrics-progress-bar">
                <div className="metrics-progress-fill metrics-progress-fill--backend" style={{ width: '100%' }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MetricsDropdown;
