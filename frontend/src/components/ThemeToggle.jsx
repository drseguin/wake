/**
 * Theme Toggle Button
 *
 * @fileoverview Circular button that switches between light and dark
 * themes. Displays a sun icon in dark mode and moon icon in light mode.
 * Rotates 180 degrees on hover.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 *
 * Key Features:
 * - Sun/moon icon swap based on current theme
 * - 180-degree hover rotation animation
 * - Persists theme via ThemeContext
 *
 * Dependencies:
 * - ThemeContext (useTheme hook)
 * - SVG icon assets (light_mode, dark_mode)
 *
 * Security Considerations:
 * - None (purely visual)
 *
 * Performance Notes:
 * - CSS-only animation, no JavaScript on hover
 */

import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import LightModeIcon from '../assets/icons/light_mode.svg?react';
import DarkModeIcon from '../assets/icons/dark_mode.svg?react';

/**
 * Theme toggle button component.
 *
 * @returns {JSX.Element}
 */
function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <LightModeIcon className="theme-icon" />
      ) : (
        <DarkModeIcon className="theme-icon" />
      )}
    </button>
  );
}

export default ThemeToggle;
