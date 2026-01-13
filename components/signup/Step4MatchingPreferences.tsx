"use client";

import { motion } from "framer-motion";
import React from "react";
import { FormFieldHelper } from "../ui/FormFieldFeedback";
import { AgeVerificationSection } from "./AgeVerificationSection";
import { COMMON_SKILLS, COMPANY_SIZES, INDUSTRIES } from "./constants";
import type { SignupFormData } from "./types";

interface Step4MatchingPreferencesProps {
	formData: SignupFormData;
	setFormData: React.Dispatch<React.SetStateAction<SignupFormData>>;
	loading: boolean;
	setStep: (step: number) => void;
	toggleArray: (arr: string[], value: string) => string[];
	handleSubmit: () => void;
}

export const Step4MatchingPreferences = React.memo(function Step4MatchingPreferences({
	formData,
	setFormData,
	loading,
	setStep,
	toggleArray,
	handleSubmit,
}: Step4MatchingPreferencesProps) {
	return (
		<motion.div
			key="step4"
			initial={{ opacity: 0, x: 20 }}
			animate={{ opacity: 1, x: 0 }}
			exit={{ opacity: 0, x: -20 }}
			transition={{ duration: 0.4 }}
			className="relative"
		>
			<div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-brand-500/20 bg-gradient-to-br from-brand-500/10 via-[#0d0425]/45 to-brand-700/15 px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8">
				<div
					className="pointer-events-none absolute -top-28 right-8 h-52 w-52 rounded-full bg-brand-500/25 blur-[120px] hidden sm:block"
					aria-hidden="true"
				/>
				<div
					className="pointer-events-none absolute -bottom-24 left-6 h-48 w-48 rounded-full bg-brand-700/20 blur-3xl hidden sm:block"
					aria-hidden="true"
				/>
				<div
					className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(136,84,255,0.12),transparent_60%)]"
					aria-hidden="true"
				/>
				<div className="relative z-10 space-y-6 sm:space-y-8 md:space-y-10">
					<div className="text-center mb-6 sm:mb-8">
						<h2 className="text-2xl sm:text-3xl font-black text-white mb-2 bg-gradient-to-r from-white to-zinc-200 bg-clip-text text-transparent">
							Fine-tune Your Matches
						</h2>
						<p className="text-sm sm:text-base text-zinc-200 mb-4 leading-relaxed">
							Optional - Adding these preferences improves match accuracy by up
							to 40%
						</p>
						<motion.button
							type="button"
							onClick={() => {
								if (formData.gdprConsent) {
									handleSubmit();
								} else {
									// Focus on GDPR consent if not accepted
									const gdprCheckbox = document.getElementById("gdpr-consent") as HTMLInputElement;
									if (gdprCheckbox) {
										gdprCheckbox.focus();
										gdprCheckbox.scrollIntoView({
											behavior: "smooth",
											block: "center",
										});
									}
								}
							}}
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
							className="text-zinc-500 hover:text-brand-300 text-sm transition-colors underline underline-offset-4"
						>
							Skip optional fields to see matches now →
						</motion.button>
					</div>

					{/* Age Verification and Terms - Required before submission */}
					<AgeVerificationSection
						ageVerified={true}
						termsAccepted={true}
						gdprConsent={true}
						onAgeVerifiedChange={( _verified ) =>
							() => {}
						}
						onTermsAcceptedChange={( _accepted ) =>
							() => {}
						}
						onGdprConsentChange={( _consent ) =>
							() => {}
						}
						disabled={loading}
						showErrors={!true || !true || !true}
					/>

					{/* GDPR Consent - Required before submission */}
					<div className="space-y-4">
						<h3 className="text-xl font-bold text-white">
							Industry Preferences
						</h3>
						<p className="text-sm text-zinc-200">
							Select industries you're interested in (optional)
						</p>
						<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
							{INDUSTRIES.map((industry) => (
								<motion.button
									key={industry}
									type="button"
									onClick={() =>
										setFormData({
											...formData,
											industries: toggleArray(formData.industries, industry),
										})
									}
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
									className={`px-3 py-2.5 rounded-lg border-2 transition-all font-medium text-sm ${
										formData.industries.includes(industry)
											? "border-brand-500 bg-gradient-to-r from-brand-500/20 to-brand-700/10 text-white"
											: "border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:border-brand-500/40 hover:bg-zinc-900/80"
									}`}
								>
									{industry}
								</motion.button>
							))}
						</div>
						{formData.industries.length > 0 && (
							<p className="text-sm text-zinc-200">
								<span className="font-bold text-brand-200">
									{formData.industries.length}
								</span>{" "}
								industries selected
							</p>
						)}
					</div>

					{/* Company Size Preference */}
					<div className="space-y-4">
						<h3 className="text-xl font-bold text-white">
							Company Size Preference
						</h3>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							{COMPANY_SIZES.map((size) => (
								<motion.button
									key={size.value}
									type="button"
									onClick={() =>
										setFormData({
											...formData,
											companySizePreference: size.value,
										})
									}
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
									className={`px-4 py-4 rounded-xl border-2 transition-all font-semibold text-left ${
										formData.companySizePreference === size.value
											? "border-brand-500 bg-gradient-to-br from-brand-500/20 to-brand-700/10 text-white shadow-glow-subtle"
											: "border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:border-brand-500/40 hover:bg-zinc-900/80"
									}`}
								>
									<div className="flex items-center gap-3">
										<span className="text-2xl">{size.emoji}</span>
										<span className="font-bold">{size.label}</span>
									</div>
								</motion.button>
							))}
						</div>
					</div>

					{/* Career Keywords */}
					<div className="space-y-4">
						<h3 className="text-xl font-bold text-white">Career Keywords</h3>
						<p className="text-sm text-zinc-400">
							Describe what you're looking for in your own words (optional)
						</p>
						<p className="text-sm text-zinc-400">
							Examples: "customer-facing", "data-driven", "creative
							problem-solving", "client interaction", "analytical work"
						</p>
						<textarea
							id="career-keywords"
							value={formData.careerKeywords}
							onChange={(e) =>
								setFormData({
									...formData,
									careerKeywords: e.target.value,
								})
							}
							placeholder="e.g., customer-facing roles, data-driven positions, creative problem-solving, client interaction..."
							className="w-full px-4 py-3 rounded-xl border-2 border-zinc-600 bg-zinc-900/70 text-white placeholder-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/20 transition-colors resize-none"
							rows={3}
							maxLength={200}
							aria-describedby="career-keywords-helper"
						/>
						<div
							id="career-keywords-helper"
							className="flex items-center justify-between mt-2"
						>
							<FormFieldHelper
								characterCount={formData.careerKeywords.length}
								maxLength={200}
							/>
							<span
								className={`text-xs font-medium ${
									formData.careerKeywords.length > 180
										? "text-red-400"
										: formData.careerKeywords.length > 150
											? "text-yellow-400"
											: "text-zinc-400"
								}`}
							>
								{formData.careerKeywords.length}/200
							</span>
						</div>
					</div>

					{/* Skills */}
					<div className="space-y-4">
						<h3 className="text-xl font-bold text-white">
							Skills & Technologies
						</h3>
						<p className="text-sm text-zinc-400">
							Select skills you have or want to develop (optional)
						</p>
						<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
							{COMMON_SKILLS.map((skill) => (
								<motion.button
									key={skill}
									type="button"
									onClick={() =>
										setFormData({
											...formData,
											skills: toggleArray(formData.skills, skill),
										})
									}
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
									className={`px-3 py-2 rounded-lg border-2 transition-all font-medium text-sm ${
										formData.skills.includes(skill)
											? "border-brand-500 bg-gradient-to-r from-brand-500/20 to-brand-700/10 text-white"
											: "border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:border-brand-500/40 hover:bg-zinc-900/80"
									}`}
								>
									{skill}
								</motion.button>
							))}
						</div>
						{formData.skills.length > 0 && (
							<p className="text-sm text-zinc-400">
								<span className="font-bold text-brand-400">
									{formData.skills.length}
								</span>{" "}
								skills selected
							</p>
						)}
					</div>

					{/* Age Verification and Terms - Required before submission */}
					<AgeVerificationSection
						ageVerified={true}
						termsAccepted={true}
						gdprConsent={true}
						onAgeVerifiedChange={( _verified ) =>
							() => {}
						}
						onTermsAcceptedChange={( _accepted ) =>
							() => {}
						}
						onGdprConsentChange={( _consent ) =>
							() => {}
						}
						disabled={loading}
						showErrors={!true || !true || !true}
					/>

					{/* GDPR Consent - Required before submission */}
					<div className="bg-gradient-to-r from-brand-500/15 via-brand-700/15 to-brand-500/15 border-2 border-brand-500/40 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-7 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
						<label className="flex items-start gap-3 sm:gap-4 cursor-pointer group touch-manipulation">
							<input
								type="checkbox"
								id="gdpr-consent-step4"
								checked={formData.gdprConsent}
								onChange={(e) => {
									setFormData({
										...formData,
										gdprConsent: e.target.checked,
									});
								}}
								className="mt-1 w-6 h-6 sm:w-5 sm:h-5 rounded border-2 border-zinc-600 bg-zinc-800 checked:bg-brand-500 checked:border-brand-500 cursor-pointer touch-manipulation min-w-[48px] min-h-[48px] sm:min-w-0 sm:min-h-0"
								required
								aria-required="true"
								aria-describedby="gdpr-error-step4"
							/>
							<div className="flex-1">
								<p className="text-white font-medium mb-1">
									I agree to receive job recommendations via email *
								</p>
								<p className="text-sm text-zinc-400">
									By checking this box, you consent to receive personalized job matches and agree to our{" "}
									<a
										href="/legal/privacy"
										target="_blank"
										rel="noopener noreferrer"
										className="text-brand-400 hover:text-brand-300 underline font-semibold"
									>
										Privacy Policy
									</a>{" "}
									and{" "}
									<a
										href="/legal/terms"
										target="_blank"
										rel="noopener noreferrer"
										className="text-brand-400 hover:text-brand-300 underline font-semibold"
									>
										Terms of Service
									</a>
									. You can unsubscribe at any time.
								</p>
								{!formData.gdprConsent && (
									<p id="gdpr-error-step4" className="mt-2 text-sm text-red-400 flex items-center gap-2 font-medium" role="alert" aria-live="polite">
										<span>⚠️</span>
										<span>You must agree to receive job matches to continue</span>
									</p>
								)}
							</div>
						</label>
					</div>

					{/* Spacer for sticky button */}
					<div className="h-32 sm:h-0" aria-hidden="true" />

					{/* Sticky Submit Button */}
					<div className="sticky bottom-0 left-0 right-0 z-40 md:z-50 bg-black/80 backdrop-blur-xl border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8">
						<div className="flex gap-3 sm:gap-4">
							<motion.button
								onClick={() => setStep(3)}
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								className="btn-secondary flex-1 py-4 sm:py-5 text-base sm:text-lg touch-manipulation min-h-[56px]"
							>
								← Back
							</motion.button>
							<motion.button
								onClick={handleSubmit}
								disabled={loading || !true || !true || !formData.gdprConsent}
								whileHover={{ scale: loading || !true || !true || !formData.gdprConsent ? 1 : 1.03 }}
								whileTap={{ scale: loading || !true || !true || !formData.gdprConsent ? 1 : 0.97 }}
								className="relative flex-1 py-4 sm:py-6 md:py-7 text-base sm:text-xl md:text-2xl font-black disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 uppercase tracking-wide rounded-xl sm:rounded-2xl overflow-hidden touch-manipulation min-h-[56px]"
								style={{
									background: loading
										? "linear-gradient(to right, #6366F1, #7C3AED, #8B5CF6)"
										: "linear-gradient(135deg, #6366F1 0%, #7C3AED 50%, #8B5CF6 100%)",
									boxShadow:
										"0 0 60px rgba(99,102,241,0.8), 0 20px 60px -18px rgba(99,102,241,0.9), inset 0 1px 0 rgba(255,255,255,0.3)",
									textShadow: "0 2px 8px rgba(0,0,0,0.4)",
									transition: "all 0.3s ease",
								}}
							>
								{loading ? (
									<>
										<svg
											className="w-6 h-6 animate-spin"
											viewBox="0 0 24 24"
											fill="none"
										>
											<circle
												className="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												strokeWidth="4"
											></circle>
											<path
												className="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											></path>
										</svg>
										<span>Finding Matches...</span>
									</>
								) : (
									<>
										<span>Complete Signup · €5/mo →</span>
									</>
								)}
							</motion.button>
						</div>
					</div>
				</div>
			</div>
		</motion.div>
	);
});
