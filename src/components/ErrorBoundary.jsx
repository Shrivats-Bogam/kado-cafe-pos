import React from "react";
import { logApplicationError } from "../lib/observability.js";

/**
 * Section & Tab Level Error Boundary
 * Prevents a localized rendering glitch from taking down the entire application.
 */
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
      details: { 
        componentStack: errorInfo?.componentStack,
        boundaryName: this.props.name || "DefaultSection"
      }
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (typeof this.props.onReset === "function") {
      this.props.onReset();
    }
  };

  handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const title = this.props.name ? `${this.props.name} Temporarily Unavailable` : "Section Temporarily Unavailable";

      return (
        <div className="p-8 my-6 max-w-lg mx-auto bg-stone-900 border border-stone-800 rounded-2xl text-center shadow-xl">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold text-xl">
            !
          </div>
          <h2 className="text-lg font-bold text-stone-100 mb-1">{title}</h2>
          <p className="text-xs text-stone-400 mb-5">
            An unforeseen rendering glitch occurred in this module. Other cafe operations continue running normally.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Retry Module
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

/**
 * Lightweight Inline Widget Error Boundary
 * Protects list items, KDS cards, and table grid tiles from crashing parent lists.
 */
export class WidgetErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logApplicationError(error, {
      operation: "WIDGET_RENDER_CRASH",
      errorCode: "WIDGET_ERROR",
      details: { 
        widgetName: this.props.name || "Widget",
        componentStack: errorInfo?.componentStack
      }
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="p-3 my-1 rounded-xl bg-stone-950/80 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between gap-2 shadow-sm">
          <span className="truncate">⚠️ {this.props.name || "Widget"} unavailable</span>
          <button
            onClick={this.handleReset}
            className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 text-[10px] font-bold rounded-lg cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
