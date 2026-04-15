/**
 * Left Panel (Expandable Navigation)
 *
 * @fileoverview Sliding side panel with route-aware navigation. Active item
 * is determined by the current route via react-router's NavLink. Width
 * persists in localStorage. Admin-only items only show when the current
 * user has the configured admin role.
 *
 * @author David Seguin
 * @version 2.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import MapIcon from '../assets/icons/map.svg?react';
import GroupIcon from '../assets/icons/group.svg?react';
import WaypointIcon from '../assets/icons/waypoint.svg?react';
import PersonIcon from '../assets/icons/person.svg?react';
import MarinaIcon from '../assets/icons/marina.svg?react';
import { useAuth } from '../contexts/AuthContext';

const NAV_ITEMS = [
  { to: '/',          end: true, title: 'Map',       subtitle: 'Live navigation', icon: MapIcon },
  { to: '/crews',                title: 'Crews',     subtitle: 'Your boating groups', icon: GroupIcon },
  { to: '/waypoints',            title: 'Waypoints', subtitle: 'Saved spots',     icon: WaypointIcon },
  { to: '/profile',              title: 'Profile',   subtitle: 'You & your boat', icon: PersonIcon },
];

const ADMIN_NAV_ITEMS = [
  { to: '/marinas', title: 'Marinas', subtitle: 'Manage catalogue', icon: MarinaIcon },
];

const MIN_WIDTH = 200;
const MAX_WIDTH = 500;
const DEFAULT_WIDTH = 280;

function LeftPanel({ open }) {
  const { isAdmin } = useAuth();
  const [width, setWidth] = useState(
    () => parseInt(localStorage.getItem('leftPanelWidth')) || DEFAULT_WIDTH
  );
  const [resizing, setResizing] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('leftPanelWidth', width);
  }, [width]);

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

  function renderItem(item) {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        className={({ isActive }) =>
          `panel-nav-item ${isActive ? 'panel-nav-item--active' : ''}`
        }
      >
        <span className="nav-item-icon"><Icon /></span>
        <span className="nav-item-content">
          <span className="nav-item-title">{item.title}</span>
          <span className="nav-item-subtitle">{item.subtitle}</span>
        </span>
      </NavLink>
    );
  }

  return (
    <aside
      className={`left-panel ${open ? 'open' : 'closed'}`}
      style={{ width }}
      ref={panelRef}
    >
      <div className="left-panel-content">
        <div className="panel-section-label">Navigation</div>
        <nav className="panel-nav">
          {NAV_ITEMS.map(renderItem)}
        </nav>

        {isAdmin && (
          <>
            <div className="panel-section-label">Administration</div>
            <nav className="panel-nav">
              {ADMIN_NAV_ITEMS.map(renderItem)}
            </nav>
          </>
        )}
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
