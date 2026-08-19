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
        <div style={{ padding: "40px", fontFamily: "sans-serif", textAlign: "center", backgroundColor: "#fff5f5", color: "#c53030", borderRadius: "8px", margin: "20px" }}>
          <h2 style={{ fontSize: "24px", marginBottom: "12px" }}>Something went wrong</h2>
          <p style={{ marginBottom: "20px" }}>An unforeseen error occurred in this section of Kado Cafe POS.</p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button onClick={this.handleReset} style={{ padding: "10px 18px", backgroundColor: "#3182ce", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>
              Try Again
            </button>
            <button onClick={this.handleReload} style={{ padding: "10px 18px", backgroundColor: "#e2e8f0", color: "#2d3748", border: "none", borderRadius: "6px", cursor: "pointer" }}>
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
