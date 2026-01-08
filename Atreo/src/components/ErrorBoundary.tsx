import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '../lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Use logger instead of console for production safety
    logger.error('React Error Boundary caught an error', {
      error: error.toString(),
      componentStack: errorInfo.componentStack,
    });

    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="bg-card rounded-lg shadow-lg p-8 max-w-md w-full border border-border">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-destructive/10 mb-4">
                <svg
                  className="h-6 w-6 text-destructive"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Something went wrong
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                We encountered an unexpected error. Please try refreshing the page.
              </p>

              {/* Show error details in development mode only */}
              {import.meta.env.DEV && this.state.error && (
                <details className="text-left mb-4 bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-border">
                  <summary className="cursor-pointer text-xs font-medium text-foreground mb-2">
                    Error Details (Development Only)
                  </summary>
                  <div className="text-xs text-muted-foreground space-y-2">
                    <div>
                      <strong className="block text-foreground mb-1">Error:</strong>
                      <code className="block bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto text-xs">
                        {this.state.error.toString()}
                      </code>
                    </div>
                    {this.state.errorInfo && (
                      <div>
                        <strong className="block text-foreground mb-1">Component Stack:</strong>
                        <code className="block bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-32 text-xs">
                          {this.state.errorInfo.componentStack}
                        </code>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    this.setState({ hasError: false, error: null, errorInfo: null });
                  }}
                  className="inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md shadow-sm text-foreground bg-background hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

