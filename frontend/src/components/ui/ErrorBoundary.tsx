'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * React Error Boundary Component
 * Catches JavaScript errors in child component tree and displays fallback UI
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        this.setState({ errorInfo });

        // Log error to console in development
        console.error('[ErrorBoundary] Caught error:', error);
        console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

        // Call custom error handler if provided
        this.props.onError?.(error, errorInfo);

        // In production, you could send to error tracking service here
        // e.g., Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
    }

    handleRetry = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // Custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 p-6">
                    <AlertTriangle className="mb-4 h-12 w-12 text-red-400" />
                    <h2 className="mb-2 text-lg font-semibold text-red-300">
                        Something went wrong
                    </h2>
                    <p className="mb-4 max-w-md text-center text-sm text-gray-400">
                        An error occurred while rendering this component.
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <span className="mt-2 block font-mono text-xs text-red-400/80">
                                {this.state.error.message}
                            </span>
                        )}
                    </p>
                    <button
                        onClick={this.handleRetry}
                        className="flex items-center gap-2 rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/30"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Hook-friendly wrapper for Error Boundary with Suspense-like API
 */
export function withErrorBoundary<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    fallback?: ReactNode
): React.FC<P> {
    const WithErrorBoundary: React.FC<P> = (props) => (
        <ErrorBoundary fallback={fallback}>
            <WrappedComponent {...props} />
        </ErrorBoundary>
    );

    WithErrorBoundary.displayName = `WithErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

    return WithErrorBoundary;
}

/**
 * Minimal Error Boundary for sections that should fail silently
 */
export class SilentErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): { hasError: boolean } {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('[SilentErrorBoundary] Caught error:', error.message);
    }

    render(): ReactNode {
        if (this.state.hasError) {
            return null; // Render nothing on error
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
