/**
 * Unified Logger for WAKE App Frontend
 *
 * @fileoverview Provides a level-aware logger with the DSC: prefix for all
 * frontend logging. All modules must use this logger instead of raw
 * console.log, console.warn, etc. The active level defaults to DEBUG in
 * development and INFO in production; it can be overridden at runtime via
 * `logger.setLevel(name)` — typically called once after the app fetches
 * `/api/v1/config` so the backend `LOG_LEVEL` env var drives both sides.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 *
 * Key Features:
 * - Five levels: NONE / ERROR / WARN / INFO / DEBUG
 * - Runtime level override via `setLevel`
 * - Persists chosen level to localStorage so reloads stay consistent
 *
 * Dependencies: none
 *
 * Security Considerations:
 * - Never log sensitive data (tokens, passwords)
 */

const LEVELS = { NONE: 0, ERROR: 1, WARN: 2, INFO: 3, DEBUG: 4 };
const STORAGE_KEY = 'logLevel';

function resolveInitialLevel() {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  if (stored && stored in LEVELS) return LEVELS[stored];
  return import.meta.env.DEV ? LEVELS.DEBUG : LEVELS.INFO;
}

let activeLevel = resolveInitialLevel();

function emit(level, consoleMethod, tag, args) {
  if (activeLevel < level) return;
  consoleMethod(`DSC: [${tag}]`, ...args);
}

const logger = {
  /**
   * Set the active log level. Accepts a level name (e.g. 'INFO') or number.
   * Persisted to localStorage so subsequent loads keep the same level.
   *
   * @param {('NONE'|'ERROR'|'WARN'|'INFO'|'DEBUG'|number)} level
   */
  setLevel(level) {
    const resolved = typeof level === 'number' ? level : LEVELS[String(level).toUpperCase()];
    if (resolved === undefined) return;
    activeLevel = resolved;
    try {
      const name = Object.keys(LEVELS).find((k) => LEVELS[k] === resolved);
      if (name) localStorage.setItem(STORAGE_KEY, name);
    } catch (_err) { /* storage unavailable */ }
  },

  getLevel() {
    return Object.keys(LEVELS).find((k) => LEVELS[k] === activeLevel) || 'INFO';
  },

  debug: (...args) => emit(LEVELS.DEBUG, console.debug, 'DEBUG', args),
  info:  (...args) => emit(LEVELS.INFO,  console.info,  'INFO',  args),
  warn:  (...args) => emit(LEVELS.WARN,  console.warn,  'WARN',  args),
  error: (...args) => emit(LEVELS.ERROR, console.error, 'ERROR', args),
};

export { LEVELS };
export default logger;
