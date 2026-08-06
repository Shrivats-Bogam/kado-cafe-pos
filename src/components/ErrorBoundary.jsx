import React from "react";
import { AlertOctagon, RotateCcw, Home } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Kado Cafe ErrorBoundary caught an exception:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = window.location.origin + window.location.pathname;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-1">
              <AlertOctagon size={28} />
            </div>
            
            <h2 className="font-serif text-xl font-bold text-stone-50">Something went wrong</h2>
            <p className="text-xs text-stone-400 leading-relaxed">
              An unexpected error occurred in Kado Cafe. Your data is safe in local storage. Please try reloading or returning to the dashboard.
            </p>

            <div className="flex gap-2 w-full mt-2">
              <button
                type="button"
                onClick={this.handleHome}
                className="flex-1 min-h-[44px] rounded-xl border border-stone-700 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                <Home size={15} />
                <span>Dashboard</span>
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition"
              >
                <RotateCcw size={15} />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
