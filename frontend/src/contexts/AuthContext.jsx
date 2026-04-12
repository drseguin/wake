/**
 * Auth Context Provider
 *
 * @fileoverview Centralizes the authenticated user and the configured
 * admin-role name so components never hardcode role strings. Supplies an
 * `isAdmin` flag and a `hasRole(role)` helper that work consistently in
 * both Keycloak and SINGLE_USER_MODE.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 *
 * Key Features:
 * - Single source of truth for the admin role name (comes from /api/v1/config)
 * - `useAuth()` hook exposing user, adminRole, isAdmin, hasRole
 *
 * Dependencies:
 * - React (createContext, useContext, useMemo)
 *
 * Security Considerations:
 * - The role list comes from the server session only; never from the client
 * - `adminRole` is a config string, not a privilege — the real check is on the backend
 *
 * Performance Notes:
 * - Value memoized so consumers do not re-render on unrelated App state changes
 */

import React, { createContext, useContext, useMemo } from 'react';

const AuthContext = createContext(null);

/**
 * Provider that wraps any subtree needing access to the authenticated user.
 *
 * @param {Object} props
 * @param {Object|null} props.user - Current user (from /api/v1/auth/user)
 * @param {string|null} props.adminRole - Admin role name (from /api/v1/config)
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
export function AuthProvider({ user, adminRole, children }) {
  const value = useMemo(() => {
    const roles = user?.roles || [];
    const hasRole = (role) => !!role && roles.includes(role);
    return {
      user,
      adminRole,
      isAdmin: !!adminRole && hasRole(adminRole),
      hasRole,
    };
  }, [user, adminRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Access the current auth state.
 *
 * @returns {{user: Object|null, adminRole: string|null, isAdmin: boolean, hasRole: (r: string) => boolean}}
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return { user: null, adminRole: null, isAdmin: false, hasRole: () => false };
  }
  return ctx;
}
