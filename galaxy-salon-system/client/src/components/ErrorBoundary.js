import React from 'react';
import toast from 'react-hot-toast';

/**
 * Error Boundary Component
 * Catches React component errors and prevents full app crash
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // Could send to Sentry, LogRocket, etc.
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const isDev = process.env.NODE_ENV === 'development';

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-6">
              An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
            </p>

            {isDev && this.state.error && (
              <div className="text-left mb-6 bg-gray-100 p-4 rounded text-sm overflow-auto max-h-48">
                <p className="font-mono text-gray-900 break-words">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.resetError}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-2 px-4 rounded-lg transition"
              >
                Go Home
              </button>
            </div>

            {isDev && (
              <p className="text-xs text-gray-500 mt-4">
                Check the browser console for more details.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
