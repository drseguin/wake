/**
 * EmptyState
 *
 * @fileoverview Neutral "nothing here yet" panel. Slots: illustration (SVG),
 * title, description, and optional action buttons. Used by Dashboard and any
 * list view with no data yet.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 *
 * Key Features:
 * - Keeps empty views visually grounded instead of blank
 * - Pairs with FormField and any button set for CTA flow
 *
 * Dependencies: React only
 */

import React from 'react';

/**
 * @param {Object} props
 * @param {React.ReactNode} [props.illustration] - Optional SVG or image element
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {React.ReactNode} [props.actions] - Button(s) to render below the text
 * @returns {JSX.Element}
 */
function EmptyState({ illustration, title, description, actions }) {
  return (
    <div className="empty-state">
      {illustration && <div className="empty-state-illustration">{illustration}</div>}
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {actions && <div className="empty-state-actions">{actions}</div>}
    </div>
  );
}

export default EmptyState;
