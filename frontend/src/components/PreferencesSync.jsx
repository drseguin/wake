/**
 * PreferencesSync
 *
 * @fileoverview Bridge between the authenticated user and ThemeContext.
 * Once a user is known, hydrate their stored preferences from
 * /api/v1/user/preferences and apply them to the theme. After that,
 * any theme/accent change propagates back to the server with a small
 * debounce so rapid toggles do not generate a flood of PUTs.
 *
 * Does not render anything; mount it inside both AuthProvider and
 * ThemeProvider.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 *
 * Key Features:
 * - Server → client on first auth (overrides localStorage when present)
 * - Client → server on changes (debounced)
 * - Silently falls back to localStorage-only when unauthenticated
 *
 * Dependencies:
 * - useAuth, useTheme
 * - api.getPreferences / savePreferences
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
import logger from '../utils/logger';

const DEBOUNCE_MS = 500;

function PreferencesSync() {
  const { user } = useAuth();
  const theme = useTheme();
  const hydratedRef = useRef(false);
  const debounceRef = useRef(null);

  // Hydrate once per login
  useEffect(() => {
    if (!user || hydratedRef.current || !theme) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const prefs = await api.getPreferences();
        if (cancelled) return;
        if (prefs?.theme && (prefs.theme === 'dark') !== theme.isDark) {
          theme.toggleTheme();
        }
        if (prefs?.accentColor && prefs.accentColor !== theme.accentColor) {
          theme.setAccentColor(prefs.accentColor);
        }
        hydratedRef.current = true;
        logger.debug('Preferences hydrated from backend');
      } catch (err) {
        logger.warn('Could not hydrate preferences:', err.message);
      }
    })();

    return () => { cancelled = true; };
  }, [user, theme]);

  // Persist changes back
  useEffect(() => {
    if (!user || !hydratedRef.current || !theme) return undefined;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      api.savePreferences({
        theme: theme.isDark ? 'dark' : 'light',
        accentColor: theme.accentColor,
      }).catch((err) => logger.warn('Could not persist preferences:', err.message));
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [user, theme?.isDark, theme?.accentColor]);

  return null;
}

export default PreferencesSync;
