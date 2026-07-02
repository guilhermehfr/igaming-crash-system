import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('React Error Boundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-screen items-center justify-center bg-deep-slate text-white">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-loss-red">Something went wrong</h1>
              <p className="mt-2 text-slate-400">Please refresh the page to continue.</p>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
