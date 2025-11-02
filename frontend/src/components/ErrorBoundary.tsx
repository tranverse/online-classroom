import React from "react";

interface State {
  hasError: boolean;
  error?: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // You can log the error to an error reporting service here
    // console.error('ErrorBoundary caught:', error, info);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <h4 className="text-sm font-semibold text-red-800">
            Something went wrong
          </h4>
          <p className="text-xs text-red-700 mt-2">
            {this.state.error?.message}
          </p>
          <div className="mt-3">
            <button
              onClick={this.reset}
              className="px-3 py-1 text-sm bg-white border border-gray-200 rounded"
            >
              Close
            </button>
          </div>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}

export default ErrorBoundary;
