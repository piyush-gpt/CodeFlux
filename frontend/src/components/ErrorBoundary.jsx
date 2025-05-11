import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log error to your error reporting service
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <div className="bg-gray-800 p-4 rounded-lg mb-4">
              <p className="text-red-400 mb-2">{this.state.error?.toString()}</p>
              {process.env.NODE_ENV === 'development' && (
                <pre className="text-sm text-gray-400 overflow-auto">
                  {this.state.errorInfo?.componentStack}
                </pre>
              )}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
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