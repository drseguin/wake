/**
 * Toast Notification Component
 *
 * @fileoverview Renders a single toast notification centered at the top
 * of the viewport. Supports success, error, warning, and info types
 * with colored left border accents and matching icons.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 *
 * Key Features:
 * - Four toast types with distinct colors and icons
 * - Slide-in animation from top
 * - Manual close button
 * - Single toast at a time (managed by App)
 *
 * Dependencies:
 * - SVG icon assets (check_circle, error, warning, info)
 *
 * Security Considerations:
 * - Toast message is rendered as text, not HTML
 *
 * Performance Notes:
 * - Mounted only when toast is active
 */

import React from 'react';
import CheckCircleIcon from '../assets/icons/check_circle.svg?react';
import ErrorIcon from '../assets/icons/error.svg?react';
import WarningIcon from '../assets/icons/warning.svg?react';
import InfoIcon from '../assets/icons/info.svg?react';

const ICONS = {
  success: CheckCircleIcon,
  error: ErrorIcon,
  warning: WarningIcon,
  info: InfoIcon,
};

/**
 * Toast notification component.
 *
 * @param {Object} props
 * @param {Object} props.toast - Toast object with message and type
 * @param {Function} props.onClose - Close callback
 * @returns {JSX.Element}
 */
function Toast({ toast, onClose }) {
  const Icon = ICONS[toast.type] || ICONS.info;

  return (
    <div className="toast-container">
      <div className={`toast toast--${toast.type}`}>
        <Icon className="toast-icon" />
        <span className="toast-message">{toast.message}</span>
        <button className="toast-close" onClick={onClose} aria-label="Close notification">
          &times;
        </button>
      </div>
    </div>
  );
}

export default Toast;
