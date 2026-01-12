"use client";

import { FormFieldError, FormFieldSuccess } from "../ui/FormFieldFeedback";

interface ContactInfoSectionProps {
	email: string;
	fullName: string;
	onEmailChange: (email: string) => void;
	onNameChange: (name: string) => void;
	emailValidation: {
		isValid: boolean;
		message: string;
	};
	nameValidation: {
		isValid: boolean;
		message: string;
	};
	isSubmitting: boolean;
}

export function ContactInfoSection({
	email,
	fullName,
	onEmailChange,
	onNameChange,
	emailValidation,
	nameValidation,
	isSubmitting,
}: ContactInfoSectionProps) {
	return (
		<div className="grid gap-6 sm:grid-cols-2">
			<div>
				<label
					htmlFor="email"
					className="block text-base font-bold text-white mb-3"
				>
					Email Address *
				</label>
				<input
					id="email"
					type="email"
					value={email}
					onChange={(e) => onEmailChange(e.target.value)}
					disabled={isSubmitting}
					className="w-full px-4 py-3 rounded-xl border-2 border-white/20 bg-white/5 text-white placeholder:text-content-secondary focus:border-brand-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					placeholder="your.email@university.edu"
					required
					autoComplete="email"
				/>
				{email && (
					<div className="mt-2">
						{emailValidation.isValid ? (
							<FormFieldSuccess message="Valid email address" />
						) : (
							<FormFieldError error={emailValidation.message} />
						)}
					</div>
				)}
			</div>

			<div>
				<label
					htmlFor="fullName"
					className="block text-base font-bold text-white mb-3"
				>
					Full Name *
				</label>
				<input
					id="fullName"
					type="text"
					value={fullName}
					onChange={(e) => onNameChange(e.target.value)}
					disabled={isSubmitting}
					className="w-full px-4 py-3 rounded-xl border-2 border-white/20 bg-white/5 text-white placeholder:text-content-secondary focus:border-brand-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					placeholder="John Smith"
					required
					autoComplete="name"
				/>
				{fullName && (
					<div className="mt-2">
						{nameValidation.isValid ? (
							<FormFieldSuccess message="Looks good!" />
						) : (
							<FormFieldError error={nameValidation.message} />
						)}
					</div>
				)}
			</div>
		</div>
	);
}