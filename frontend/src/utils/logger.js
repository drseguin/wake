/**
 * Unified Logger for Base App Frontend
 *
 * @fileoverview Provides a logger utility with the BA: prefix for all
 * frontend logging. All modules must use this logger instead of raw
 * console.log, console.warn, etc.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 *
 * Key Features:
 * - Consistent BA: prefix on all log messages
 * - Four log levels: debug, info, warn, error
 * - Production-safe (debug suppressed in production)
 *
 * Dependencies:
 * - None (uses native console API internally)
 *
 * Security Considerations:
 * - Never log sensitive data (tokens, passwords)
 *
 * Performance Notes:
 * - Debug logs suppressed in production builds
 */

const isDev = import.meta.env.DEV;

const logger = {
  debug: (...args) => {
    if (isDev) {
      console.debug('BA: [DEBUG]', ...args);
    }
  },

  info: (...args) => {
    console.info('BA: [INFO]', ...args);
  },

  warn: (...args) => {
    console.warn('BA: [WARN]', ...args);
  },

  error: (...args) => {
    console.error('BA: [ERROR]', ...args);
  }
};

export default logger;
