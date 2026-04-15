/**
 * API Service for WAKE App Frontend
 *
 * @fileoverview Centralized HTTP client for all backend API calls.
 * Uses fetch with credentials: 'include' for cookie-based auth.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 *
 * Key Features:
 * - Centralized fetch wrapper with error handling
 * - Automatic credentials inclusion for auth cookies
 * - All API endpoints in one place
 *
 * Dependencies:
 * - Native fetch API
 * - logger utility
 *
 * Security Considerations:
 * - credentials: 'include' sends cookies with every request
 * - All requests go through the nginx proxy (same origin)
 *
 * Performance Notes:
 * - No request caching; each call hits the backend
 */

import logger from '../utils/logger';

const BASE_URL = '';
const REFRESH_URL = '/api/v1/auth/refresh';

/**
 * Low-level fetch with credentials and JSON content-type. No retry logic.
 */
async function rawFetch(endpoint, options) {
  return fetch(`${BASE_URL}${endpoint}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
}

/**
 * Single-flight refresh — concurrent callers share one in-flight refresh call.
 */
let refreshInFlight = null;
async function refreshOnce() {
  if (!refreshInFlight) {
    refreshInFlight = rawFetch(REFRESH_URL, { method: 'POST' })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

/**
 * Make an API request with error handling and a single 401→refresh→retry
 * cycle. Skips the retry on the refresh endpoint itself to avoid recursion.
 *
 * @param {string} endpoint - API endpoint path (e.g., '/api/v1/health')
 * @param {Object} [options] - Fetch options
 * @returns {Promise<Object>} Parsed JSON response
 * @throws {Error} When the request fails or returns non-OK status
 */
async function apiRequest(endpoint, options = {}) {
  logger.debug(`API request: ${options.method || 'GET'} ${endpoint}`);

  let response = await rawFetch(endpoint, options);

  if (response.status === 401 && endpoint !== REFRESH_URL) {
    logger.debug('Got 401; attempting token refresh');
    const refreshed = await refreshOnce();
    if (refreshed) {
      logger.debug('Refresh succeeded; retrying original request');
      response = await rawFetch(endpoint, options);
    }
  }

  const requestId = response.headers.get('X-Request-ID') || '-';

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    logger.error(`API error [${requestId}]: ${response.status} ${response.statusText} ${endpoint} - ${errorText}`);
    const err = new Error(`API error: ${response.status}`);
    err.status = response.status;
    err.requestId = requestId;
    throw err;
  }

  if (response.status === 204) return null;

  const data = await response.json();
  logger.debug(`API response [${requestId}]: ${endpoint}`, data);
  return data;
}

const api = {
  getHealth: () => apiRequest('/api/v1/health'),

  getConfig: () => apiRequest('/api/v1/config'),

  getUser: () => apiRequest('/api/v1/auth/user'),

  getLoginUrl: () => apiRequest('/api/v1/auth/login'),

  refresh: () => apiRequest(REFRESH_URL, { method: 'POST' }),

  logout: () => apiRequest('/api/v1/auth/logout', { method: 'POST' }),

  getPreferences: () => apiRequest('/api/v1/user/preferences'),
  savePreferences: (prefs) => apiRequest('/api/v1/user/preferences', {
    method: 'PUT',
    body: JSON.stringify(prefs),
  }),

  // ----- Profile -----
  getProfile: () => apiRequest('/api/v1/profile'),
  saveProfile: (patch) => apiRequest('/api/v1/profile', {
    method: 'PUT',
    body: JSON.stringify(patch),
  }),

  // ----- Marinas -----
  listMarinas: () => apiRequest('/api/v1/marinas'),
  createMarina: (m) => apiRequest('/api/v1/marinas', {
    method: 'POST',
    body: JSON.stringify(m),
  }),
  updateMarina: (id, m) => apiRequest(`/api/v1/marinas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(m),
  }),
  deleteMarina: (id) => apiRequest(`/api/v1/marinas/${id}`, { method: 'DELETE' }),
};

export default api;
