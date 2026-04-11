/**
 * Settings Modal Component
 *
 * @fileoverview Full-screen modal with tabbed interface for application
 * settings and user preferences. The Appearance sub-tab provides accent
 * color swatches and theme toggle.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 *
 * Key Features:
 * - Top-level tabs: Settings, Preferences
 * - Sub-tabs under Preferences: General, Appearance
 * - Accent color swatch picker (10 presets, real-time preview)
 * - Dark/light theme toggle
 * - Escape key to close
 *
 * Dependencies:
 * - ThemeContext for accent color and theme management
 *
 * Security Considerations:
 * - Settings stored in localStorage only
 *
 * Performance Notes:
 * - Accent color change updates CSS variables synchronously
 */

import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Settings modal component.
 *
 * @param {Object} props
 * @param {Function} props.onClose - Close modal callback
 * @param {Function} props.showToast - Toast notification callback
 * @returns {JSX.Element}
 */
function Settings({ onClose, showToast }) {
  const { isDark, toggleTheme, accentColor, setAccentColor, ACCENT_PRESETS } = useTheme();
  const [activeTab, setActiveTab] = useState('preferences');
  const [activeSubTab, setActiveSubTab] = useState('appearance');

  useEffect(() => {
    function handleEscape(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={onClose}>
      <div className="modal-content modal-content--large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="settings-title">Settings</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close settings">
            &times;
          </button>
        </div>

        <div className="settings-tabs" role="tablist">
          <button
            className={`settings-tab ${activeTab === 'settings' ? 'settings-tab--active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
          <button
            className={`settings-tab ${activeTab === 'preferences' ? 'settings-tab--active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'preferences'}
            onClick={() => setActiveTab('preferences')}
          >
            Preferences
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'settings' && (
            <div>
              <div className="settings-section">
                <h3>Application Settings</h3>
                <p className="settings-description">
                  Configure application-specific settings here. In the base app,
                  this section is a placeholder. Future apps will add their own
                  configuration options.
                </p>

                <div className="form-group">
                  <label className="form-label">Application Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value="Base App"
                    readOnly
                    placeholder="Enter application name"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Version</label>
                  <input
                    type="text"
                    className="form-input"
                    value="1.0.0"
                    readOnly
                    placeholder="Version number"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div>
              <div className="dashboard-subtabs">
                <button
                  className={`dashboard-subtab ${activeSubTab === 'general' ? 'dashboard-subtab--active' : ''}`}
                  onClick={() => setActiveSubTab('general')}
                >
                  General
                </button>
                <button
                  className={`dashboard-subtab ${activeSubTab === 'appearance' ? 'dashboard-subtab--active' : ''}`}
                  onClick={() => setActiveSubTab('appearance')}
                >
                  Appearance
                </button>
              </div>

              {activeSubTab === 'general' && (
                <div className="settings-section">
                  <h3>General Preferences</h3>
                  <p className="settings-description">
                    Configure general user preferences. Future apps will add
                    app-specific preference options here.
                  </p>

                  <div className="settings-row">
                    <span className="settings-row-label">Enable notifications</span>
                    <label className="toggle-switch">
                      <input type="checkbox" defaultChecked />
                      <span className="toggle-slider" />
                    </label>
                  </div>

                  <div className="settings-row">
                    <span className="settings-row-label">Compact mode</span>
                    <label className="toggle-switch">
                      <input type="checkbox" />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </div>
              )}

              {activeSubTab === 'appearance' && (
                <div>
                  <div className="settings-section">
                    <h3>Accent Color</h3>
                    <p className="settings-description">
                      Choose the primary accent color used throughout the app.
                    </p>
                    <div className="accent-color-swatches">
                      {ACCENT_PRESETS.map(preset => (
                        <button
                          key={preset.hex}
                          className={`accent-swatch ${accentColor === preset.hex ? 'accent-swatch--active' : ''}`}
                          style={{ background: preset.hex }}
                          title={preset.name}
                          aria-label={`${preset.name} accent color`}
                          onClick={() => setAccentColor(preset.hex)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="settings-section">
                    <h3>Theme</h3>
                    <p className="settings-description">
                      Switch between light and dark mode.
                    </p>
                    <div className="settings-row">
                      <span className="settings-row-label">Dark mode</span>
                      <label className="toggle-switch">
                        <input type="checkbox" checked={isDark} onChange={toggleTheme} />
                        <span className="toggle-slider" />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div />
          <div className="modal-footer-buttons">
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                showToast('Settings saved successfully', 'success');
                onClose();
              }}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
