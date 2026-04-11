/**
 * Dashboard Page Component
 *
 * @fileoverview Main dashboard page. Replace with app-specific content.
 *
 * @author David Seguin
 * @version 1.1.0
 * @since 2026
 * @license Professional - All Rights Reserved
 *
 * Key Features:
 * - Welcome section placeholder
 *
 * Security Considerations:
 * - No sensitive data displayed
 *
 * Performance Notes:
 * - Static content, minimal re-renders
 */

import React from 'react';

/**
 * Dashboard page component.
 *
 * @param {Object} props
 * @param {Function} props.showToast - Toast notification callback
 * @param {string} props.appName - Application name from config
 * @returns {JSX.Element}
 */
function Dashboard({ showToast, appName }) {
  return (
    <div className="dashboard">
      <div className="dashboard-welcome">
        <h1>Welcome to {appName}</h1>
        <p>
          Replace this page with your application content.
        </p>
      </div>
    </div>
  );
}

export default Dashboard;
