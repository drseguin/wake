/**
 * API Service for Base App Frontend
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

/**
 * Make an API request with error handling.
 *
 * @param {string} endpoint - API endpoint path (e.g., '/api/v1/health')
 * @param {Object} [options] - Fetch options
 * @returns {Promise<Object>} Parsed JSON response
 * @throws {Error} When the request fails or returns non-OK status
 */
async function apiRequest(endpoint, options = {}) {
  logger.debug(`API request: ${options.method || 'GET'} ${endpoint}`);

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    logger.error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  logger.debug(`API response: ${endpoint}`, data);
  return data;
}

const api = {
  getHealth: () => apiRequest('/api/v1/health'),

  getConfig: () => apiRequest('/api/v1/config'),

  getUser: () => apiRequest('/api/v1/auth/user'),

  getLoginUrl: () => apiRequest('/api/v1/auth/login'),

  logout: () => apiRequest('/api/v1/auth/logout', { method: 'POST' }),
};

export default api;
