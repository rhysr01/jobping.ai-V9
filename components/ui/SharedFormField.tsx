"use client";

import React from "react";
import { motion } from "framer-motion";
import {
	FormFieldError,
	FormFieldSuccess,
} from "./FormFieldFeedback";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface SharedFormFieldProps {
	id: string;
	label: string;
	required?: boolean;
	type?: string;
	variant?: "input" | "textarea" | "switch" | "checkbox" | "radio-group";
	value: string | boolean;
	onChange: (value: string | boolean) => void;
	onBlur?: () => void;
	placeholder?: string;
	error?: string;
	success?: string;
	helpText?: string;
	autoComplete?: string;
	inputMode?: "text" | "email" | "tel" | "url" | "numeric" | "decimal";
	disabled?: boolean;
	className?: string;
	options?: { value: string; label: string }[]; // For radio-group
}

export const SharedFormField = React.memo(function SharedFormField({
	id,
	label,
	required = false,
	type = "text",
	variant = "input",
	value,
	onChange,
	onBlur,
	placeholder,
	error,
	success,
	helpText,
	autoComplete,
	inputMode,
	disabled = false,
	className = "",
	options = [],
}: SharedFormFieldProps) {
	return (
		<div className={className}>
			<label
				htmlFor={id}
				className="block text-base sm:text-lg font-bold text-white mb-2 sm:mb-3 flex items-center gap-2"
			>
				<span>{label}</span>
				{required && (
					<span className="text-error text-sm" aria-hidden="true">*</span>
				)}
			</label>

			{helpText && (
				<p id={`${id}-help`} className="text-sm font-medium text-zinc-300 mb-3 sm:mb-4 leading-relaxed">
					{helpText}
				</p>
			)}

			{variant === "textarea" ? (
				<Textarea
					id={id}
					value={value as string}
					onChange={(e) => onChange(e.target.value)}
					onBlur={onBlur}
					placeholder={placeholder}
					autoComplete={autoComplete}
					disabled={disabled}
					className={`w-full px-4 sm:px-6 py-4 sm:py-5 min-h-[120px] bg-black/50 border-2 rounded-lg text-white placeholder-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/30 focus:ring-offset-2 focus:ring-offset-black transition-all text-base sm:text-lg font-medium backdrop-blur-sm touch-manipulation resize-none ${
						value
							? success && !error
								? "border-green-500/60 shadow-md"
								: error
									? "border-red-500/60 shadow-md"
									: "border-zinc-700"
							: "border-zinc-700 hover:border-zinc-600"
					}`}
					aria-invalid={!!error}
					aria-describedby={
						error
							? `${id}-error ${helpText ? `${id}-help` : ""}`
							: success
								? `${id}-success ${helpText ? `${id}-help` : ""}`
								: helpText
									? `${id}-help`
									: undefined
					}
					aria-required={required}
				/>
			) : variant === "switch" ? (
				<div className="flex items-center space-x-2">
					<Switch
						id={id}
						checked={value as boolean}
						onCheckedChange={(checked) => onChange(checked)}
						disabled={disabled}
						className={className}
					/>
					<span className="text-sm text-zinc-300">{label}</span>
				</div>
			) : variant === "checkbox" ? (
				<div className="flex items-center space-x-2">
					<Checkbox
						id={id}
						checked={value as boolean}
						onCheckedChange={(checked) => onChange(checked)}
						disabled={disabled}
						className={className}
					/>
					<span className="text-sm text-zinc-300">{placeholder || label}</span>
				</div>
			) : variant === "radio-group" && options.length > 0 ? (
				<RadioGroup
					value={value as string}
					onValueChange={(newValue) => onChange(newValue)}
					disabled={disabled}
					className={`space-y-3 ${className}`}
				>
					{options.map((option) => (
						<div key={option.value} className="flex items-center space-x-2">
							<RadioGroupItem value={option.value} id={`${id}-${option.value}`} />
							<label
								htmlFor={`${id}-${option.value}`}
								className="text-sm text-zinc-300 cursor-pointer"
							>
								{option.label}
							</label>
						</div>
					))}
				</RadioGroup>
			) : (
				<input
					id={id}
					type={type}
					value={value as string}
					onChange={(e) => onChange(e.target.value)}
					onBlur={onBlur}
					placeholder={placeholder}
					autoComplete={autoComplete}
					inputMode={inputMode}
					disabled={disabled}
					className={`w-full px-4 sm:px-6 py-4 sm:py-5 min-h-[56px] bg-black/50 border-2 rounded-lg text-white placeholder-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/30 focus:ring-offset-2 focus:ring-offset-black transition-all text-base sm:text-lg font-medium backdrop-blur-sm touch-manipulation ${
						value
							? success && !error
								? "border-green-500/60 shadow-md"
								: error
									? "border-red-500/60 shadow-md"
									: "border-zinc-700"
							: "border-zinc-700 hover:border-zinc-600"
					}`}
					aria-invalid={!!error}
					aria-describedby={
						error
							? `${id}-error ${helpText ? `${id}-help` : ""}`
							: success
								? `${id}-success ${helpText ? `${id}-help` : ""}`
								: helpText
									? `${id}-help`
									: undefined
					}
					aria-required={required}
				/>
			)}

			{/* Error/Success Messages */}
			{(variant === "switch" || variant === "checkbox" ? true : value) && (
				success && !error ? (
					<motion.div
						initial={{ opacity: 0, scale: 0.8, y: -10 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						transition={{
							type: "spring",
							stiffness: 400,
							damping: 25,
							duration: 0.4
						}}
					>
						<FormFieldSuccess message={success} id={`${id}-success`} />
					</motion.div>
				) : error ? (
					<motion.div
						initial={{ opacity: 0, x: -10 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.3 }}
					>
						<FormFieldError error={error} id={`${id}-error`} />
					</motion.div>
				) : null
			)}
		</div>
	);
});