"use client";

import { Component, type ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";
import Button from "./ui/Button";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
	error?: Error;
	errorInfo?: React.ErrorInfo;
}

export default class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		// Log to console for development
		console.error("Error caught by boundary:", error, errorInfo);

		// Send to Sentry with full context
		Sentry.captureException(error, {
			contexts: {
				react: {
					componentStack: errorInfo.componentStack,
				},
			},
			tags: {
				errorBoundary: true,
				errorType: error.name,
			},
			extra: {
				errorInfo,
				errorMessage: error.message,
				errorStack: error.stack,
			},
			level: "error",
		});

		// Update state with error info for display
		this.setState({ errorInfo });
	}

	handleReset = () => {
		// Log recovery attempt
		Sentry.addBreadcrumb({
			message: "User attempted to recover from error boundary",
			level: "info",
		});

		this.setState({
			hasError: false,
			error: undefined,
			errorInfo: undefined,
		});
	};

	render() {
		if (this.state.hasError) {
			return (
				this.props.fallback || (
					<div className="min-h-screen flex items-center justify-center bg-black p-4">
						<div className="text-center max-w-md">
							<div className="mb-6">
								<svg
									className="w-16 h-16 mx-auto text-red-400"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									aria-hidden="true"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
									/>
								</svg>
							</div>
							<h2 className="text-2xl font-bold mb-4 text-white">
								Something went wrong
							</h2>
							<p className="text-content-400 mb-6">
								{this.state.error?.message ||
									"An unexpected error occurred. Please try again."}
							</p>
							{process.env.NODE_ENV === "development" &&
								this.state.errorInfo && (
									<details className="mb-6 text-left">
										<summary className="cursor-pointer text-content-300 mb-2">
											Error Details (Dev Only)
										</summary>
										<pre className="text-xs bg-content-900 p-4 rounded overflow-auto max-h-48">
											{this.state.errorInfo.componentStack}
										</pre>
									</details>
								)}
							<div className="flex gap-4 justify-center">
								<Button onClick={this.handleReset} variant="primary">
									Try again
								</Button>
								<Button
									onClick={() => window.location.reload()}
									variant="secondary"
								>
									Reload page
								</Button>
							</div>
							<p className="text-xs text-content-400 mt-6">
								If this problem persists, please contact support.
							</p>
						</div>
					</div>
				)
			);
		}

		return this.props.children;
	}
}
