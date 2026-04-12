/**
 * NotFound Page
 *
 * @fileoverview Rendered when the active navigation target is unknown. Uses
 * the same visual language as the Forbidden panel for consistency.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 *
 * Key Features:
 * - Clear "page not found" messaging
 * - Optional onHome callback to return to a safe default view
 *
 * Dependencies: none
 */

import React from 'react';

/**
 * @param {Object} props
 * @param {Function} [props.onHome] - Optional callback, renders a "Back to dashboard" button
 * @returns {JSX.Element}
 */
function NotFound({ onHome }) {
  return (
    <div className="not-found">
      <p className="not-found-code">404</p>
      <h1 className="not-found-title">Page not found</h1>
      <p className="not-found-message">
        The page you are looking for does not exist or has been moved.
      </p>
      {onHome && (
        <button className="btn btn-primary" onClick={onHome}>
          Back to dashboard
        </button>
      )}
    </div>
  );
}

export default NotFound;
