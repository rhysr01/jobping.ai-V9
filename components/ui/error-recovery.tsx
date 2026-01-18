import { motion } from "framer-motion";
import { BrandIcons } from "./BrandIcons";
import CustomButton from "./CustomButton";
import { showToast } from "../../lib/toast";

interface ErrorRecoveryProps {
	error: string;
	onRetry?: () => void;
	suggestions?: string[];
	className?: string;
}

export function ErrorRecovery({
	error,
	onRetry,
	suggestions = [],
	className = ""
}: ErrorRecoveryProps) {
	const getErrorType = (error: string) => {
		const lowerError = error.toLowerCase();
		if (lowerError.includes('network') || lowerError.includes('connection')) {
			return 'network';
		}
		if (lowerError.includes('validation') || lowerError.includes('invalid')) {
			return 'validation';
		}
		if (lowerError.includes('rate limit') || lowerError.includes('too many')) {
			return 'rateLimit';
		}
		return 'general';
	};

	const getErrorIcon = (errorType: string) => {
		switch (errorType) {
			case 'network': return 'WifiOff';
			case 'validation': return 'AlertTriangle';
			case 'rateLimit': return 'Clock';
			default: return 'AlertCircle';
		}
	};

	const getDefaultSuggestions = (errorType: string) => {
		switch (errorType) {
			case 'network':
				return [
					'Check your internet connection',
					'Try refreshing the page',
					'Wait a moment and try again'
				];
			case 'validation':
				return [
					'Double-check your information',
					'Make sure all required fields are filled',
					'Check email format'
				];
			case 'rateLimit':
				return [
					'Wait a few minutes before trying again',
					'Try during off-peak hours',
					'Contact support if this persists'
				];
			default:
				return [
					'Try refreshing the page',
					'Clear your browser cache',
					'Contact support if the problem continues'
				];
		}
	};

	const errorType = getErrorType(error);
	const iconName = getErrorIcon(errorType);
	const IconComponent = BrandIcons[iconName as keyof typeof BrandIcons];
	const displaySuggestions = suggestions.length > 0 ? suggestions : getDefaultSuggestions(errorType);

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className={`text-center p-6 max-w-md mx-auto ${className}`}
		>
			{/* Error Icon */}
			<div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 rounded-full flex items-center justify-center">
				<IconComponent className="w-8 h-8 text-error" />
			</div>

			{/* Error Message */}
			<h3 className="text-lg font-semibold text-white mb-2">
				Something went wrong
			</h3>
			<p className="text-zinc-400 mb-4 leading-relaxed">
				{error}
			</p>

			{/* Suggestions */}
			<div className="text-left mb-6">
				<h4 className="text-sm font-semibold text-zinc-300 mb-3">
					What you can try:
				</h4>
				<ul className="space-y-2">
					{displaySuggestions.map((suggestion, index) => (
						<motion.li
							key={index}
							initial={{ opacity: 0, x: -10 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: index * 0.1 }}
							className="flex items-start gap-2 text-sm text-zinc-400"
						>
							<span className="text-brand-400 mt-1.5 flex-shrink-0">•</span>
							<span>{suggestion}</span>
						</motion.li>
					))}
				</ul>
			</div>

			{/* Action Buttons */}
			<div className="flex gap-3 justify-center">
				{onRetry && (
					<CustomButton
						variant="primary"
						size="sm"
						onClick={() => {
							showToast.info("Retrying...");
							onRetry();
						}}
					>
						Try Again
					</CustomButton>
				)}
				<CustomButton
					variant="secondary"
					size="sm"
					onClick={() => {
						showToast.success("Support email copied to clipboard");
						navigator.clipboard?.writeText("support@jobping.com");
					}}
				>
					Contact Support
				</CustomButton>
			</div>
		</motion.div>
	);
}

// Quick error boundary with recovery
import React from "react";

interface ErrorBoundaryState {
	hasError: boolean;
	error?: Error;
}

interface ErrorBoundaryProps {
	children: React.ReactNode;
	fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error('Error boundary caught an error:', error, errorInfo);
		showToast.error('Something went wrong. Please try refreshing the page.');
	}

	render() {
		if (this.state.hasError && this.state.error) {
			const FallbackComponent = this.props.fallback;

			if (FallbackComponent) {
				return (
					<FallbackComponent
						error={this.state.error}
						retry={() => this.setState({ hasError: false, error: undefined })}
					/>
				);
			}

			return (
				<ErrorRecovery
					error="An unexpected error occurred. We're working to fix this."
					onRetry={() => this.setState({ hasError: false, error: undefined })}
					suggestions={[
						'Refresh the page',
						'Try again in a few minutes',
						'Contact support if this persists'
					]}
				/>
			);
		}

		return this.props.children;
	}
}