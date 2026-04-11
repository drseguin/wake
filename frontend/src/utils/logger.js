/**
 * Unified Logger for Base App Frontend
 *
 * @fileoverview Provides a logger utility with the DSC: prefix for all
 * frontend logging. All modules must use this logger instead of raw
 * console.log, console.warn, etc.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 *
 * Key Features:
 * - Consistent DSC: prefix on all log messages
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
      console.debug('DSC: [DEBUG]', ...args);
    }
  },

  info: (...args) => {
    console.info('DSC: [INFO]', ...args);
  },

  warn: (...args) => {
    console.warn('DSC: [WARN]', ...args);
  },

  error: (...args) => {
    console.error('DSC: [ERROR]', ...args);
  }
};

export default logger;
