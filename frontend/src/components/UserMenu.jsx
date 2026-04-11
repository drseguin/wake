/**
 * User Menu Dropdown
 *
 * @fileoverview Avatar button in the header that opens a dropdown showing
 * user information, role badge, and actions (Settings, Logout). Closes
 * on outside click or Escape key.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 *
 * Key Features:
 * - User avatar with initials
 * - Dropdown with user info, role badge, settings, logout
 * - Click-outside and Escape key to close
 * - Adapts to SINGLE_USER_MODE (synthetic admin user)
 *
 * Dependencies:
 * - SVG icon assets (settings, logout)
 *
 * Security Considerations:
 * - User info comes from authenticated backend session
 * - No sensitive data exposed in the dropdown
 *
 * Performance Notes:
 * - Dropdown rendered only when open
 * - Event listener cleanup on unmount
 */

import React, { useState, useEffect, useRef } from 'react';
import SettingsIcon from '../assets/icons/settings.svg?react';
import LogoutIcon from '../assets/icons/logout.svg?react';

/**
 * Get user initials from first/last name or username.
 *
 * @param {Object} user - User object
 * @returns {string} Two-letter initials
 */
function getInitials(user) {
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`;
  }
  return (user.username || 'U').slice(0, 2).toUpperCase();
}

/**
 * User menu component with avatar and dropdown.
 *
 * @param {Object} props
 * @param {Object} props.user - User info object
 * @param {Function} props.onLogout - Logout callback
 * @param {Function} props.onOpenSettings - Settings callback
 * @returns {JSX.Element}
 */
function UserMenu({ user, onLogout, onOpenSettings }) {
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

  if (!user) return null;

  const initials = getInitials(user);
  const isAdmin = user.roles?.includes('base-app-admin');
  const displayName = user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.username;

  return (
    <div className="user-menu-wrapper" ref={wrapperRef}>
      <button
        className="user-menu-button"
        onClick={() => setOpen(v => !v)}
        aria-label="User menu"
        aria-expanded={open}
      >
        <span className="user-menu-avatar">{initials}</span>
      </button>

      {open && (
        <div className="user-menu-dropdown" role="menu">
          <div className="user-menu-header">
            <span className="user-menu-avatar user-menu-avatar--large">{initials}</span>
            <div className="user-menu-info">
              <div className="user-menu-name">{displayName}</div>
              <div className="user-menu-email">{user.email}</div>
              {isAdmin && <span className="user-menu-badge">Admin</span>}
            </div>
          </div>

          <div className="user-menu-divider" />

          <button
            className="user-menu-item"
            role="menuitem"
            onClick={() => { setOpen(false); onOpenSettings(); }}
          >
            <SettingsIcon /> Settings
          </button>
          <button
            className="user-menu-item user-menu-item--danger"
            role="menuitem"
            onClick={() => { setOpen(false); onLogout(); }}
          >
            <LogoutIcon /> Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
