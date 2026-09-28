import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
    this.handleRetry = this.handleRetry.bind(this);
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleRetry() {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 my-6 max-w-2xl mx-auto bg-white rounded-3xl border border-rose-200 shadow-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 font-black">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-zinc-900 mb-1">
            {this.props.fallbackTitle || 'Unable to Display This Module'}
          </h2>
          <p className="text-xs text-zinc-500 mb-6 max-w-md mx-auto leading-relaxed">
            {this.props.fallbackMessage ||
              'A rendering issue occurred while displaying this data. Your session remains secure and no data was lost.'}
          </p>
          {this.state.error?.message && (
            <div className="p-3 mb-6 bg-zinc-50 rounded-xl border border-zinc-200 text-left overflow-x-auto text-[11px] font-mono text-zinc-600 max-h-24">
              {this.state.error.message}
            </div>
          )}
          <button
            type="button"
            onClick={this.handleRetry}
            className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold transition inline-flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Reloading Component</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
