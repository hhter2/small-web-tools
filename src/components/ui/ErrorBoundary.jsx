import React from 'react';
import Card from './Card';
import Button from './Button';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled Tool Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card variant="tool">
          <div className="flex flex-col items-center justify-center p-8 text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center font-bold text-xl">
              !
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-text-main">Failed to load component</h3>
              <p className="text-xs text-text-muted max-w-md">
                {this.state.error?.message || 'An unexpected error occurred while rendering this tool.'}
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              Reload Page
            </Button>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
