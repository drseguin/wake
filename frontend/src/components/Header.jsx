/**
 * Header Component
 *
 * @fileoverview Fixed top header bar containing the hamburger menu toggle,
 * centered logo with gradient text, and header actions group (metrics,
 * theme toggle, user menu).
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 *
 * Key Features:
 * - Hamburger toggle with animated three-line to X transition
 * - Centered logo with gradient accent text
 * - Header actions: MetricsDropdown, ThemeToggle, UserMenu
 *
 * Dependencies:
 * - ThemeToggle, UserMenu, MetricsDropdown components
 *
 * Security Considerations:
 * - User data displayed from authenticated session only
 *
 * Performance Notes:
 * - Fixed position, always visible, minimal re-renders
 */

import React from 'react';
import ThemeToggle from './ThemeToggle';
import UserMenu from './UserMenu';
import MetricsDropdown from './MetricsDropdown';

/**
 * App header with navigation toggle, logo, and action buttons.
 *
 * @param {Object} props
 * @param {boolean} props.panelOpen - Whether the left panel is open
 * @param {Function} props.onTogglePanel - Toggle panel callback
 * @param {Object} props.user - Current user info
 * @param {string|null} props.version - Build version string
 * @param {Function} props.onLogout - Logout callback
 * @param {Function} props.onOpenSettings - Open settings modal callback
 * @returns {JSX.Element}
 */
function Header({ panelOpen, onTogglePanel, user, version, onLogout, onOpenSettings }) {
  return (
    <header className="header">
      <button
        className="panel-toggle-header"
        onClick={onTogglePanel}
        aria-label="Toggle menu"
        aria-expanded={panelOpen}
      >
        <span className={`hamburger-icon ${panelOpen ? 'open' : ''}`}>
          <span className="hamburger-line top" />
          <span className="hamburger-line middle" />
          <span className="hamburger-line bottom" />
        </span>
      </button>

      <div className="header-center">
        <div className="logo">
          <svg className="logo-icon-svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="var(--accent-color)" opacity="0.15" />
            <path d="M8 24V8h6l4 8 4-8h6v16h-5V14l-3.5 7h-3L13 14v10H8Z" fill="var(--accent-color)" />
          </svg>
          <span className="logo-text">
            <span className="logo-text-base">Base</span>
            <span className="logo-text-app">App</span>
          </span>
        </div>
        <span className="app-subtitle">Application Template v1.0</span>
      </div>

      <div className="header-actions">
        <MetricsDropdown />
        <ThemeToggle />
        <UserMenu
          user={user}
          version={version}
          onLogout={onLogout}
          onOpenSettings={onOpenSettings}
        />
      </div>
    </header>
  );
}

export default Header;
