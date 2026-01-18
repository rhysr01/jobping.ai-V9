"use client";

import { motion } from "framer-motion";
import React from "react";
import { SharedFormField } from "../ui/SharedFormField";
import { showToast } from "../../lib/toast";
import type { SignupFormData } from "./types";

interface Step1FreeBasicsProps {
	formData: SignupFormData;
	setFormData: (updates: Partial<SignupFormData>) => void;
	touchedFields: Set<string>;
	setTouchedFields: React.Dispatch<React.SetStateAction<Set<string>>>;
	fieldErrors: Record<string, string>;
	setFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
	announce: (message: string, politeness?: "polite" | "assertive") => void;
	loading: boolean;
	setStep: (step: number) => void;
	emailValidation: { isValid: boolean; error?: string };
	shouldShowError: (
		fieldName: string,
		hasValue: boolean,
		isValid: boolean,
	) => boolean;
	getDisabledMessage: (stepNumber: number) => string;
}

export const Step1FreeBasics = React.memo(function Step1FreeBasics({
	formData,
	setFormData,
	touchedFields: _touchedFields,
	setTouchedFields,
	fieldErrors,
	setFieldErrors,
	announce,
	loading,
	setStep,
	emailValidation,
	shouldShowError,
	getDisabledMessage,
}: Step1FreeBasicsProps) {

	const handleEmailChange = (value: string | boolean) => {
		setFormData({ ...formData, email: typeof value === 'string' ? value : '' });
		setFieldErrors((prev) => {
			const next = { ...prev };
			delete next.email;
			return next;
		});
	};


	// Keyboard navigation enhancement
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !loading && isStepValid) {
			e.preventDefault();
			setStep(2);
		}
	};

	const handleEmailBlur = () => {
		setTouchedFields((prev) => new Set(prev).add("email"));
		if (emailValidation.error || fieldErrors.email) {
			announce(
				fieldErrors.email || emailValidation.error || "",
				"assertive",
			);
		} else if (emailValidation.isValid) {
			announce("Email address is valid", "polite");
			showToast.success("Email verified! ✓");
		}
	};


	// Use proper navigation validation instead of local validation
	const isStepValid = formData.fullName.trim() && formData.email.trim() && emailValidation.isValid;

	return (
		<motion.div
			key="step1"
			initial={{ opacity: 0, x: 20 }}
			animate={{ opacity: 1, x: 0 }}
			exit={{ opacity: 0, x: -20 }}
			transition={{ duration: 0.4 }}
			className="space-y-6 sm:space-y-8 md:space-y-10"
			role="region"
			aria-labelledby="step1-heading"
			onKeyDown={handleKeyDown}
		>
			<div className="mb-6 sm:mb-8">
				<h2 id="step1-heading" className="text-display-md font-black text-white mb-2 sm:mb-3 bg-gradient-to-r from-white to-zinc-200 bg-clip-text text-transparent">
					Get your matches
				</h2>
				<p className="text-base sm:text-lg font-medium text-zinc-100 leading-relaxed">
					Enter your email to receive 5 personalized job matches instantly
				</p>
				<div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
					<span className="text-sm font-medium text-emerald-200">⚡ Free • Instant • No commitment</span>
				</div>
			</div>

			<div className="space-y-6">
				<div className="max-w-md mx-auto">
					<SharedFormField
						id="fullName"
						label="What's your name?"
						required
						type="text"
						value={formData.fullName}
						onChange={(value) => {
							setFormData({ ...formData, fullName: typeof value === 'string' ? value : '' });
							setFieldErrors((prev) => {
								const next = { ...prev };
								delete next.fullName;
								return next;
							});
						}}
						onBlur={() => {
							setTouchedFields((prev) => new Set(prev).add("fullName"));
						}}
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								e.preventDefault();
								const emailInput = document.getElementById('email');
								emailInput?.focus();
							}
						}}
						placeholder="John Smith"
						error={fieldErrors.fullName || (shouldShowError("fullName", formData.fullName.length > 0, formData.fullName.trim().length >= 2) ? "Name is required" : undefined)}
						success={formData.fullName.length > 0 && formData.fullName.trim().length >= 2 ? "Looks good!" : undefined}
						autoComplete="name"
						inputMode="text"
						autoFocus
					/>

					<SharedFormField
						id="email"
						label="Enter your email"
						required
						type="email"
						value={formData.email}
						onChange={handleEmailChange}
						onBlur={handleEmailBlur}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && isStepValid && !loading) {
								e.preventDefault();
								setStep(2);
							}
						}}
						placeholder="you@example.com"
						helpText="Get 5 instant job matches - no spam, no commitment"
						error={fieldErrors.email || (shouldShowError("email", formData.email.length > 0, emailValidation.isValid) ? emailValidation.error : undefined)}
						success={formData.email.length > 0 && emailValidation.isValid ? "Perfect! ✓" : undefined}
						autoComplete="email"
						inputMode="email"
					/>
				</div>
			</div>

			{/* Spacer for sticky navigation */}
			<div className="h-32" />

			{/* Mobile Navigation */}
			<div className="flex justify-center mt-8">
				<button
					onClick={() => {
						console.log('Button clicked');
						// setStep(2);
					}}
					disabled={!isStepValid || loading}
					className="px-6 py-3 bg-blue-500 text-white rounded disabled:opacity-50"
				>
					{isStepValid ? "Continue" : getDisabledMessage(1)}
				</button>
			</div>
		</motion.div>
	);
});