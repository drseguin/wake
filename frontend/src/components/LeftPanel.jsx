/**
 * Left Panel (Expandable Navigation)
 *
 * @fileoverview Sliding side panel with navigation items and a draggable
 * resize handle. Width persists in localStorage. Panel slides in from
 * the left with a CSS transform transition.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 *
 * Key Features:
 * - Slide in/out animation via CSS transform
 * - Resizable width (200-500px) with drag handle
 * - Width persistence in localStorage
 * - Data-driven nav items for easy extension
 * - Section labels with uppercase micro-label styling
 *
 * Dependencies:
 * - SVG icon assets (dashboard)
 *
 * Security Considerations:
 * - None (purely navigational)
 *
 * Performance Notes:
 * - Resize uses document-level mousemove for smooth tracking
 * - user-select: none applied during resize to prevent text selection
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import DashboardIcon from '../assets/icons/dashboard.svg?react';
import PersonIcon from '../assets/icons/person.svg?react';
import SettingsIcon from '../assets/icons/settings.svg?react';

const NAV_ITEMS = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    subtitle: 'Overview',
    icon: DashboardIcon,
  },
  {
    id: 'users',
    title: 'Users',
    subtitle: 'User management',
    icon: PersonIcon,
  },
  {
    id: 'settings',
    title: 'Settings',
    subtitle: 'App configuration',
    icon: SettingsIcon,
  },
];

const MIN_WIDTH = 200;
const MAX_WIDTH = 500;
const DEFAULT_WIDTH = 280;

/**
 * Left panel navigation component.
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether the panel is open
 * @param {string} props.activeNav - Currently active nav item ID
 * @param {Function} props.onNavChange - Nav change callback
 * @returns {JSX.Element}
 */
function LeftPanel({ open, activeNav, onNavChange }) {
  const [width, setWidth] = useState(
    () => parseInt(localStorage.getItem('leftPanelWidth')) || DEFAULT_WIDTH
  );
  const [resizing, setResizing] = useState(false);
  const panelRef = useRef(null);

  // Persist width
  useEffect(() => {
    localStorage.setItem('leftPanelWidth', width);
  }, [width]);

  // Resize handlers
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setResizing(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, []);

  useEffect(() => {
    if (!resizing) return;

    function handleMouseMove(e) {
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX));
      setWidth(newWidth);
    }

    function handleMouseUp() {
      setResizing(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing]);

  return (
    <aside
      className={`left-panel ${open ? 'open' : 'closed'}`}
      style={{ width }}
      ref={panelRef}
    >
      <div className="left-panel-content">
        <div className="panel-section-label">Navigation</div>

        <nav className="panel-nav">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`panel-nav-item ${activeNav === item.id ? 'panel-nav-item--active' : ''}`}
                onClick={() => onNavChange(item.id)}
              >
                <span className="nav-item-icon"><Icon /></span>
                <span className="nav-item-content">
                  <span className="nav-item-title">{item.title}</span>
                  <span className="nav-item-subtitle">{item.subtitle}</span>
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <div
        className={`panel-resize-handle ${resizing ? 'resizing' : ''}`}
        onMouseDown={handleMouseDown}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
      >
        <div className="panel-resize-handle-line" />
      </div>
    </aside>
  );
}

export default LeftPanel;
