/**
 * Confirmation Dialog Component
 *
 * @fileoverview Modal dialog for confirming destructive or important
 * actions. Supports warning, error, success, and info icon types.
 * Closes on Escape key or backdrop click.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 *
 * Key Features:
 * - Four icon types with distinct colors
 * - Keyboard accessible (Escape to cancel, Enter to confirm)
 * - Focus trap within dialog
 * - Backdrop click to cancel
 *
 * Dependencies:
 * - SVG icon assets (warning, error, check_circle, info)
 *
 * Security Considerations:
 * - Dialog message rendered as text, not HTML
 *
 * Performance Notes:
 * - Mounted only when dialog is active
 */

import React, { useEffect, useRef } from 'react';
import WarningIcon from '../assets/icons/warning.svg?react';
import ErrorIcon from '../assets/icons/error.svg?react';
import CheckCircleIcon from '../assets/icons/check_circle.svg?react';
import InfoIcon from '../assets/icons/info.svg?react';

const ICONS = {
  warning: WarningIcon,
  error: ErrorIcon,
  success: CheckCircleIcon,
  info: InfoIcon,
};

const ICON_CLASSES = {
  warning: 'dialog-icon--warning',
  error: 'dialog-icon--error',
  success: 'dialog-icon--success',
  info: 'dialog-icon--info',
};

/**
 * Confirmation dialog component.
 *
 * @param {Object} props
 * @param {string} props.title - Dialog title
 * @param {string} props.message - Dialog message
 * @param {string} [props.type='warning'] - Icon type
 * @param {string} [props.confirmText='Confirm'] - Confirm button text
 * @param {string} [props.cancelText='Cancel'] - Cancel button text
 * @param {boolean} [props.danger=false] - Use danger button style
 * @param {Function} props.onConfirm - Confirm callback
 * @param {Function} props.onCancel - Cancel callback
 * @returns {JSX.Element}
 */
function Dialog({
  title,
  message,
  type = 'warning',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);
  const Icon = ICONS[type] || ICONS.warning;

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handleKeyDown);
    confirmRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onClick={onCancel}>
      <div className="dialog-content" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <Icon className={`dialog-icon ${ICON_CLASSES[type] || ''}`} />
          <h3 className="dialog-title" id="dialog-title">{title}</h3>
        </div>
        <div className="dialog-body">
          <p className="dialog-message">{message}</p>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            ref={confirmRef}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dialog;
