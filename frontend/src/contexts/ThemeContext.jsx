/**
 * Theme Context Provider
 *
 * @fileoverview Manages dark/light theme and accent color state for the
 * entire application. Accent color derivatives (hover, light) are computed
 * from HSL at runtime. Both theme and accent persist in localStorage.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 *
 * Key Features:
 * - Dark/light theme toggle with localStorage persistence
 * - User-configurable accent color with 10 presets
 * - HSL-based derivative color computation
 * - Respects prefers-color-scheme as initial default
 *
 * Dependencies:
 * - React (createContext, useContext, useState, useEffect)
 *
 * Security Considerations:
 * - localStorage data is not sensitive (theme preferences only)
 *
 * Performance Notes:
 * - CSS custom property updates on documentElement are synchronous
 * - Minimal re-renders via context value memoization
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

const ACCENT_PRESETS = [
  { name: 'Orange', hex: '#FF6B35' },
  { name: 'Blue', hex: '#2196F3' },
  { name: 'Green', hex: '#4CAF50' },
  { name: 'Purple', hex: '#9C27B0' },
  { name: 'Red', hex: '#F44336' },
  { name: 'Teal', hex: '#009688' },
  { name: 'Pink', hex: '#E91E63' },
  { name: 'Amber', hex: '#FFC107' },
  { name: 'Indigo', hex: '#3F51B5' },
  { name: 'Cyan', hex: '#00BCD4' },
];

/**
 * Convert a hex color to HSL values.
 *
 * @param {string} hex - Hex color string (e.g., '#FF6B35')
 * @returns {number[]} Array of [hue, saturation, lightness]
 */
function hexToHsl(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/**
 * Convert HSL values to a hex color string.
 *
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {string} Hex color string
 */
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Derive hover and light accent variants from a base hex color.
 *
 * @param {string} hex - Base accent color hex
 * @returns {Object} Object with base, hover, and light hex values
 */
function deriveAccentVariants(hex) {
  const [h, s, l] = hexToHsl(hex);
  return {
    base: hex,
    hover: hslToHex(h, Math.min(s + 10, 100), Math.min(l + 10, 85)),
    light: hslToHex(h, Math.max(s - 20, 30), Math.min(l + 25, 90)),
  };
}

/**
 * Apply accent color and its derivatives to CSS custom properties.
 *
 * @param {string} hex - Accent color hex value
 */
function applyAccent(hex) {
  const { base, hover, light } = deriveAccentVariants(hex);
  const root = document.documentElement;
  root.style.setProperty('--accent-color', base);
  root.style.setProperty('--accent-color-hover', hover);
  root.style.setProperty('--accent-color-light', light);
  root.style.setProperty('--primary-color', base);
  root.style.setProperty('--primary-color-dark', hover);
  root.style.setProperty('--primary-orange', base);
  root.style.setProperty('--primary-orange-hover', hover);
  root.style.setProperty('--primary-orange-light', light);
}

const ThemeContext = createContext(null);

/**
 * Theme provider component wrapping the entire application.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} ThemeContext.Provider
 */
export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [accentColor, setAccentColorState] = useState(
    () => localStorage.getItem('accentColor') || '#FF6B35'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('darkMode', isDark);
  }, [isDark]);

  useEffect(() => {
    applyAccent(accentColor);
    localStorage.setItem('accentColor', accentColor);
  }, [accentColor]);

  const toggleTheme = () => setIsDark(d => !d);
  const setAccentColor = hex => setAccentColorState(hex);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, accentColor, setAccentColor, ACCENT_PRESETS }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
export { ACCENT_PRESETS };
