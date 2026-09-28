import React from "react";
import { logApplicationError } from "../lib/observability.js";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    logApplicationError(error, {
      operation: "REACT_RENDER_CRASH",
      errorCode: "UI_RENDER_ERROR",
      details: { componentStack: errorInfo?.componentStack }
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 my-6 max-w-lg mx-auto bg-stone-900 border border-stone-800 rounded-2xl text-center shadow-xl">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold text-xl">
            !
          </div>
          <h2 className="text-lg font-bold text-stone-100 mb-1">Section Temporarily Unavailable</h2>
          <p className="text-xs text-stone-400 mb-5">
            An unforeseen rendering glitch occurred in this tab. Other cafe modules continue running normally.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Retry Tab
            </button>
            <button
              onClick={this.handleReload}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium rounded-xl transition cursor-pointer"
            >
              Reload POS
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
