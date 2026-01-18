"use client";

import { motion } from "framer-motion";

interface SimplifiedAgeVerificationProps {
	ageVerified: boolean;
	termsAccepted: boolean;
	gdprConsent: boolean;
	onAgeVerifiedChange: (verified: boolean) => void;
	onTermsAcceptedChange: (accepted: boolean) => void;
	onGdprConsentChange: (consent: boolean) => void;
	disabled?: boolean;
	showErrors?: boolean;
}

export function AgeVerificationSection({
	ageVerified,
	termsAccepted,
	gdprConsent,
	onAgeVerifiedChange,
	onTermsAcceptedChange,
	onGdprConsentChange,
	disabled = false,
	showErrors = false,
}: SimplifiedAgeVerificationProps) {
	const ageVerificationError = showErrors && !ageVerified
		? "Please confirm you are at least 16 years old"
		: undefined;

	const termsError = showErrors && !termsAccepted
		? "Please accept the terms of service to continue"
		: undefined;

	const gdprError = showErrors && !gdprConsent
		? "Please accept the privacy policy to continue"
		: undefined;

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.6, delay: 0.2 }}
			className="space-y-4"
		>
			{/* Legal Requirements - Streamlined */}
			<div className="bg-gradient-to-br from-zinc-900/60 via-zinc-900/40 to-zinc-800/60 backdrop-blur-sm border border-zinc-700/50 rounded-2xl p-6">
				<h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
					<span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
						✓
					</span>
					Legal Requirements
				</h3>

				<div className="space-y-5">
					{/* Age Verification - Single checkbox */}
					<div className="flex items-start gap-4">
						<input
							type="checkbox"
							id="age-verification"
							checked={ageVerified}
							onChange={(e) => onAgeVerifiedChange(e.target.checked)}
							disabled={disabled}
							className="mt-1.5 w-5 h-5 text-brand-600 bg-zinc-900 border-zinc-700 rounded focus:ring-brand-500 focus:ring-2 transition-colors"
							aria-describedby={ageVerificationError ? "age-verification-error" : undefined}
							aria-invalid={!!ageVerificationError}
						/>
						<div className="flex-1">
							<label
								htmlFor="age-verification"
								className="text-sm font-medium text-white cursor-pointer leading-relaxed"
							>
								I confirm I am at least 16 years old
							</label>
							{ageVerificationError && (
								<p id="age-verification-error" className="mt-2 text-sm text-error flex items-center gap-2 font-medium" role="alert">
									<span className="text-error">⚠️</span>
									{ageVerificationError}
								</p>
							)}
						</div>
					</div>

					{/* Terms & Privacy - Single checkbox */}
					<div className="flex items-start gap-4">
						<input
							type="checkbox"
							id="terms-privacy"
							checked={termsAccepted && gdprConsent}
							onChange={(e) => {
								onTermsAcceptedChange(e.target.checked);
								onGdprConsentChange(e.target.checked);
							}}
							disabled={disabled}
							className="mt-1.5 w-5 h-5 text-brand-600 bg-zinc-900 border-zinc-700 rounded focus:ring-brand-500 focus:ring-2 transition-colors"
							aria-describedby={(termsError || gdprError) ? "legal-error" : "legal-help"}
							aria-invalid={!!(termsError || gdprError)}
						/>
						<div className="flex-1">
							<label
								htmlFor="terms-privacy"
								className="text-sm font-medium text-white cursor-pointer leading-relaxed"
							>
								I accept the{" "}
								<a
									href="/legal/terms"
									target="_blank"
									rel="noopener noreferrer"
									className="text-brand-400 hover:text-brand-300 underline decoration-brand-400/30 underline-offset-4 hover:decoration-brand-300/50 transition-colors"
								>
									Terms of Service
								</a>{" "}
								and{" "}
								<a
									href="/legal/privacy"
									target="_blank"
									rel="noopener noreferrer"
									className="text-brand-400 hover:text-brand-300 underline decoration-brand-400/30 underline-offset-4 hover:decoration-brand-300/50 transition-colors"
								>
									Privacy Policy
								</a>
							</label>
							{(termsError || gdprError) && (
								<p id="legal-error" className="mt-2 text-sm text-error flex items-center gap-2 font-medium" role="alert">
									<span className="text-error">⚠️</span>
									{termsError || gdprError}
								</p>
							)}
							<p id="legal-help" className="mt-3 text-xs text-zinc-400 leading-relaxed">
								By accepting, you agree to our terms and consent to processing your data for job matching purposes under GDPR.
							</p>
						</div>
					</div>
				</div>
			</div>
		</motion.div>
	);
}