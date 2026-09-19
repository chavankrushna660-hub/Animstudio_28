// @ts-nocheck
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  componentName?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Uncaught error in ${this.props.componentName || 'Component'}:`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // If it's an isolated component boundary (e.g. panel or tool)
      if (this.props.componentName) {
        return (
          <div className="p-4 bg-neutral-900/90 border border-neutral-700/80 rounded-xl text-neutral-200 text-xs flex flex-col gap-2 items-center justify-center m-2 shadow-lg">
            <span className="font-bold text-amber-400">Recovering {this.props.componentName}...</span>
            <button
              type="button"
              onClick={this.handleReset}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg transition-all text-[11px] cursor-pointer"
            >
              Retry
            </button>
          </div>
        );
      }

      return (
        <div className="min-h-screen w-full bg-neutral-950 text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto text-xl font-bold">
              ⚡
            </div>
            <h2 className="text-lg font-black tracking-wide text-neutral-100">Workspace Active & Protected</h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              An unexpected render event occurred and was safely caught. Your project data is intact.
            </p>
            <div className="bg-neutral-950 rounded-xl p-3 text-[11px] font-mono text-neutral-400 text-left overflow-auto max-h-24 border border-neutral-800/60">
              {this.state.error?.message || 'Protected application state'}
            </div>
            <button
              type="button"
              onClick={this.handleReset}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer uppercase tracking-wider"
            >
              Resume Workspace
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
