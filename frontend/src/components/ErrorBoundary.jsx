/**
 * Error Boundary
 *
 * @fileoverview React error boundary that catches render-time, lifecycle, and
 * constructor errors anywhere in its child tree and renders a fallback panel.
 * In development, shows error + stack + component stack for debugging. In
 * production, shows a short friendly message with Reload and Try Again buttons.
 *
 * @author David Seguin
 * @version 1.0.0
 * @since 2026
 * @license Professional - All Rights Reserved
 *
 * Key Features:
 * - Catches errors during rendering, lifecycle methods, and constructors
 * - Dev mode renders stack traces; prod mode hides them
 * - Recoverable via Try Again (resets error state) or Reload Page
 *
 * Dependencies:
 * - React 18 class component (error boundaries must be classes)
 * - Unified logger for structured error reporting
 *
 * Security Considerations:
 * - Never shows stack traces in production (import.meta.env.DEV guard)
 *
 * Performance Notes:
 * - No runtime cost when no error has been thrown
 */

import React from 'react';
import logger from '../utils/logger';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('ErrorBoundary caught:', error, errorInfo?.componentStack);
    this.setState({ errorInfo });
  }

  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, errorInfo } = this.state;
    const isDev = import.meta.env.DEV;

    return (
      <div className="error-boundary">
        <div className="error-boundary-card card">
          <h2 className="error-boundary-title">Something went wrong</h2>
          <p className="error-boundary-message">
            The page encountered an unexpected error. You can try again, or reload the page.
          </p>

          {isDev && error && (
            <pre className="error-boundary-stack">
              <strong>{error.toString()}</strong>
              {error.stack && `\n\n${error.stack}`}
              {errorInfo?.componentStack && `\n\nComponent stack:${errorInfo.componentStack}`}
            </pre>
          )}

          <div className="error-boundary-actions">
            <button className="btn btn-primary" onClick={this.resetError}>Try Again</button>
            <button className="btn btn-secondary" onClick={() => window.location.reload()}>Reload Page</button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
