/**
 * Dashboard Page Component
 *
 * @fileoverview Sample dashboard page demonstrating cards, metrics,
 * status badges, and the component system. Serves as a placeholder
 * for future app-specific content.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 *
 * Key Features:
 * - Welcome section with app description
 * - Metric cards with icons and placeholder values
 * - Status badge demonstrations
 * - Quick action buttons demonstrating toast notifications
 *
 * Dependencies:
 * - SVG icon assets (speed, work, pending, schedule)
 *
 * Security Considerations:
 * - No sensitive data displayed
 *
 * Performance Notes:
 * - Static content, minimal re-renders
 */

import React from 'react';
import SpeedIcon from '../assets/icons/speed.svg?react';
import WorkIcon from '../assets/icons/work.svg?react';
import PendingIcon from '../assets/icons/pending.svg?react';
import ScheduleIcon from '../assets/icons/schedule.svg?react';

/**
 * Dashboard page component.
 *
 * @param {Object} props
 * @param {Function} props.showToast - Toast notification callback
 * @returns {JSX.Element}
 */
function Dashboard({ showToast }) {
  return (
    <div className="dashboard">
      <div className="dashboard-welcome">
        <h1>Welcome to Base App</h1>
        <p>
          This is the application template dashboard. It demonstrates the shared
          UI components, styling system, and layout patterns. Use this as the
          starting point for building new applications.
        </p>
      </div>

      <div className="dashboard-grid">
        <div className="card card--accent">
          <div className="dashboard-card-icon dashboard-card-icon--blue">
            <SpeedIcon />
          </div>
          <div className="dashboard-card-title">Total Requests</div>
          <div className="dashboard-card-value">0</div>
          <div className="dashboard-card-subtitle">Since last restart</div>
        </div>

        <div className="card card--accent">
          <div className="dashboard-card-icon dashboard-card-icon--green">
            <WorkIcon />
          </div>
          <div className="dashboard-card-title">Completed Jobs</div>
          <div className="dashboard-card-value">0</div>
          <div className="dashboard-card-subtitle">All time</div>
        </div>

        <div className="card card--accent">
          <div className="dashboard-card-icon dashboard-card-icon--orange">
            <PendingIcon />
          </div>
          <div className="dashboard-card-title">Queue Size</div>
          <div className="dashboard-card-value">0</div>
          <div className="dashboard-card-subtitle">Pending items</div>
        </div>

        <div className="card card--accent">
          <div className="dashboard-card-icon dashboard-card-icon--purple">
            <ScheduleIcon />
          </div>
          <div className="dashboard-card-title">Avg Response</div>
          <div className="dashboard-card-value">0 ms</div>
          <div className="dashboard-card-subtitle">Last 24 hours</div>
        </div>
      </div>

      <div className="dashboard-section">
        <div className="dashboard-section-title">Status Badges</div>
        <div className="badge-demo">
          <span className="status-badge status-badge--success">Healthy</span>
          <span className="status-badge status-badge--info">Running</span>
          <span className="status-badge status-badge--warning">Degraded</span>
          <span className="status-badge status-badge--error">Offline</span>
        </div>
      </div>

      <div className="dashboard-section">
        <div className="dashboard-section-title">Quick Actions</div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => showToast('Operation completed successfully!', 'success')}>
            Success Toast
          </button>
          <button className="btn btn-secondary" onClick={() => showToast('This is an informational message.', 'info')}>
            Info Toast
          </button>
          <button className="btn btn-secondary" onClick={() => showToast('Warning: Check your configuration.', 'warning')}>
            Warning Toast
          </button>
          <button className="btn btn-danger" onClick={() => showToast('An error occurred during the operation.', 'error')}>
            Error Toast
          </button>
        </div>
      </div>

      <div className="dashboard-section">
        <div className="dashboard-section-title">Getting Started</div>
        <div className="card">
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Building Your App
          </h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            This base app provides the complete UI shell, theming system, and
            authentication flow. To build your application, replace this
            Dashboard component with your app-specific content. The left panel
            navigation, header, settings modal, toast notifications, and
            confirmation dialogs are all ready to use.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
