"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * React ErrorBoundary that catches WebGL/rendering crashes.
 * Displays a graceful fallback instead of a white screen.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return <DefaultErrorFallback error={this.state.error} onReset={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}

function DefaultErrorFallback({ error, onReset }: { error?: Error; onReset?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 p-8 text-center">
      <AlertTriangle className="mb-3 h-8 w-8 text-amber-500" />
      <h3 className="mb-1 text-sm font-semibold">Something went wrong</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        {error?.message?.includes("WebGL")
          ? "Your browser doesn't support WebGL. Try a different browser for 3D visualization."
          : "An unexpected error occurred while rendering."}
      </p>
      <button
        onClick={() => onReset?.()}
        className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}
