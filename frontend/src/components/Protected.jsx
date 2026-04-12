/**
 * Protected Route Wrapper
 *
 * @fileoverview Conditionally renders its children based on authentication
 * and role requirements. Pair with the backend `@require_role` decorator for
 * defense-in-depth — this is a UX gate, not a security boundary.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 *
 * Key Features:
 * - `<Protected>` requires an authenticated user
 * - `<Protected roles={['admin']}>` additionally requires any listed role
 * - Renders a friendly Forbidden panel when role check fails
 *
 * Dependencies:
 * - useAuth hook (AuthContext)
 *
 * Security Considerations:
 * - Frontend gating only; real authorization lives on the backend
 *
 * Performance Notes:
 * - No network calls; reads AuthContext value
 */

import React from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Gate a subtree on authentication and optional role membership.
 *
 * @param {Object} props
 * @param {string[]} [props.roles] - If provided, user must have at least one role
 * @param {React.ReactNode} [props.fallback] - Custom fallback when role check fails
 * @param {React.ReactNode} props.children - Subtree to render when allowed
 * @returns {JSX.Element|null}
 */
function Protected({ roles, fallback, children }) {
  const { user, hasRole } = useAuth();

  if (!user) {
    return fallback || (
      <div className="not-found">
        <h1 className="not-found-title">Sign in required</h1>
        <p className="not-found-message">You need to be signed in to view this page.</p>
      </div>
    );
  }

  if (roles && roles.length > 0) {
    const ok = roles.some(hasRole);
    if (!ok) {
      return fallback || (
        <div className="not-found">
          <p className="not-found-code">403</p>
          <h1 className="not-found-title">Forbidden</h1>
          <p className="not-found-message">
            Your account does not have permission to view this page.
          </p>
        </div>
      );
    }
  }

  return <>{children}</>;
}

export default Protected;
