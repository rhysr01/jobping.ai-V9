"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
	type ChangeEvent,
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import AriaLiveRegion from "@/components/ui/AriaLiveRegion";
import { BrandIcons } from "@/components/ui/BrandIcons";
import Button from "@/components/ui/Button";
import { CityChip } from "@/components/ui/CityChip";
import {
	FormFieldError,
	FormFieldSuccess,
} from "@/components/ui/FormFieldFeedback";
import { useReducedMotion } from "@/components/ui/useReducedMotion";
import {
	useEmailValidation,
	useRequiredValidation,
} from "@/hooks/useFormValidation";
import { useStats } from "@/hooks/useStats";
import { useFormPersistenceFree } from "@/hooks/useFormPersistenceFree";
import { trackEvent } from "@/lib/analytics";
import { ApiError, apiCall, apiCallJson } from "@/lib/api-client";
import { showToast } from "@/lib/toast";
import { LiveMatchingMessages } from "./LiveMatchingMessages";

// Code split EuropeMap for better performance
const EuropeMap = dynamic(() => import("@/components/ui/EuropeMap"), {
	loading: () => (
		<div className="w-full h-[420px] sm:h-[480px] md:h-[540px] lg:h-[600px] rounded-2xl border-2 border-brand-500/30 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center">
			<div className="text-center">
				<div className="w-12 h-12 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto mb-4" />
				<p className="text-content-secondary text-sm">Loading map...</p>
			</div>
		</div>
	),
	ssr: false, // Map is interactive, no need for SSR
});

const CAREER_PATHS = [
	{ value: "strategy", label: "Strategy & Business Design" },
	{ value: "data", label: "Data & Analytics" },
	{ value: "sales", label: "Sales & Client Success" },
	{ value: "marketing", label: "Marketing & Growth" },
	{ value: "finance", label: "Finance & Investment" },
	{ value: "operations", label: "Operations & Supply Chain" },
	{ value: "product", label: "Product & Innovation" },
	{ value: "tech", label: "Tech & Transformation" },
	{ value: "sustainability", label: "Sustainability & ESG" },
	{ value: "unsure", label: "Not Sure Yet / General" },
];

const CITIES = [
	"Dublin",
	"London",
	"Paris",
	"Amsterdam",
	"Manchester",
	"Birmingham",
	"Belfast",
	"Madrid",
	"Barcelona",
	"Berlin",
	"Hamburg",
	"Munich",
	"Zurich",
	"Milan",
	"Rome",
	"Brussels",
	"Stockholm",
	"Copenhagen",
	"Vienna",
	"Prague",
	"Warsaw",
];

