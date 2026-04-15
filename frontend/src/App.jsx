/**
 * WAKE App - Root Application Component
 *
 * @fileoverview Main application shell managing the header, left panel,
 * and main content area. Handles authentication state, panel open/close,
 * and provides toast/dialog context to all child components.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 *
 * Key Features:
 * - App shell layout (header, left panel, main content)
 * - Authentication state management (SSO + SINGLE_USER_MODE)
 * - Toast notification system
 * - Confirmation dialog system
 * - Panel open/close with localStorage persistence
 *
 * Dependencies:
 * - React 18
 * - ThemeContext for theme management
 * - API service for backend communication
 *
 * Security Considerations:
 * - Auth state fetched from backend on mount
 * - No tokens stored in frontend state
 *
 * Performance Notes:
 * - Single API call on mount for user info
 * - Panel state persisted to avoid layout shift on reload
 */

import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import LeftPanel from './components/LeftPanel';
import Toast from './components/Toast';
import Dialog from './components/Dialog';
import Settings from './components/Settings';
import PreferencesSync from './components/PreferencesSync';
import NotFound from './pages/NotFound';
import MapPage from './pages/Map';
import Profile from './pages/Profile';
import Marinas from './pages/Marinas';
import { AuthProvider } from './contexts/AuthContext';
import api from './services/api';
import logger from './utils/logger';

/* ------------------------------------------------------------------ */
/* Toast Context                                                       */
/* ------------------------------------------------------------------ */

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

/* ------------------------------------------------------------------ */
/* Dialog Context                                                      */
/* ------------------------------------------------------------------ */

const DialogContext = createContext(null);
export const useDialog = () => useContext(DialogContext);

/* ------------------------------------------------------------------ */
/* App Component                                                       */
/* ------------------------------------------------------------------ */

function App() {
  const [user, setUser] = useState(null);
  const [appName, setAppName] = useState('WAKE App');
  const [adminRole, setAdminRole] = useState(null);
  const [singleUserMode, setSingleUserMode] = useState(true);
  const [version, setVersion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(
    () => localStorage.getItem('panelOpen') !== 'false'
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const navigate = useNavigate();

  // Toast state
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  // Dialog state
  const [dialog, setDialog] = useState(null);

  /**
   * Show a toast notification. Replaces any existing toast.
   *
   * @param {string} message - Toast message text
   * @param {string} [type='info'] - Toast type: success, error, warning, info
   * @param {number} [duration=4000] - Auto-dismiss duration in ms
   */
  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    logger.debug(`Toast: [${type}] ${message}`);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), duration);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
  }, []);

  /**
   * Show a confirmation dialog.
   *
   * @param {Object} options - Dialog options
   * @param {string} options.title - Dialog title
   * @param {string} options.message - Dialog message
   * @param {string} [options.type='warning'] - Dialog icon type
   * @param {string} [options.confirmText='Confirm'] - Confirm button text
   * @param {string} [options.cancelText='Cancel'] - Cancel button text
   * @param {boolean} [options.danger=false] - Use danger styling for confirm
   * @returns {Promise<boolean>} Resolves true if confirmed, false if cancelled
   */
  const showDialog = useCallback((options) => {
    return new Promise((resolve) => {
      setDialog({
        ...options,
        onConfirm: () => { setDialog(null); resolve(true); },
        onCancel: () => { setDialog(null); resolve(false); },
      });
    });
  }, []);

  // Fetch config and user on mount
  useEffect(() => {
    async function init() {
      logger.info('Initializing application');
      try {
        const config = await api.getConfig();
        if (config.app_name) {
          setAppName(config.app_name);
          document.title = config.app_name;
          const meta = document.querySelector('meta[name="description"]');
          if (meta) meta.setAttribute('content', config.app_name);
        }
        setSingleUserMode(config.single_user_mode);
        if (config.admin_role) setAdminRole(config.admin_role);
        if (config.version) setVersion(config.version);
        if (config.log_level) logger.setLevel(config.log_level);
        logger.info(`SINGLE_USER_MODE: ${config.single_user_mode}`);

        const userData = await api.getUser();
        setUser(userData);
        logger.info(`User loaded: ${userData.username}`);
      } catch (err) {
        logger.error('Failed to initialize:', err.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Persist panel state
  useEffect(() => {
    localStorage.setItem('panelOpen', panelOpen);
  }, [panelOpen]);

  const togglePanel = useCallback(() => setPanelOpen(v => !v), []);

  /**
   * Handle user logout.
   */
  const handleLogout = useCallback(async () => {
    logger.info('User logging out');
    try {
      const data = await api.logout();
      if (data.logout_url && data.logout_url !== '/') {
        window.location.href = data.logout_url;
      } else {
        window.location.reload();
      }
    } catch (err) {
      logger.error('Logout failed:', err.message);
      showToast('Logout failed. Please try again.', 'error');
    }
  }, [showToast]);

  /**
   * Handle SSO login redirect.
   */
  const handleLogin = useCallback(async () => {
    logger.info('User initiating login');
    try {
      const data = await api.getLoginUrl();
      if (data.login_url) {
        window.location.href = data.login_url;
      }
    } catch (err) {
      logger.error('Login failed:', err.message);
      showToast('Login failed. Please try again.', 'error');
    }
  }, [showToast]);

  // Show login screen if not authenticated and not in single user mode
  if (!loading && !user && !singleUserMode) {
    const [firstWord, ...restWords] = appName.split(' ');
    return (
      <ToastContext.Provider value={{ showToast, dismissToast }}>
        <div className="login-screen">
          <div className="login-card card">
            <h1>
              <span className="logo-text-base">{firstWord}</span>
              {restWords.length > 0 && (
                <span className="logo-text-app">{restWords.join(' ')}</span>
              )}
            </h1>
            <p>Sign in to continue</p>
            <button className="btn btn-primary btn-lg" onClick={handleLogin}>
              Sign in with SSO
            </button>
          </div>
          {toast && <Toast toast={toast} onClose={dismissToast} />}
        </div>
      </ToastContext.Provider>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="login-screen">
        <div className="skeleton" style={{ width: 200, height: 40, marginBottom: 16 }} />
        <div className="skeleton" style={{ width: 300, height: 20 }} />
      </div>
    );
  }

  return (
    <AuthProvider user={user} adminRole={adminRole}>
    <PreferencesSync />
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      <DialogContext.Provider value={{ showDialog }}>
        <Header
          panelOpen={panelOpen}
          onTogglePanel={togglePanel}
          user={user}
          appName={appName}
          version={version}
          onLogout={handleLogout}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <LeftPanel open={panelOpen} />

        <main
          className="main-content"
          style={{ marginLeft: panelOpen ? (parseInt(localStorage.getItem('leftPanelWidth')) || 280) : 0 }}
        >
          <Routes>
            <Route path="/" element={<MapPage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/marinas" element={<Marinas />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound onHome={() => navigate('/')} />} />
          </Routes>
        </main>

        {settingsOpen && (
          <Settings
            onClose={() => setSettingsOpen(false)}
            showToast={showToast}
            appName={appName}
          />
        )}

        {toast && <Toast toast={toast} onClose={dismissToast} />}
        {dialog && <Dialog {...dialog} />}
      </DialogContext.Provider>
    </ToastContext.Provider>
    </AuthProvider>
  );
}

export default App;
