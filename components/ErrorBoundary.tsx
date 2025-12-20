import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to console (placeholder for future error tracking service)
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // TODO: Send error to error tracking service (e.g., Sentry, LogRocket)
    // Example: errorTrackingService.logError(error, errorInfo);
  }

  handleReload = (): void => {
    // Reset error state and reload the page
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            textAlign: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
        >
          <div
            style={{
              maxWidth: '600px',
              padding: '2rem',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              backgroundColor: '#fff'
            }}
          >
            <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#d32f2f' }}>
              Something went wrong
            </h1>
            <p style={{ marginBottom: '1.5rem', color: '#666' }}>
              An unexpected error occurred. Please try reloading the page.
            </p>
            {this.state.error && (
              <details style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', color: '#1976d2' }}>
                  Error details
                </summary>
                <pre
                  style={{
                    marginTop: '0.5rem',
                    padding: '1rem',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                    overflow: 'auto',
                    fontSize: '0.875rem',
                    color: '#d32f2f'
                  }}
                >
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <button
              onClick={this.handleReload}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1rem',
                cursor: 'pointer',
                fontWeight: 500
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#1565c0';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#1976d2';
              }}
              onFocus={(e) => {
                e.currentTarget.style.backgroundColor = '#1565c0';
              }}
              onBlur={(e) => {
                e.currentTarget.style.backgroundColor = '#1976d2';
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