export default function SignupFormFree() {
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState("");
	const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
	const prefersReduced = useReducedMotion();
	const { stats, isLoading: isLoadingStats } = useStats();

	const [formData, setFormData] = useState({
		cities: [] as string[],
		careerPath: "",
		email: "",
		fullName: "",
		visaSponsorship: "", // Added visa sponsorship field
		gdprConsent: false, // GDPR consent
	});

	const [jobCount, setJobCount] = useState<number | null>(null);
	const [jobCountMetadata, setJobCountMetadata] = useState<{
		isLowCount?: boolean;
		suggestion?: string;
	} | null>(null);
	const [isLoadingJobCount, setIsLoadingJobCount] = useState(false);
	const [matchCount, setMatchCount] = useState<number>(0);
	const [showLiveMatching, setShowLiveMatching] = useState(false);

	// Form persistence
	const { clearProgress } = useFormPersistenceFree(formData, setFormData);

	// Form validation hooks
	const emailValidation = useEmailValidation(formData.email);
	const nameValidation = useRequiredValidation(formData.fullName, "Full name");
	const citiesValidation = useRequiredValidation(
		formData.cities,
		"Preferred cities",
	);
	const visaSponsorshipValidation = useRequiredValidation(
		formData.visaSponsorship,
		"Visa sponsorship",
	);

	// Memoized helper functions
	const toggleArray = useCallback((arr: string[], value: string) => {
		return arr.includes(value)
			? arr.filter((v) => v !== value)
			: [...arr, value];
	}, []);

	const shouldShowError = useCallback(
		(fieldName: string, hasValue: boolean, isValid: boolean) => {
			// Show error if:
			// 1. Field was touched (blurred at least once)
			// 2. Field has value AND is invalid
			// OR
			// 3. Field has value longer than 3 chars and is invalid (show during typing)

			if (fieldName === "email" && hasValue && !isValid) {
				// For email, show error after @ is typed
				return formData.email.includes("@") && formData.email.length > 3;
			}

			if (fieldName === "fullName" && hasValue && !isValid) {
				// For name, show error after 3 characters typed
				return formData.fullName.length > 3;
			}

			if (fieldName === "visaSponsorship" && hasValue && !isValid) {
				return formData.visaSponsorship.length > 0;
			}

			return touchedFields.has(fieldName) && hasValue && !isValid;
		},
		[
			touchedFields,
			formData.email,
			formData.fullName,
			formData.visaSponsorship,
		],
	);

	// Track when user completes step 1 (cities + career path selected)
	useEffect(() => {
		if (formData.cities.length > 0 && formData.careerPath) {
			trackEvent("signup_step_completed", {
				step: 1,
				cities: formData.cities.length,
				career_path: formData.careerPath,
			});
		}
	}, [formData.cities.length, formData.careerPath]);

	// Fetch job count when both cities and career path are selected
	useEffect(() => {
		const fetchJobCount = async () => {
			if (formData.cities.length > 0 && formData.careerPath) {
				setIsLoadingJobCount(true);
				try {
					const data = await apiCallJson<{
						count?: number;
						isLowCount?: boolean;
						suggestion?: string;
					}>("/api/preview-matches", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							cities: formData.cities,
							careerPath: formData.careerPath,
						}),
					});
					setJobCount(data.count || 0);
					setJobCountMetadata({
						isLowCount: data.isLowCount,
						suggestion: data.suggestion,
					});
				} catch (error) {
					console.error("Failed to fetch job count:", error);
					setJobCount(null);
					setJobCountMetadata(null);
				} finally {
					setIsLoadingJobCount(false);
				}
			} else {
				setJobCount(null);
				setJobCountMetadata(null);
			}
		};

		// Debounce the API call slightly to avoid too many requests
		const timeoutId = setTimeout(fetchJobCount, 300);
		return () => clearTimeout(timeoutId);
	}, [formData.cities, formData.careerPath]);


	// Calculate form completion percentage
	const formProgress = useMemo(() => {
		let completed = 0;
		if (formData.cities.length > 0) completed++;
		if (formData.careerPath) completed++;
		if (formData.email && emailValidation.isValid) completed++;
		if (formData.fullName && nameValidation.isValid) completed++;
		if (formData.visaSponsorship && visaSponsorshipValidation.isValid)
			completed++;
		return (completed / 5) * 100; // Updated to 5 steps
	}, [
		formData,
		emailValidation.isValid,
		nameValidation.isValid,
		visaSponsorshipValidation.isValid,
	]);

	// Memoized computed values
	const isFormValid = useMemo(
		() =>
			formData.cities.length > 0 &&
			formData.careerPath &&
			emailValidation.isValid &&
			nameValidation.isValid &&
			visaSponsorshipValidation.isValid &&
			formData.gdprConsent,
		[
			formData.cities.length,
			formData.careerPath,
			emailValidation.isValid,
			nameValidation.isValid,
			visaSponsorshipValidation.isValid,
			formData.gdprConsent,
		],
	);

	// Memoized event handlers
	const handleEmailChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
		setFormData((prev) => ({ ...prev, email: e.target.value }));
		setTouchedFields((prev) => new Set(prev).add("email"));
	}, []);

	const handleNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
		setFormData((prev) => ({ ...prev, fullName: e.target.value }));
		setTouchedFields((prev) => new Set(prev).add("fullName"));
	}, []);

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
		[toggleArray],
	);

	const handleCityToggle = useCallback(
		(city: string) => {
			// Trigger haptic feedback (if supported)
			if ("vibrate" in navigator) {
				navigator.vibrate(10); // 10ms subtle pulse
			}
			setFormData((prev) => {
				const isDisabled =
					!prev.cities.includes(city) && prev.cities.length >= 3;
				if (!isDisabled) {
					return { ...prev, cities: toggleArray(prev.cities, city) };
				}
				return prev;
			});
			setTouchedFields((prev) => new Set(prev).add("cities"));
		},
		[toggleArray],
	);

	const handleCareerPathChange = useCallback((pathValue: string) => {
		setFormData((prev) => ({ ...prev, careerPath: pathValue }));
		setTouchedFields((prev) => new Set(prev).add("careerPath"));
	}, []);

	const handleVisaSponsorshipChange = useCallback((value: string) => {
		setFormData((prev) => ({ ...prev, visaSponsorship: value }));
		setTouchedFields((prev) => new Set(prev).add("visaSponsorship"));
	}, []);

	const handleCitiesBlur = useCallback(() => {
		setTouchedFields((prev) => new Set(prev).add("cities"));
	}, []);

	const handleFormSubmit = useCallback(
		async (e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();

			if (isSubmitting) return; // Prevent double submission

			if (!isFormValid) {
				setTouchedFields(
					new Set([
						"cities",
						"careerPath",
						"email",
						"fullName",
						"visaSponsorship",
						"gdprConsent",
					]),
				);
				// Find first invalid field and focus it
				const firstErrorField = !formData.visaSponsorship
					? document.querySelector<HTMLElement>(
							'button[type="button"][onclick*="visaSponsorship"]',
						) || document.getElementById("visa-field")
					: formData.cities.length === 0
						? document.getElementById("cities-field")
						: !formData.careerPath
							? document.querySelector<HTMLElement>(
									'button[type="button"][onclick*="careerPath"]',
								)
							: !formData.email.trim() || !emailValidation.isValid
								? document.getElementById("email")
								: !formData.fullName.trim()
									? document.getElementById("fullName")
									: null;

				if (firstErrorField) {
					firstErrorField.focus();
					// Fallback scrollIntoView for browsers that don't support scroll-margin
					firstErrorField.scrollIntoView({
						behavior: "smooth",
						block: "center",
					});
				}
				return;
			}

			setIsSubmitting(true);
			setError("");
			setShowLiveMatching(true); // Show live matching screen

			// Track signup started
			trackEvent("signup_started", { tier: "free" });

			try {
				const response = await apiCall("/api/signup/free", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						email: formData.email,
						full_name: formData.fullName,
						preferred_cities: formData.cities,
						career_paths: [formData.careerPath],
						visa_sponsorship: formData.visaSponsorship,
						entry_level_preferences: ["graduate", "intern", "junior"],
					}),
				});

				const data = await response.json();

				if (response.status === 409) {
					trackEvent("signup_failed", {
						tier: "free",
						error: "already_exists",
					});

					// If redirectToMatches flag is set, redirect to matches page
					if (data.redirectToMatches) {
						showToast.success("Redirecting to your matches...");
						const existingMatchCount = data.matchCount || 5;
						setTimeout(() => {
							router.push(
								`/matches?justSignedUp=true&matchCount=${existingMatchCount}`,
							);
						}, 1000);
						return;
					}

					setError(
						"You've already tried Free! Want 10 more jobs this week? Upgrade to Premium for 15 jobs/week (3x more).",
					);
					return;
				}

				if (!response.ok) {
					// Show user-friendly error messages
					const errorMsg = data.error || data.message || "Signup failed";
					console.error("Signup failed:", {
						status: response.status,
						error: errorMsg,
						data,
					});
					throw new Error(errorMsg);
				}

				// Check if matches were actually created
				const matchCountValue = data.matchCount || 0;
				setMatchCount(matchCountValue);

				if (matchCountValue === 0) {
					if (process.env.NODE_ENV === "development") {
						console.warn("Signup succeeded but no matches created", data);
					}
					setError(
						"We couldn't find any matches for your preferences. Try selecting different cities or career paths.",
					);
					trackEvent("signup_failed", { tier: "free", error: "no_matches" });
					return;
				}

				// Track successful signup
				trackEvent("signup_completed", {
					tier: "free",
					cities: formData.cities.length,
					career_path: formData.careerPath,
					matchCount: matchCountValue,
				});

				// Clear saved progress
				clearProgress();
				
				// Hide live matching
				setShowLiveMatching(false);

				// Track successful signup
				trackEvent("signup_completed", {
					tier: "free",
					cities: formData.cities.length,
					career_path: formData.careerPath,
					matchCount: matchCountValue,
				});

				showToast.success(
					`Account created! Found ${matchCountValue} perfect matches...`,
				);

				// IMMEDIATE REDIRECT - No countdown, no personalizing screen
				router.push(
					`/matches?justSignedUp=true&matchCount=${matchCountValue}`,
				);
			} catch (err) {
				setShowLiveMatching(false); // Hide live matching on error
				const errorMessage =
					err instanceof ApiError
						? err.message
						: err instanceof Error
							? err.message
							: "Something went wrong. Please try again.";

				trackEvent("signup_failed", {
					tier: "free",
					error: errorMessage,
				});

				setError(errorMessage);
			} finally {
				setIsSubmitting(false); // Always reset submission state
			}
		},
		[isFormValid, formData, router, isSubmitting, emailValidation.isValid],
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
								{emailValidation.error &&
									`Email error: ${emailValidation.error}`}
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
							<div className="mb-8">
								<label className="block text-lg font-bold text-white mb-3">
									Do you require visa sponsorship to work in the EU? *
								</label>
								<p className="text-sm text-content-secondary mb-4">
									90% of graduate applications from international students are
									rejected because of visa issues.
								</p>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<motion.button
										type="button"
										onClick={() => handleVisaSponsorshipChange("yes")}
										whileTap={{ scale: 0.97 }}
										disabled={isSubmitting}
										className={`p-8 rounded-xl border-2 transition-all duration-300 text-left relative ${
											formData.visaSponsorship === "yes"
												? "border-emerald-500 bg-emerald-500/20 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500/30"
												: formData.visaSponsorship === "no"
													? "opacity-50 border-border-default bg-surface-elevated/40"
													: "border-border-default bg-surface-elevated/40 hover:border-border-default"
										}`}
									>
										{/* Inner glow effect when selected */}
										{formData.visaSponsorship === "yes" && (
											<div className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-400/20 to-transparent pointer-events-none" />
										)}
										<div className="relative flex flex-col">
											<div className="flex items-center gap-2 mb-4">
												<span className="text-xl">✅</span>
												<span className="font-bold text-white">
													Yes, I need a visa
												</span>
											</div>
											<p className="text-sm text-content-secondary relative">
												Tier 2, Blue Card, or work permit
											</p>
										</div>
									</motion.button>

									<motion.button
										type="button"
										onClick={() => handleVisaSponsorshipChange("no")}
										whileTap={{ scale: 0.97 }}
										disabled={isSubmitting}
										className={`p-8 rounded-xl border-2 transition-all duration-300 text-left relative ${
											formData.visaSponsorship === "no"
												? "border-brand-500 bg-brand-500/20 shadow-lg shadow-brand-500/20 ring-2 ring-brand-500/30"
												: formData.visaSponsorship === "yes"
													? "opacity-50 border-border-default bg-surface-elevated/40"
													: "border-border-default bg-surface-elevated/40 hover:border-border-default"
										}`}
									>
										{/* Inner glow effect when selected */}
										{formData.visaSponsorship === "no" && (
											<div className="absolute inset-0 rounded-xl bg-gradient-to-br from-brand-400/20 to-transparent pointer-events-none" />
										)}
										<div className="relative flex flex-col">
											<div className="flex items-center gap-2 mb-4">
												<span className="text-xl">🇪🇺</span>
												<span className="font-bold text-white">
													No, I have EU citizenship
												</span>
											</div>
											<p className="text-sm text-content-secondary relative">
												EU/EEA citizen or permanent residency
											</p>
										</div>
									</motion.button>
								</div>

								{shouldShowError(
									"visaSponsorship",
									!formData.visaSponsorship,
									!!formData.visaSponsorship,
								) && (
									<FormFieldError
										error="Please select your visa sponsorship requirement."
										id="visa-error"
									/>
								)}
							</div>

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
								{shouldShowError(
									"cities",
									formData.cities.length === 0,
									citiesValidation.isValid,
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
								{!formData.careerPath && touchedFields.has("careerPath") && (
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
												<LiveMatchingMessages />
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

							{/* Email and Name - Combined Section */}
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
										required
										disabled={isSubmitting}
										value={formData.email}
										onChange={handleEmailChange}
										placeholder="you@example.com"
										autoComplete="email"
										inputMode="email"
										className="w-full px-4 py-4 bg-black/50 border-2 rounded-xl text-white placeholder-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/30 transition-all text-base font-medium backdrop-blur-sm border-border-default disabled:opacity-50 disabled:cursor-not-allowed"
									/>
									<p className="text-sm text-content-secondary mt-2">
										We won't email you. Ever.
									</p>
									{shouldShowError(
										"email",
										!!formData.email,
										emailValidation.isValid,
									) && (
										<FormFieldError
											error={emailValidation.error || "Invalid email"}
											id="email-error"
										/>
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
										required
										disabled={isSubmitting}
										value={formData.fullName}
										onChange={handleNameChange}
										placeholder="Jane Doe"
										autoComplete="name"
										autoCorrect="off"
										autoCapitalize="words"
										className="w-full px-4 py-4 bg-black/50 border-2 rounded-xl text-white placeholder-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/30 transition-all text-base font-medium backdrop-blur-sm border-border-default disabled:opacity-50 disabled:cursor-not-allowed"
									/>
									{shouldShowError(
										"fullName",
										!!formData.fullName,
										nameValidation.isValid,
									) && (
										<FormFieldError
											error={nameValidation.error || "Name is required"}
											id="fullName-error"
										/>
									)}
								</div>
							</div>

							{/* GDPR Consent */}
							<div className="mt-6 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
								<label className="flex items-start gap-3 cursor-pointer group">
									<input
										type="checkbox"
										required
										checked={formData.gdprConsent}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												gdprConsent: e.target.checked,
											}))
										}
										onBlur={() =>
											setTouchedFields((prev) =>
												new Set(prev).add("gdprConsent"),
											)
										}
										className="mt-1 w-5 h-5 rounded border-2 border-zinc-600 bg-zinc-800 checked:bg-brand-500 checked:border-brand-500 cursor-pointer"
										aria-required="true"
									/>
									<span className="text-sm text-content-secondary">
										I agree to the{" "}
										<a
											href="/legal/privacy"
											target="_blank"
											rel="noopener noreferrer"
											className="text-brand-400 hover:text-brand-300 underline"
										>
											Privacy Policy
										</a>{" "}
										and consent to processing my data for job matching purposes. *
									</span>
								</label>
								{shouldShowError(
									"gdprConsent",
									!formData.gdprConsent,
									formData.gdprConsent,
								) && (
									<FormFieldError
										error="Please accept the Privacy Policy to continue"
										id="gdpr-error"
									/>
								)}
							</div>

							{/* Spacer for sticky button */}
							<div className="h-32 sm:h-0" aria-hidden="true" />

							{/* Sticky Submit Button */}
							<div className="sticky bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8">
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
				<AnimatePresence mode="wait">
					{showLiveMatching && isSubmitting ? (
						<motion.div
							key="live-matching"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md"
						>
							<motion.div
								initial={{ scale: 0.9, opacity: 0 }}
								animate={{ scale: 1, opacity: 1 }}
								className="text-center max-w-md px-4"
							>
								{/* Animated scanning lines */}
								<motion.div
									className="relative w-full h-2 bg-zinc-800 rounded-full mb-8 overflow-hidden"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
								>
									<motion.div
										className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-500 to-transparent"
										animate={{
											x: ["-100%", "200%"],
										}}
										transition={{
											duration: 2,
											repeat: Infinity,
											ease: "linear",
										}}
									/>
								</motion.div>

								{/* Dynamic scanning messages */}
								<LiveMatchingMessages />

								{/* Job count ticker */}
								<motion.div
									className="mt-8 text-4xl font-bold text-brand-400"
									key={matchCount}
									initial={{ scale: 0.8, opacity: 0 }}
									animate={{ scale: 1, opacity: 1 }}
								>
									{matchCount > 0 ? `${matchCount} matches found` : "Scanning..."}
								</motion.div>
							</motion.div>
						</motion.div>
					) : null}
				</AnimatePresence>

			</div>
		</div>
	);
}
