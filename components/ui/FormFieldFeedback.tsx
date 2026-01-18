"use client";

import React from "react";
import { BrandIcons } from "./BrandIcons";
import { getHumanErrorMessage } from "@/lib/error-messages";

interface FormFieldErrorProps {
	error?: string;
	id?: string;
}

/**
 * Enhanced form field error component with smooth animations
 */
export function FormFieldError({ error, id }: FormFieldErrorProps) {
	if (!error) return null;

	// Convert technical errors to human-friendly messages
	const friendlyError = getHumanErrorMessage(error);

	return (
		<p
			id={id}
			className="mt-2 text-sm text-error flex items-center gap-2 font-medium animate-in slide-in-from-top-1 duration-200"
			role="alert"
			aria-live="polite"
		>
			<BrandIcons.AlertCircle className="w-4 h-4 flex-shrink-0" />
			{friendlyError}
		</p>
	);
}

interface FormFieldSuccessProps {
	message?: string;
	id?: string;
}

/**
 * Form field success indicator
 */
export function FormFieldSuccess({ message, id }: FormFieldSuccessProps) {
	if (!message) return null;

	return (
		<output
			id={id}
			className="mt-2 text-sm text-success flex items-center gap-2 font-medium animate-in slide-in-from-top-1 duration-200"
			aria-live="polite"
		>
			<BrandIcons.CheckCircle className="w-4 h-4 flex-shrink-0" />
			{message}
		</output>
	);
}

interface FormFieldHelperProps {
	helper?: string;
	characterCount?: number;
	maxLength?: number;
}

/**
 * Form field helper text with optional character count
 */
export function FormFieldHelper({
	helper,
	characterCount,
	maxLength,
}: FormFieldHelperProps) {
	if (!helper && (!characterCount || !maxLength)) return null;

	return (
		<div className="mt-2 flex items-center justify-between">
			{helper && <p className="text-xs text-zinc-500">{helper}</p>}
			{characterCount !== undefined && maxLength && (
				<p
					className={`text-xs ${characterCount > maxLength * 0.9 ? "text-warning" : "text-zinc-500"}`}
				>
					{characterCount}/{maxLength}
				</p>
			)}
		</div>
	);
}

/**
 * Standardized status indicator with consistent colors and icons
 */
interface StatusIndicatorProps {
	status: "success" | "error" | "warning" | "info";
	message: string;
	icon?: boolean;
	size?: "sm" | "md";
	className?: string;
}

export function StatusIndicator({
	status,
	message,
	icon = true,
	size = "sm",
	className = ""
}: StatusIndicatorProps) {
	const statusConfig = {
		success: {
			icon: BrandIcons.CheckCircle,
			color: "text-success",
			container: "bg-success/10 border border-success/20"
		},
		error: {
			icon: BrandIcons.AlertCircle,
			color: "text-error",
			container: "bg-error/10 border border-error/20"
		},
		warning: {
			icon: BrandIcons.AlertCircle,
			color: "text-warning",
			container: "bg-warning/10 border border-warning/20"
		},
		info: {
			icon: BrandIcons.Info,
			color: "text-info",
			container: "bg-info/10 border border-info/20"
		}
	};

	const config = statusConfig[status];
	const IconComponent = config.icon;
	const textSize = size === "sm" ? "text-sm" : "text-base";
	const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";

	return (
		<div className={`inline-flex items-center gap-2 rounded-md px-3 py-2 ${config.container} ${className}`}>
			{icon && <IconComponent className={`${iconSize} flex-shrink-0 ${config.color}`} />}
			<span className={`${textSize} font-medium ${config.color}`}>{message}</span>
		</div>
	);
}

/**
 * Toast-like notification component
 */
interface NotificationProps {
	type: "success" | "error" | "warning" | "info";
	title?: string;
	message: string;
	action?: React.ReactNode;
	onClose?: () => void;
	className?: string;
}

export function Notification({
	type,
	title,
	message,
	action,
	onClose,
	className = ""
}: NotificationProps) {
	const typeConfig = {
		success: {
			icon: BrandIcons.CheckCircle,
			color: "text-success",
			container: "bg-success/10 border-success/20"
		},
		error: {
			icon: BrandIcons.AlertCircle,
			color: "text-error",
			container: "bg-error/10 border-error/20"
		},
		warning: {
			icon: BrandIcons.AlertCircle,
			color: "text-warning",
			container: "bg-warning/10 border-warning/20"
		},
		info: {
			icon: BrandIcons.Info,
			color: "text-info",
			container: "bg-info/10 border-info/20"
		}
	};

	const config = typeConfig[type];
	const IconComponent = config.icon;

	return (
		<div className={`flex items-start gap-3 p-4 rounded-lg border ${config.container} ${className}`}>
			<IconComponent className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.color}`} />
			<div className="flex-1 min-w-0">
				{title && <h4 className={`font-semibold ${config.color} mb-1`}>{title}</h4>}
				<p className={`text-sm ${config.color}/80`}>{message}</p>
			</div>
			<div className="flex items-center gap-2 flex-shrink-0">
				{action}
				{onClose && (
					<button
						type="button"
						onClick={onClose}
						className={`p-1 rounded-md hover:bg-black/10 transition-colors ${config.color}/60 hover:${config.color}`}
						aria-label="Close notification"
					>
						<BrandIcons.X className="w-4 h-4" />
					</button>
				)}
			</div>
		</div>
	);
}
