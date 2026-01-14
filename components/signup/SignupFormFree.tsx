"use client";

import { motion } from "framer-motion";
import { Suspense, useCallback } from "react";
import AriaLiveRegion from "../ui/AriaLiveRegion";
import { BrandIcons } from "../ui/BrandIcons";
import Button from "../ui/Button";
import { CityChip } from "../ui/CityChip";
import {
	FormFieldError,
	FormFieldSuccess,
} from "../ui/FormFieldFeedback";
import { useReducedMotion } from "../ui/useReducedMotion";
import { useSignupForm } from "@/hooks/useSignupForm";
import { showToast } from "../../lib/toast";
import { LiveMatchingMessages } from "./LiveMatchingMessages";
import { VisaSponsorshipSection } from "./VisaSponsorshipSection";
import { LiveMatchingOverlay } from "./LiveMatchingOverlay";
import { LiveJobsReview } from "./LiveJobsReview";
import { PersonalInfoSection } from "./PersonalInfoSection";
import EuropeMap from "../ui/EuropeMap";
import { AgeVerificationSection } from "./AgeVerificationSection";
import { CITIES, CAREER_PATHS } from "./constants";

export default function SignupFormFree() {
	const prefersReduced = useReducedMotion();

	const formState = useSignupForm();
	const {
		formData,
		setFormData,
		setTouchedFields,
		isFormValid,
		formProgress,
		jobCount,
		jobCountMetadata,
		isLoadingJobCount,
		previewError,
		isSubmitting,
		error,
		showLiveMatching,
		matchCount,
		handleSubmit,
		toggleArray,
		citiesValidation,
	} = formState;

	// Event handlers
	const handleCityClick = useCallback(
		(city: string) => {
			setFormData((prev) => {
				if (prev.cities.length < 3 || prev.cities.includes(city)) {
					return { ...prev, cities: toggleArray(prev.cities, city) };
				}
				return prev;
			});
			setTouchedFields((prev) => new Set(prev).add("cities"));
		},
		[setFormData, setTouchedFields, toggleArray],
	);

	const handleCityToggle = useCallback(
		(city: string) => {
			if ("vibrate" in navigator) {
				navigator.vibrate(10);
			}
			setFormData((prev) => {
				const isDisabled = !prev.cities.includes(city) && prev.cities.length >= 3;
				if (!isDisabled) {
					return { ...prev, cities: toggleArray(prev.cities, city) };
				}
				return prev;
			});
			setTouchedFields((prev) => new Set(prev).add("cities"));
		},
		[setFormData, setTouchedFields, toggleArray],
	);

	const handleCareerPathChange = useCallback((pathValue: string) => {
		setFormData((prev) => ({ ...prev, careerPath: pathValue }));
		setTouchedFields((prev) => new Set(prev).add("careerPath"));
	}, [setFormData, setTouchedFields]);

	const handleVisaSponsorshipChange = useCallback((value: string) => {
		setFormData((prev) => ({ ...prev, visaSponsorship: value }));
		setTouchedFields((prev) => new Set(prev).add("visaSponsorship"));
	}, [setFormData, setTouchedFields]);

	const handleCitiesBlur = useCallback(() => {
		setTouchedFields((prev) => new Set(prev).add("cities"));
	}, [setTouchedFields]);

	const handleFormSubmit = useCallback(
		async (e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			if (isSubmitting) return;

			if (!isFormValid) {
				setTouchedFields(new Set(["cities", "careerPath", "email", "fullName", "visaSponsorship", "gdprConsent"]));
				return;
			}

			await handleSubmit(e);
		},
		[isFormValid, isSubmitting, setTouchedFields, handleSubmit],
	);

	return (
		<div className="min-h-screen bg-black relative overflow-hidden pb-[max(1.5rem,env(safe-area-inset-bottom))]">
			{/* Simplified Background Effects */}
			<div
				className="absolute inset-0 enhanced-grid opacity-20"
				aria-hidden="true"
			/>
			<motion.div
				className="absolute top-20 right-10 w-96 h-96 bg-brand-500/15 rounded-full blur-3xl hidden sm:block"
				animate={
					prefersReduced
						? { scale: 1, opacity: 0.2 }
						: { scale: [1, 1.1, 1], opacity: [0.2, 0.3, 0.2] }
				}
				transition={{ duration: 8, repeat: prefersReduced ? 0 : Infinity }}
				aria-hidden="true"
			/>

			<div className="relative z-10 container-page max-w-4xl py-4 px-4 sm:py-8 sm:px-6 md:py-16">
				{/* Simplified Header - Quick Signup Focus */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="mb-8 text-center sm:mb-12"
				>
					<div className="inline-flex items-center gap-2 rounded-full border-2 border-brand-500/40 bg-brand-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-200 mb-4">
						<BrandIcons.Zap className="h-3 w-3" />
						Quick Signup - 60 Seconds
					</div>
					<h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-bold leading-tight text-white">
						See 5 Perfect Matches Instantly
					</h1>
					<p className="mt-3 text-base sm:text-lg font-medium text-content-secondary px-2">
						No email spam. No commitment. Just great jobs.
					</p>

					{/* Quick Stats - Simplified */}
					<div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm font-medium text-content-secondary">
						<span className="inline-flex items-center gap-2">
							<BrandIcons.Zap className="h-4 w-4 text-brand-400" />
							Instant results
						</span>
						<span className="inline-flex items-center gap-2">
							<BrandIcons.Check className="h-4 w-4 text-brand-400" />
							Zero emails
						</span>
						<span className="inline-flex items-center gap-2">
							<BrandIcons.Clock className="h-4 w-4 text-brand-400" />
							Under 60 seconds
						</span>
					</div>

					{/* Progress Indicator */}
					{formProgress > 0 && (
						<motion.div
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							className="mt-6 max-w-md mx-auto"
						>
							<div className="flex items-center justify-between mb-2">
								<span className="text-xs font-medium text-content-muted">
									Progress
								</span>
								<span className="text-xs font-semibold text-brand-300">
									{Math.round(formProgress)}%
								</span>
							</div>
							<div className="h-2 bg-white/5 rounded-full overflow-hidden">
								<motion.div
									initial={{ width: 0 }}
									animate={{ width: `${formProgress}%` }}
									transition={{ duration: 0.3, ease: "easeOut" }}
									className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full"
								/>
							</div>
						</motion.div>
					)}
				</motion.div>

				{/* Single-Step Form Container - Simplified Design */}
				<div className="rounded-2xl sm:rounded-3xl border-2 border-brand-500/25 bg-gradient-to-br from-brand-500/4 via-black/50 to-brand-500/4 p-6 sm:p-8 md:p-10 shadow-[0_20px_60px_rgba(109,90,143,0.15)] backdrop-blur-xl">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
					>
						{error && (
							<motion.div
								initial={{ opacity: 0, y: -10 }}
								animate={{ opacity: 1, y: 0 }}
								className="mb-6 p-4 bg-red-500/10 border-2 border-red-500/50 rounded-xl text-red-400 text-center"
								role="alert"
							>
								{error}
							</motion.div>
						)}

						<form onSubmit={handleFormSubmit} className="space-y-8">
							{/* Enhanced ARIA Live Region for form status updates */}
							<div
								role="status"
								aria-live="polite"
								aria-atomic="true"
								className="sr-only"
							>
								{isLoadingJobCount && "Scanning available jobs in selected cities"}
								{jobCount !== null &&
									!isLoadingJobCount &&
									`Found ${jobCount.toLocaleString()} ${jobCount === 1 ? "job" : "jobs"} matching your preferences`}
								{formState.emailValidation.error &&
									`Email error: ${formState.emailValidation.error}`}
								{formData.cities.length > 0 &&
									`Selected ${formData.cities.length} ${formData.cities.length === 1 ? "city" : "cities"}`}
								{formData.careerPath &&
									`Career path selected: ${formData.careerPath}`}
								{formData.visaSponsorship &&
									`Visa sponsorship: ${formData.visaSponsorship}`}
								{!formData.gdprConsent &&
									"Please accept the Privacy Policy to continue"}
							</div>

							{/* VISA SPONSORSHIP - PRIMARY QUESTION (FIRST) */}
							<VisaSponsorshipSection
								visaSponsorship={formData.visaSponsorship as "eu" | "blue-card" | "student-visa" | "need-sponsorship" | ""}
								onChange={handleVisaSponsorshipChange}
								isSubmitting={isSubmitting}
							/>

							{/* Personal Information Section */}
							<PersonalInfoSection formState={formState} isSubmitting={formState.isSubmitting} />

							{/* Cities Selection with Map - KEPT AS REQUESTED */}
							<div>
								<label
									id="cities-label"
									htmlFor="cities-field"
									className="block text-base font-bold text-white mb-3"
								>
									Preferred Cities *{" "}
									<span className="text-content-secondary font-normal text-sm">
										(Select up to 3)
									</span>
								</label>
								<p className="text-sm text-content-secondary mb-3">
									Choose up to 3 cities where you'd like to work. Click on the
									map to select.
								</p>

								{/* Interactive Europe Map - KEPT */}
								<motion.div
									id="cities-field"
									aria-labelledby="cities-label"
									role="group"
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.5 }}
									className="mb-4 sm:mb-6 hidden sm:block"
									onBlur={handleCitiesBlur}
								>
									<Suspense
										fallback={
											<div
												className="w-full h-[420px] sm:h-[480px] md:h-[540px] lg:h-[600px] rounded-2xl border-2 border-brand-500/30 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center"
												aria-label="Loading city selection map"
											>
												<div className="text-center">
													<div
														className="w-12 h-12 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto mb-4"
														aria-hidden="true"
													/>
													<p className="text-content-secondary text-sm">
														Loading map...
													</p>
												</div>
											</div>
										}
									>
										<EuropeMap
											selectedCities={formData.cities}
											onCityClick={isSubmitting ? () => {} : handleCityClick}
											maxSelections={3}
											className="w-full"
											onMaxSelectionsReached={(_city, max) => {
												showToast.error(
													`Maximum ${max} cities selected. Remove a city to select another.`,
												);
											}}
										/>
									</Suspense>
								</motion.div>

								{/* Mobile-friendly city chips - Horizontal scrolling */}
								<div
									className="flex overflow-x-auto pb-4 gap-2 scrollbar-hide -mx-4 px-4 snap-x snap-mandatory sm:hidden"
									role="group"
									aria-labelledby="cities-label"
								>
									{CITIES.map((city) => {
										const isSelected = formData.cities.includes(city);
										const isDisabled =
											!isSelected && formData.cities.length >= 3;
										return (
											<CityChip
												key={city}
												city={city}
												isSelected={isSelected}
												isDisabled={isDisabled || isSubmitting}
												onToggle={(city) => {
													// Trigger haptic feedback (if supported)
													if ("vibrate" in navigator) {
														navigator.vibrate(10); // 10ms subtle pulse
													}
													if (isDisabled) {
														showToast.error(
															"Maximum 3 cities selected. Remove a city to select another.",
														);
														return;
													}
													handleCityToggle(city);
												}}
												onRemove={(city) => {
													setFormData((prev) => ({
														...prev,
														cities: prev.cities.filter((c) => c !== city),
													}));
													setTouchedFields((prev) =>
														new Set(prev).add("cities"),
													);
												}}
											/>
										);
									})}
								</div>

								{/* Clear All Cities Button - Unified for Free users too */}
								{formData.cities.length > 0 && (
									<div className="mb-3 sm:hidden">
										<motion.button
											type="button"
											onClick={() => {
												setFormData((prev) => ({ ...prev, cities: [] }));
												setTouchedFields((prev) => new Set(prev).add("cities"));
											}}
											whileHover={{ scale: 1.02 }}
											whileTap={{ scale: 0.98 }}
											className="px-4 py-2 bg-zinc-500/10 hover:bg-zinc-500/20 border border-zinc-700 text-zinc-400 hover:text-zinc-300 text-sm font-medium rounded-lg transition-colors touch-manipulation min-h-[48px]"
										>
											Clear All Cities
										</motion.button>
									</div>
								)}

								<div className="mt-2 flex items-center justify-between">
									<p className="text-sm text-content-secondary">
										{formData.cities.length}/3 selected
									</p>
									{formData.cities.length > 0 && citiesValidation.isValid && (
										<FormFieldSuccess
											message={`${formData.cities.length} ${formData.cities.length === 1 ? "city" : "cities"} selected`}
											id="cities-success"
										/>
									)}
								</div>
							{formState.shouldShowError(
								"cities",
								formState.formData.cities.length === 0,
								formState.citiesValidation.isValid,
							) && (
								<FormFieldError
									error="Please select at least one city."
									id="cities-error"
								/>
							)}
							</div>

							{/* Career Path */}
							<div>
								<label className="block text-base font-bold text-white mb-3">
									What's your career interest? *
								</label>
								<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
									{CAREER_PATHS.map((path) => (
										<motion.button
											key={path.value}
											type="button"
											onClick={() => handleCareerPathChange(path.value)}
											whileTap={{ scale: 0.97 }}
											disabled={isSubmitting}
											className={`p-3 rounded-xl border-2 transition-all text-left ${
												formData.careerPath === path.value
													? "border-brand-500 bg-brand-500/12 shadow-[0_0_20px_rgba(109,90,143,0.2)]"
													: "border-border-default bg-surface-elevated/40 hover:border-border-default"
											} disabled:opacity-50 disabled:cursor-not-allowed`}
										>
											<span className="font-medium text-sm text-white">
												{path.label}
											</span>
										</motion.button>
									))}
								</div>
								{!formState.formData.careerPath && formState.touchedFields.has("careerPath") && (
									<FormFieldError
										error="Please select a career interest."
										id="careerPath-error"
									/>
								)}
							</div>

							{/* PROMINENT LIVE MATCHING CARD - Show immediately when cities + career selected */}
							{formData.cities.length > 0 && formData.careerPath && (
								<motion.div
									initial={{ opacity: 0, scale: 0.95, y: 20 }}
									animate={{ opacity: 1, scale: 1, y: 0 }}
									transition={{ duration: 0.5, type: "spring" }}
									className="relative mb-8 rounded-2xl border-2 border-brand-500/40 bg-gradient-to-br from-brand-500/20 via-brand-700/10 to-brand-500/20 p-8 shadow-[0_0_40px_rgba(99,102,241,0.3)] overflow-hidden"
									role="status"
									aria-live="polite"
								>
									{/* Animated background gradient */}
									<motion.div
										className="absolute inset-0 bg-gradient-to-r from-brand-500/10 via-transparent to-brand-700/10"
										animate={{
											x: ["-100%", "200%"],
										}}
										transition={{
											duration: 3,
											repeat: Infinity,
											ease: "linear",
										}}
									/>

									<div className="relative z-10">
										{/* Header */}
										<div className="flex items-center justify-between mb-6">
											<div className="flex items-center gap-3">
												<motion.div
													animate={{ rotate: 360 }}
													transition={{
														duration: 2,
														repeat: Infinity,
														ease: "linear",
													}}
													className="w-8 h-8 rounded-full border-2 border-brand-400 border-t-transparent"
												/>
												<h3 className="text-xl font-bold text-white">
													Live Job Matching
												</h3>
											</div>
											{!isLoadingJobCount && jobCount !== null && (
												<motion.div
													initial={{ scale: 0 }}
													animate={{ scale: 1 }}
													className="px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/50"
												>
													<span className="text-emerald-400 font-bold text-sm">
														✓ Ready
													</span>
												</motion.div>
											)}
										</div>

										{/* Dynamic scanning animation */}
										{isLoadingJobCount ? (
											<div className="space-y-4">
												<LiveMatchingMessages estimatedJobCount={jobCount || undefined} />
												<div className="flex items-center gap-2 text-sm text-content-secondary">
													<span className="inline-block h-3 w-3 animate-pulse rounded-full bg-brand-400" />
													Scanning {formData.cities.join(", ")}...
												</div>
											</div>
										) : jobCount !== null ? (
											<motion.div
												initial={{ opacity: 0, y: 10 }}
												animate={{ opacity: 1, y: 0 }}
												className="space-y-4"
											>
												{/* Big number display */}
												<div className="text-center">
													<motion.div
														key={jobCount}
														initial={{ scale: 1.2, opacity: 0 }}
														animate={{ scale: 1, opacity: 1 }}
														className="text-6xl font-black text-brand-400 mb-2"
													>
														{jobCount.toLocaleString()}
													</motion.div>
													<p className="text-lg text-content-secondary">
														{jobCount === 1 ? "job" : "jobs"} found in{" "}
														<span className="text-white font-semibold">
															{formData.cities.join(", ")}
														</span>
													</p>
												</div>

												{/* Low count suggestion */}
												{jobCountMetadata?.isLowCount &&
													jobCountMetadata.suggestion && (
														<div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
															<p className="text-sm text-amber-200 text-center">
																💡 {jobCountMetadata.suggestion}
															</p>
														</div>
													)}

												{/* Preview message */}
												{!jobCountMetadata?.isLowCount && (
													<div className="mt-6 p-4 rounded-xl bg-black/30 border border-brand-500/20">
														<p className="text-sm text-content-secondary text-center">
															🎯 We'll show you the{" "}
															<span className="text-brand-400 font-semibold">
																top 5 matches
															</span>{" "}
															from these {jobCount.toLocaleString()} jobs
														</p>
													</div>
												)}
											</motion.div>
										) : previewError ? (
											<motion.div
												initial={{ opacity: 0, y: 10 }}
												animate={{ opacity: 1, y: 0 }}
												className="text-center p-6"
											>
												<div className="text-amber-400 text-sm">
													⚠️ {previewError}
												</div>
												<div className="mt-2 text-xs text-content-secondary">
													You can still proceed with signup - we'll find matches for you!
												</div>
											</motion.div>
										) : null}
									</div>
									<AriaLiveRegion level="polite">
										{isLoadingJobCount
											? "Scanning available jobs in selected cities"
											: jobCount !== null
												? `Found ${jobCount.toLocaleString()} ${jobCount === 1 ? "job" : "jobs"} matching your preferences`
												: ""}
									</AriaLiveRegion>
								</motion.div>
							)}

							{/* LIVE JOB PREVIEW - Show actual job previews when cities + career selected */}
							{formData.cities.length > 0 && formData.careerPath && (
								<LiveJobsReview
									cities={formData.cities}
									careerPath={formData.careerPath}
									isVisible={true}
									className="mt-8"
								/>
							)}

							{/* Age Verification and Terms - Required */}
							<div className="mt-6">
								<AgeVerificationSection
									ageVerified={formData.ageVerified}
									termsAccepted={formData.termsAccepted}
									gdprConsent={formData.gdprConsent}
									onAgeVerifiedChange={(verified) =>
										setFormData((prev) => ({ ...prev, ageVerified: verified }))
									}
									onTermsAcceptedChange={(accepted) =>
										setFormData((prev) => ({ ...prev, termsAccepted: accepted }))
									}
									onGdprConsentChange={(consent) =>
										setFormData((prev) => ({ ...prev, gdprConsent: consent }))
									}
									disabled={isSubmitting}
									showErrors={!formData.ageVerified || !formData.termsAccepted || !formData.gdprConsent}
								/>
							</div>


							{/* Spacer for sticky button */}
							<div className="h-32 sm:h-0" aria-hidden="true" />

							{/* Sticky Submit Button */}
							<div className="sticky bottom-0 left-0 right-0 z-40 md:z-50 bg-black/80 backdrop-blur-xl border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8">
								<Button
									type="submit"
									variant="primary"
									size="lg"
									className="w-full min-h-[56px]"
									disabled={isSubmitting || !isFormValid}
									isLoading={isSubmitting}
								>
									{isSubmitting
										? "Creating Account..."
										: "Show Me My 5 Matches →"}
								</Button>

								<p className="text-sm text-center text-content-secondary mt-4 leading-relaxed tracking-tight">
									<span className="text-brand-400 font-semibold">
										Quick & Free
									</span>
									{" • "}
									No credit card required • Instant results • Cancel anytime
								</p>
							</div>
						</form>
					</motion.div>
				</div>

				{/* Live Matching Screen */}
				<LiveMatchingOverlay
					showLiveMatching={showLiveMatching}
					isSubmitting={isSubmitting}
					matchCount={matchCount}
					estimatedJobCount={jobCount || undefined}
				/>

			</div>
		</div>
	);
}
