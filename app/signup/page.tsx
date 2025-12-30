"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useAriaAnnounce } from "@/components/ui/AriaLiveRegion";
import { BrandIcons } from "@/components/ui/BrandIcons";
import EntryLevelSelector from "@/components/ui/EntryLevelSelector";
import EuropeMap from "@/components/ui/EuropeMap";
import {
	FormFieldError,
	FormFieldHelper,
	FormFieldSuccess,
} from "@/components/ui/FormFieldFeedback";
import LanguageSelector from "@/components/ui/LanguageSelector";
import { useReducedMotion } from "@/components/ui/useReducedMotion";
import WorkEnvironmentSelector from "@/components/ui/WorkEnvironmentSelector";
import {
	useEmailValidation,
	useRequiredValidation,
} from "@/hooks/useFormValidation";
import { ApiError, apiCall, apiCallJson } from "@/lib/api-client";
import * as Copy from "@/lib/copy";
import { SIGNUP_INITIAL_ROLES } from "@/lib/productMetrics";
import { showToast } from "@/lib/toast";

function SignupForm() {
	const router = useRouter();
	const [step, setStep] = useState(1);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
	const [successState, setSuccessState] = useState<{
		show: boolean;
		matchesCount?: number;
	}>({ show: false });
	const [activeJobs, setActiveJobs] = useState("Updating…");
	const [totalUsers, setTotalUsers] = useState("");
	const [isLoadingStats, setIsLoadingStats] = useState(true);
	const [_statsStale, setStatsStale] = useState(true);
	// This is the premium signup flow - free users go to /signup/free
	const _tier: "premium" = "premium";
	const prefersReduced = useReducedMotion();
	const { announce, Announcement } = useAriaAnnounce();
	const formRefs = {
		fullName: useRef<HTMLInputElement>(null),
		email: useRef<HTMLInputElement>(null),
	};
	const [formData, setFormData] = useState({
		fullName: "",
		email: "",
		cities: [] as string[],
		languages: [] as string[],
		workEnvironment: [] as string[],
		visaStatus: "",
		entryLevelPreferences: [] as string[], // Changed to array for multiple selections
		targetCompanies: [] as string[],
		careerPath: "",
		roles: [] as string[],
		// NEW FIELDS FOR BETTER MATCHING
		industries: [] as string[],
		companySizePreference: "",
		skills: [] as string[],
		careerKeywords: "", // NEW: Free-form career keywords
		gdprConsent: false, // GDPR: Must explicitly agree
	});

	useEffect(() => {
		const normalize = (value: unknown): number => {
			if (typeof value === "number" && !Number.isNaN(value)) return value;
			if (typeof value === "string") {
				const numeric = Number(value.replace(/,/g, ""));
				if (!Number.isNaN(numeric)) return numeric;
			}
			return 0;
		};

		apiCallJson<{
			activeJobs?: number;
			activeJobsFormatted?: string;
			totalUsers?: number;
			totalUsersFormatted?: string;
		}>("/api/stats")
			.then((data) => {
				if (!data) {
					setActiveJobs("~12,000");
					setTotalUsers("3,400");
					setStatsStale(true);
					return;
				}

				const activeValue = normalize(
					data.activeJobs ?? data.activeJobsFormatted,
				);
				const totalValue = normalize(
					data.totalUsers ?? data.totalUsersFormatted,
				);
				const hasFreshStats = activeValue > 0 && totalValue > 0;

				setActiveJobs(
					hasFreshStats ? activeValue.toLocaleString("en-US") : "~12,000",
				);
				setTotalUsers(
					hasFreshStats ? totalValue.toLocaleString("en-US") : "3,400",
				);
				setStatsStale(!hasFreshStats);
			})
			.catch((err) => {
				console.error("Failed to fetch stats:", err);
				setActiveJobs("~12,000");
				setTotalUsers("3,400");
				setStatsStale(true);
			})
			.finally(() => setIsLoadingStats(false));
	}, []);

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

	const LANGUAGES = [
		// Most common EU languages
		"English",
		"French",
		"German",
		"Spanish",
		"Italian",
		"Dutch",
		"Portuguese",
		// Additional EU languages
		"Polish",
		"Swedish",
		"Danish",
		"Finnish",
		"Czech",
		"Romanian",
		"Hungarian",
		"Greek",
		"Bulgarian",
		"Croatian",
		"Serbian",
		"Slovak",
		"Slovenian",
		"Estonian",
		"Latvian",
		"Lithuanian",
		"Ukrainian",
		// Middle Eastern & Central Asian (common visa seekers)
		"Arabic",
		"Turkish",
		"Hebrew",
		"Persian",
		"Farsi",
		"Urdu",
		// Asian languages (common visa seekers)
		"Japanese",
		"Chinese",
		"Mandarin",
		"Cantonese",
		"Korean",
		"Hindi",
		"Thai",
		"Vietnamese",
		"Indonesian",
		"Tagalog",
		"Malay",
		"Bengali",
		"Tamil",
		"Telugu",
		// Other common languages
		"Russian",
	];

	// NEW CONSTANTS FOR BETTER MATCHING
	const INDUSTRIES = [
		"Technology",
		"Finance",
		"Consulting",
		"Healthcare",
		"Retail",
		"Manufacturing",
		"Energy",
		"Media",
		"Education",
		"Government",
		"Non-profit",
		"Real Estate",
		"Transportation",
		"Automotive",
		"Fashion",
		"Food & Beverage",
		"Travel",
		"Other",
	];

	const COMPANY_SIZES = [
		{ value: "startup", label: "Startup (1-50)", emoji: "" },
		{ value: "scaleup", label: "Scale-up (50-500)", emoji: "" },
		{ value: "enterprise", label: "Enterprise (500+)", emoji: "" },
		{ value: "any", label: "Any Size", emoji: "" },
	];

	const COMMON_SKILLS = [
		"Excel",
		"PowerPoint",
		"Word",
		"Python",
		"R",
		"SQL",
		"PowerBI",
		"Tableau",
		"Google Analytics",
		"Salesforce",
		"HubSpot",
		"Jira",
		"Confluence",
		"Slack",
		"Microsoft Office",
		"Google Workspace",
		"Adobe Creative Suite",
		"Canva",
		"Data Analysis",
		"Project Management",
		"Digital Marketing",
		"Social Media",
		"Email Marketing",
		"Content Creation",
		"Research",
		"Presentation Skills",
		"Communication",
		"Leadership",
		"Problem Solving",
		"Analytical Thinking",
	];

	const CAREER_PATHS = [
		{
			value: "strategy",
			label: "Strategy & Business Design",
			emoji: "",
			roles: [
				"Business Analyst",
				"Associate Consultant",
				"Junior Consultant",
				"Strategy Analyst",
				"Consulting Intern",
				"Junior Business Analyst",
				"Transformation Analyst",
				"Management Consulting Intern",
				"Growth Consultant",
				"Business Analyst Trainee",
				"Junior Associate",
				"Strategy Consultant",
				"Digital Transformation Analyst",
				"Operations Excellence Consultant",
				"Business Strategy Intern",
			],
		},
		{
			value: "data",
			label: "Data & Analytics",
			emoji: "",
			roles: [
				"Data Analyst",
				"Junior Data Analyst",
				"Analytics Intern",
				"Business Intelligence Intern",
				"Data Analyst Trainee",
				"Junior Data Scientist",
				"Data Science Trainee",
				"Junior Data Engineer",
				"BI Engineer Intern",
				"Analytics Associate",
				"Data Analytics Graduate",
				"Insights Analyst",
				"Junior BI Developer",
				"Data Assistant",
				"Research & Analytics Intern",
			],
		},
		{
			value: "sales",
			label: "Sales & Client Success",
			emoji: "",
			roles: [
				"Sales Development Representative (SDR)",
				"Business Development Representative (BDR)",
				"Inside Sales Representative",
				"Account Executive",
				"Business Development Associate",
				"Sales Trainee",
				"Customer Success Associate",
				"Revenue Operations Analyst",
				"Sales Operations Analyst",
				"Graduate Sales Programme",
				"Business Development Intern",
				"Channel Sales Associate",
				"Account Development Representative",
				"Junior Sales Executive",
				"Client Success Manager",
			],
		},
		{
			value: "marketing",
			label: "Marketing & Growth",
			emoji: "",
			roles: [
				"Marketing Intern",
				"Social Media Intern",
				"Digital Marketing Assistant",
				"Marketing Coordinator",
				"Growth Marketing Intern",
				"Content Marketing Intern",
				"Brand Assistant",
				"Marketing Assistant",
				"Junior Marketing Associate",
				"Email Marketing Trainee",
				"SEO/SEM Intern",
				"Trade Marketing Intern",
				"Marketing Graduate Programme",
				"Junior B2B Marketing Coordinator",
				"Marketing Campaign Assistant",
			],
		},
		{
			value: "finance",
			label: "Finance & Investment",
			emoji: "",
			roles: [
				"Financial Analyst",
				"Finance Intern",
				"Investment Banking Analyst",
				"Risk Analyst",
				"Audit Associate",
				"Finance Trainee",
				"FP&A Analyst",
				"Credit Analyst",
				"Investment Analyst",
				"Junior Accountant",
				"Corporate Finance Analyst",
				"M&A Analyst",
				"Treasury Analyst",
				"Junior Tax Associate",
				"Finance Graduate",
			],
		},
		{
			value: "operations",
			label: "Operations & Supply Chain",
			emoji: "",
			roles: [
				"Operations Analyst",
				"Supply Chain Analyst",
				"Logistics Analyst",
				"Procurement Analyst",
				"Operations Intern",
				"Inventory Planner",
				"Operations Coordinator",
				"Supply Chain Trainee",
				"Logistics Planning Graduate",
				"Demand Planning Intern",
				"Operations Management Trainee",
				"Fulfilment Specialist",
				"Sourcing Analyst",
				"Process Improvement Analyst",
				"Supply Chain Graduate",
			],
		},
		{
			value: "product",
			label: "Product & Innovation",
			emoji: "",
			roles: [
				"Associate Product Manager (APM)",
				"Product Analyst",
				"Product Management Intern",
				"Junior Product Manager",
				"Product Operations Associate",
				"Product Designer",
				"UX Intern",
				"Product Research Assistant",
				"Innovation Analyst",
				"Product Development Coordinator",
				"Product Marketing Assistant",
				"Product Owner Graduate",
				"Assistant Product Manager",
				"Product Strategy Intern",
				"Technical Product Specialist",
			],
		},
		{
			value: "tech",
			label: "Tech & Transformation",
			emoji: "",
			roles: [
				"Software Engineer Intern",
				"Cloud Engineer Intern",
				"DevOps Engineer Intern",
				"Data Engineer Intern",
				"Systems Analyst",
				"IT Support Analyst",
				"Application Support Analyst",
				"Technology Analyst",
				"QA/Test Analyst",
				"Platform Engineer Intern",
				"Cybersecurity Analyst",
				"IT Operations Trainee",
				"Technical Consultant",
				"Solutions Engineer Graduate",
				"IT Business Analyst",
			],
		},
		{
			value: "sustainability",
			label: "Sustainability & ESG",
			emoji: "",
			roles: [
				"ESG Intern",
				"Sustainability Strategy Intern",
				"Junior ESG Analyst",
				"Sustainability Graduate Programme",
				"ESG Data Analyst Intern",
				"Corporate Responsibility Intern",
				"Environmental Analyst",
				"Sustainability Reporting Trainee",
				"Climate Analyst",
				"Sustainable Finance Analyst",
				"ESG Assurance Intern",
				"Sustainability Communications Intern",
				"Junior Impact Analyst",
				"Sustainability Operations Assistant",
				"Green Finance Analyst",
			],
		},
		{
			value: "unsure",
			label: "Not Sure Yet / General",
			emoji: "",
			roles: [
				"Graduate Trainee",
				"Rotational Graduate Program",
				"Management Trainee",
				"Business Graduate Analyst",
				"Entry Level Program Associate",
				"Future Leaders Programme",
				"General Analyst",
				"Operations Graduate",
				"Commercial Graduate",
				"Early Careers Program",
				"Project Coordinator",
				"Business Operations Analyst",
				"Emerging Leaders Associate",
				"Corporate Graduate Programme",
				"Generalist Trainee",
			],
		},
	];

	const COMPANIES = [
		"Global Consulting Firms",
		"Startups / Scaleups",
		"Tech Giants",
		"Investment Firms / VCs",
		"Multinationals",
		"Public Sector / NGOs",
		"B2B SaaS",
		"Financial Services",
	];

	// Form validation hooks
	const emailValidation = useEmailValidation(formData.email);
	const nameValidation = useRequiredValidation(formData.fullName, "Full name");
	const citiesValidation = useRequiredValidation(
		formData.cities,
		"Preferred cities",
	);
	const languagesValidation = useRequiredValidation(
		formData.languages,
		"Languages",
	);

	const handleSubmit = useCallback(async () => {
		setLoading(true);
		setError("");
		setFieldErrors({});

		try {
			const response = await apiCall("/api/signup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ...formData, tier: "premium" }),
			});

			const result = await response.json();

			if (response.ok) {
				// Show success state before redirect
				setSuccessState({ show: true, matchesCount: result.matchesCount || 0 });
				showToast.success("Account created successfully! Redirecting...");
				const redirectUrl =
					result.redirectUrl || `/signup/success?tier=premium`;
				setTimeout(() => router.push(redirectUrl), 2000); // Increased delay to show success state
			} else {
				// Handle field-specific errors
				if (result.field && result.error) {
					setFieldErrors({ [result.field]: result.error });
					// Focus the problematic field
					if (result.field === "email" && formRefs.email.current) {
						formRefs.email.current.focus();
						setStep(1); // Navigate to step with the field
					} else if (result.field === "fullName" && formRefs.fullName.current) {
						formRefs.fullName.current.focus();
						setStep(1);
					}
					announce(result.error, "assertive");
				} else {
					const errorMessage =
						result.error ||
						"Unable to create account. Please check that your email is correct and try again. If the problem persists, contact support.";
					setError(errorMessage);
					showToast.error(errorMessage, {
						label: "Retry",
						onClick: () => handleSubmit(),
					});
				}
			}
		} catch (error) {
			const errorMessage =
				error instanceof ApiError
					? error.message
					: "Unable to connect. Please check your internet connection and try again.";
			setError(errorMessage);
			showToast.error(errorMessage, {
				label: "Retry",
				onClick: () => handleSubmit(),
			});
		} finally {
			setLoading(false);
		}
	}, [formData, router, announce, formRefs.email, formRefs.fullName]);

	// Keyboard shortcuts for power users
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Ctrl/Cmd + Enter to submit
			if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
				e.preventDefault();
				if (step === 4 && formData.gdprConsent && !loading) {
					handleSubmit();
				}
			}
			// Escape to go back
			if (e.key === "Escape" && step > 1) {
				e.preventDefault();
				setStep(step - 1);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [step, formData.gdprConsent, loading, handleSubmit]);

	// Announce validation errors to screen readers
	useEffect(() => {
		if (emailValidation.error) {
			announce(emailValidation.error, "assertive");
		}
	}, [emailValidation.error, announce]);

	const toggleArray = (arr: string[], value: string) => {
		return arr.includes(value)
			? arr.filter((v) => v !== value)
			: [...arr, value];
	};

	// Helper to determine if field error should be shown
	const shouldShowError = (
		fieldName: string,
		hasValue: boolean,
		isValid: boolean,
	) => {
		return (touchedFields.has(fieldName) || step === 1) && hasValue && !isValid;
	};

	// Helper to get disabled button message
	const getDisabledMessage = (stepNumber: number) => {
		if (stepNumber === 1) {
			const missing = [];
			if (!formData.fullName.trim()) missing.push("Full Name");
			if (!formData.email.trim() || !emailValidation.isValid)
				missing.push("Email");
			if (formData.cities.length === 0) missing.push("Preferred Cities");
			if (formData.languages.length === 0) missing.push("Languages");
			if (!formData.gdprConsent) missing.push("GDPR Consent");
			if (missing.length === 0) return "Continue to Preferences →";
			return `Complete: ${missing.join(", ")}`;
		} else if (stepNumber === 2) {
			const missing = [];
			if (!formData.visaStatus) missing.push("Work Authorization");
			if (formData.entryLevelPreferences.length === 0)
				missing.push("Entry Level Preferences");
			if (missing.length === 0) return "Continue to Career Path →";
			return `Complete: ${missing.join(", ")}`;
		} else if (stepNumber === 3) {
			const missing = [];
			if (!formData.careerPath) missing.push("Career Path");
			if (formData.roles.length === 0) missing.push("Role Selection");
			if (missing.length === 0) return "Complete Signup";
			return `Complete: ${missing.join(", ")}`;
		}
		return "";
	};

	const selectAllRoles = (careerPath: string) => {
		const career = CAREER_PATHS.find((c) => c.value === careerPath);
		if (career) {
			setFormData({ ...formData, roles: career.roles });
		}
	};

	const clearAllRoles = () => {
		setFormData({ ...formData, roles: [] });
	};

	return (
		<div className="min-h-screen bg-black relative overflow-hidden pb-safe">
			{/* Background Effects */}
			<div
				className="absolute inset-0 enhanced-grid opacity-30"
				aria-hidden="true"
			/>
			<motion.div
				className="absolute top-20 right-10 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl hidden sm:block"
				animate={
					prefersReduced
						? { scale: 1, opacity: 0.3 }
						: { scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }
				}
				transition={{ duration: 8, repeat: prefersReduced ? 0 : Infinity }}
				aria-hidden="true"
			/>
			<motion.div
				className="absolute bottom-20 left-10 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl hidden sm:block"
				animate={
					prefersReduced
						? { scale: 1, opacity: 0.3 }
						: { scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }
				}
				transition={{ duration: 10, repeat: prefersReduced ? 0 : Infinity }}
				aria-hidden="true"
			/>

			<div className="relative z-10 container-page max-w-5xl py-8 px-4 sm:py-16 sm:px-6 md:py-24">
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="mb-10 text-center sm:mb-16 md:mb-20"
				>
					<span className="mb-6 inline-flex items-center gap-2 rounded-full border-2 border-brand-500/50 bg-brand-500/15 px-5 py-2 text-sm font-bold text-brand-100 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
						<BrandIcons.Star className="h-4 w-4" />
						Premium · €5/mo
					</span>

					<span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.28em] text-brand-200">
						Onboarding
					</span>
					<h1 className="mt-4 sm:mt-6 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white">
						Tell us where to send your first matches
					</h1>
					<p className="mt-3 sm:mt-4 text-base sm:text-lg md:text-xl font-medium leading-relaxed text-zinc-100 px-2">
						We only ask for the essentials so we can filter internships and
						graduate roles you can actually land.
					</p>

					<div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm md:text-base font-medium text-zinc-100">
						{Copy.REASSURANCE_ITEMS.map((item) => (
							<span
								key={item}
								className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/8 px-4 py-2 backdrop-blur-sm"
							>
								<BrandIcons.Check className="h-4 w-4 text-brand-300" />
								{item}
							</span>
						))}
					</div>

					<div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm md:text-base font-medium text-zinc-300">
						<span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-4 py-2 text-brand-100 backdrop-blur-sm">
							<BrandIcons.Target className="h-4 w-4 text-brand-300" />
							{isLoadingStats ? (
								<span className="inline-block h-4 w-20 animate-pulse rounded bg-white/15" />
							) : (
								`${activeJobs} active jobs this week`
							)}
						</span>
						{!isLoadingStats &&
							totalUsers &&
							parseInt(totalUsers.replace(/\D/g, ""), 10) > 0 && (
								<span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-4 py-2 backdrop-blur-sm">
									<BrandIcons.Users className="h-4 w-4 text-brand-300" />
									{`${totalUsers}+ students on JobPing`}
								</span>
							)}
						<span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-4 py-2 backdrop-blur-sm">
							<BrandIcons.Clock className="h-4 w-4 text-brand-300" />
							First drop arrives within 48 hours
						</span>
					</div>
				</motion.div>

				{/* Progress Indicator */}
				<div className="mb-10 sm:mb-16">
					<div className="flex justify-between mb-3 sm:mb-4 px-1 sm:px-2">
						{[1, 2, 3, 4].map((i) => (
							<div key={i} className="flex items-center gap-1 sm:gap-3">
								<div
									className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-sm sm:text-base transition-all shadow-lg ${
										i < step
											? "bg-green-500 text-white shadow-green-500/30"
											: i === step
												? "bg-gradient-to-br from-brand-500 to-purple-600 text-white shadow-[0_0_24px_rgba(99,102,241,0.4)]"
												: "bg-zinc-800/60 border-2 border-zinc-700 text-zinc-400"
									}`}
								>
									{i < step ? <BrandIcons.Check className="h-6 w-6" /> : i}
								</div>
								<span className="hidden sm:inline text-sm font-bold text-zinc-300">
									{i === 1
										? "Basics"
										: i === 2
											? "Preferences"
											: i === 3
												? "Career"
												: "Optional"}
								</span>
								{i === 4 && (
									<span className="hidden sm:inline text-xs text-zinc-500 ml-1">
										(Optional)
									</span>
								)}
							</div>
						))}
					</div>
					<div className="h-2.5 bg-zinc-800/60 rounded-full overflow-hidden border border-zinc-700/50">
						<motion.div
							className="h-full bg-gradient-to-r from-brand-500 via-purple-600 to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.4)]"
							initial={{ width: 0 }}
							animate={{ width: `${(step / 4) * 100}%` }}
							transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
						/>
					</div>
					<div className="text-xs text-zinc-400 text-center mt-2">
						{Math.round((step / 4) * 100)}% complete
					</div>
				</div>

				{/* Form Abandonment Recovery Message */}

				{/* Success Message */}
				<AnimatePresence>
					{successState.show && (
						<motion.div
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							className="mb-6 p-6 bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-green-500/20 border-2 border-green-500/50 rounded-xl text-center"
							role="alert"
							aria-live="assertive"
						>
							<div className="flex items-center justify-center gap-3 mb-2">
								<BrandIcons.Check className="h-6 w-6 text-green-400" />
								<h3 className="text-xl font-bold text-green-400">
									Account Created Successfully!
								</h3>
							</div>
							<p className="text-green-300 text-base mb-2">
								{successState.matchesCount && successState.matchesCount > 0
									? `🎯 We found ${successState.matchesCount} perfect matches for you!`
									: "🎯 We're finding your perfect matches now..."}
							</p>
							<p className="text-green-200 text-sm">
								Check your email in the next few minutes for your first job
								matches.
							</p>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Error Message */}
				<AnimatePresence>
					{error && (
						<motion.div
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							className="mb-6 p-4 bg-red-500/10 border-2 border-red-500/50 rounded-xl text-red-400 text-center"
							role="alert"
							aria-live="assertive"
						>
							{error}
						</motion.div>
					)}
				</AnimatePresence>

				{/* ARIA Live Region for form validation */}
				{Announcement}

				{/* Form Container */}
				<div className="glass-card rounded-2xl sm:rounded-3xl border-2 border-white/20 p-4 sm:p-6 md:p-8 lg:p-14 shadow-[0_30px_100px_rgba(0,0,0,0.5)] backdrop-blur-xl">
					<AnimatePresence mode="wait">
						{/* Step 1: Basics */}
						{step === 1 && (
							<motion.div
								key="step1"
								initial={{ opacity: 0, x: 20 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: -20 }}
								transition={{ duration: 0.4 }}
								className="space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-12"
							>
								<div>
									<h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-2 sm:mb-3">
										Let's get started
									</h2>
									<p className="text-base sm:text-lg font-medium text-zinc-100">
										Tell us about yourself
									</p>
								</div>

								{/* GDPR Consent - MOVED TO STEP 1 (Required) */}
								<div className="bg-gradient-to-r from-brand-500/15 via-purple-600/15 to-brand-500/15 border-2 border-brand-500/40 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-7 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
									<label className="flex items-start gap-3 sm:gap-4 cursor-pointer group touch-manipulation">
										<input
											type="checkbox"
											id="gdpr-consent"
											checked={formData.gdprConsent}
											onChange={(e) => {
												setFormData({
													...formData,
													gdprConsent: e.target.checked,
												});
												setTouchedFields((prev) =>
													new Set(prev).add("gdprConsent"),
												);
											}}
											onBlur={() =>
												setTouchedFields((prev) =>
													new Set(prev).add("gdprConsent"),
												)
											}
											className="mt-1 w-6 h-6 sm:w-5 sm:h-5 rounded border-2 border-zinc-600 bg-zinc-800 checked:bg-brand-500 checked:border-brand-500 cursor-pointer touch-manipulation min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0"
											required
											aria-required="true"
											aria-describedby={
												shouldShowError(
													"gdprConsent",
													true,
													formData.gdprConsent,
												)
													? "gdpr-error"
													: undefined
											}
										/>
										<div className="flex-1">
											<p className="text-white font-medium mb-1">
												I agree to receive job recommendations via email{" "}
												<span className="text-red-400">*</span>
											</p>
											<p className="text-sm text-zinc-400">
												By checking this box, you consent to receive
												personalized job matches and agree to our{" "}
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
										</div>
									</label>
									{shouldShowError(
										"gdprConsent",
										true,
										formData.gdprConsent,
									) && (
										<FormFieldError
											error="Please check the box to agree to receive job recommendations"
											id="gdpr-error"
										/>
									)}
								</div>

								<div>
									<label
										htmlFor="fullName"
										className="block text-base sm:text-lg font-bold text-white mb-2 sm:mb-3"
									>
										Full Name *
									</label>
									<input
										ref={formRefs.fullName}
										id="fullName"
										type="text"
										value={formData.fullName}
										onChange={(e) => {
											setFormData({ ...formData, fullName: e.target.value });
											setFieldErrors((prev) => {
												const next = { ...prev };
												delete next.fullName;
												return next;
											});
										}}
										onFocus={(e) => {
											// Scroll input into view on mobile to prevent keyboard covering
											if (window.innerWidth < 768) {
												setTimeout(() => {
													e.target.scrollIntoView({
														behavior: "smooth",
														block: "center",
													});
												}, 300);
											}
										}}
										onBlur={() => {
											setTouchedFields((prev) => new Set(prev).add("fullName"));
											if (
												!formData.fullName.trim() &&
												formData.fullName.length > 0
											) {
												announce("Full name is required", "polite");
											} else if (formData.fullName.trim().length > 0) {
												announce("Full name is valid", "polite");
											}
										}}
										className={`w-full px-4 sm:px-6 py-4 sm:py-5 bg-black/50 border-2 rounded-xl sm:rounded-2xl text-white placeholder-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/30 transition-all text-base sm:text-lg font-medium backdrop-blur-sm touch-manipulation ${
											formData.fullName
												? nameValidation.isValid
													? "border-green-500/60 shadow-[0_0_20px_rgba(34,197,94,0.2)]"
													: fieldErrors.fullName || nameValidation.error
														? "border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
														: "border-zinc-700"
												: "border-zinc-700 hover:border-zinc-600"
										}`}
										placeholder="John Smith"
										autoComplete="name"
										aria-invalid={
											(formData.fullName.length > 0 &&
												!nameValidation.isValid) ||
											!!fieldErrors.fullName
										}
										aria-describedby={
											formData.fullName.length > 0
												? nameValidation.isValid
													? "fullName-success"
													: "fullName-error"
												: undefined
										}
										aria-required="true"
									/>
									{formData.fullName.length > 0 &&
										(nameValidation.isValid && !fieldErrors.fullName ? (
											<FormFieldSuccess
												message="Looks good!"
												id="fullName-success"
											/>
										) : (
											<FormFieldError
												error={fieldErrors.fullName || nameValidation.error}
												id="fullName-error"
											/>
										))}
								</div>

								<div>
									<label
										htmlFor="email"
										className="block text-base sm:text-lg font-bold text-white mb-2 sm:mb-3"
									>
										Email *
									</label>
									<p className="text-xs sm:text-sm font-medium text-zinc-300 mb-3 sm:mb-4">
										Get {SIGNUP_INITIAL_ROLES} jobs in your welcome email, then
										curated drops 3x per week (Mon/Wed/Fri).
									</p>
									<input
										ref={formRefs.email}
										id="email"
										type="email"
										value={formData.email}
										onChange={(e) => {
											setFormData({ ...formData, email: e.target.value });
											setFieldErrors((prev) => {
												const next = { ...prev };
												delete next.email;
												return next;
											});
										}}
										onFocus={(e) => {
											// Scroll input into view on mobile to prevent keyboard covering
											if (window.innerWidth < 768) {
												setTimeout(() => {
													e.target.scrollIntoView({
														behavior: "smooth",
														block: "center",
													});
												}, 300);
											}
										}}
										onBlur={() => {
											setTouchedFields((prev) => new Set(prev).add("email"));
											if (emailValidation.error || fieldErrors.email) {
												announce(
													fieldErrors.email || emailValidation.error || "",
													"assertive",
												);
											} else if (emailValidation.isValid) {
												announce("Email address is valid", "polite");
											}
										}}
										className={`w-full px-4 sm:px-6 py-4 sm:py-5 bg-black/50 border-2 rounded-xl sm:rounded-2xl text-white placeholder-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/30 transition-all text-base sm:text-lg font-medium backdrop-blur-sm touch-manipulation ${
											formData.email
												? emailValidation.isValid && !fieldErrors.email
													? "border-green-500/60 shadow-[0_0_20px_rgba(34,197,94,0.2)]"
													: emailValidation.error || fieldErrors.email
														? "border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
														: "border-zinc-700"
												: "border-zinc-700 hover:border-zinc-600"
										}`}
										placeholder="you@example.com"
										autoComplete="email"
										aria-invalid={
											(formData.email.length > 0 && !emailValidation.isValid) ||
											!!fieldErrors.email
										}
										aria-describedby={
											formData.email.length > 0
												? emailValidation.isValid && !fieldErrors.email
													? "email-success"
													: "email-error"
												: undefined
										}
										aria-required="true"
									/>
									{formData.email.length > 0 &&
										(emailValidation.isValid && !fieldErrors.email ? (
											<FormFieldSuccess
												message="Email looks good!"
												id="email-success"
											/>
										) : (
											<FormFieldError
												error={fieldErrors.email || emailValidation.error}
												id="email-error"
											/>
										))}
								</div>

								<div>
									<label
										id="cities-label"
										htmlFor="cities-field"
										className="block text-base font-bold text-white mb-3"
									>
										Preferred Cities *{" "}
										<span className="text-zinc-400 font-normal">
											(Select up to 3)
										</span>
									</label>
									<p className="text-sm text-zinc-400 mb-2">
										Choose up to 3 cities where you'd like to work. You can
										click on the map or use the buttons below.
									</p>
									<p className="text-xs text-zinc-500 mb-4">
										💡 We'll only show jobs in these cities. You can add more
										later in your preferences.
									</p>

									{/* Interactive Europe Map - Hidden on mobile */}
									<motion.div
										id="cities-field"
										aria-labelledby="cities-label"
										aria-describedby={
											shouldShowError(
												"cities",
												formData.cities.length > 0,
												citiesValidation.isValid,
											)
												? "cities-error"
												: formData.cities.length > 0 && citiesValidation.isValid
													? "cities-success"
													: undefined
										}
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ duration: 0.5 }}
										className="mb-4 sm:mb-6 md:mb-8 lg:mb-10 hidden sm:block"
										onBlur={() =>
											setTouchedFields((prev) => new Set(prev).add("cities"))
										}
									>
										<EuropeMap
											selectedCities={formData.cities}
											onCityClick={(city) => {
												if (
													formData.cities.length < 3 ||
													formData.cities.includes(city)
												) {
													setFormData({
														...formData,
														cities: toggleArray(formData.cities, city),
													});
													setTouchedFields((prev) =>
														new Set(prev).add("cities"),
													);
													if (
														formData.cities.length === 0 &&
														!formData.cities.includes(city)
													) {
														announce(
															`Selected ${city}. ${formData.cities.length + 1} of 3 cities selected.`,
															"polite",
														);
													} else if (formData.cities.includes(city)) {
														announce(
															`Deselected ${city}. ${formData.cities.length - 1} of 3 cities selected.`,
															"polite",
														);
													}
												}
											}}
											maxSelections={3}
											className="w-full"
										/>
									</motion.div>

									{/* Mobile-friendly city chips */}
									<div
										className="grid grid-cols-2 gap-2 sm:hidden"
										role="group"
										aria-labelledby="cities-label"
									>
										{CITIES.map((city) => {
											const isSelected = formData.cities.includes(city);
											const isDisabled =
												!isSelected && formData.cities.length >= 3;
											return (
												<motion.button
													key={city}
													type="button"
													onClick={() => {
														if (isDisabled) {
															announce(
																"Maximum cities selected. Deselect one to choose another.",
																"polite",
															);
															return;
														}
														const nextCities = toggleArray(
															formData.cities,
															city,
														);
														setFormData({
															...formData,
															cities: nextCities,
														});
														if (nextCities.length > formData.cities.length) {
															announce(
																`Selected ${city}. ${nextCities.length} of 3 cities selected.`,
																"polite",
															);
														} else {
															announce(
																`Deselected ${city}. ${nextCities.length} of 3 cities selected.`,
																"polite",
															);
														}
													}}
													whileTap={{ scale: 0.97 }}
													className={`flex items-center justify-between rounded-xl border px-3 sm:px-4 py-3 sm:py-4 text-left text-sm font-medium transition-colors touch-manipulation min-h-[44px] ${
														isSelected
															? "border-brand-500 bg-brand-500/15 text-white shadow-glow-subtle"
															: isDisabled
																? "border-zinc-800 bg-zinc-900/40 text-zinc-500 cursor-not-allowed"
																: "border-zinc-700 bg-zinc-900/40 text-zinc-200 hover:border-zinc-500"
													}`}
													disabled={isDisabled}
												>
													<span>{city}</span>
													<span
														className={`text-xs font-semibold ${isSelected ? "text-brand-200" : "text-zinc-500"}`}
													>
														{isSelected ? "Selected" : "Tap"}
													</span>
												</motion.button>
											);
										})}
									</div>
									{formData.cities.length >= 3 && (
										<p className="mt-2 text-xs text-amber-400 sm:hidden">
											Maximum 3 cities selected. Deselect one to choose another.
										</p>
									)}

									{/* City Buttons Grid - REMOVED (redundant with map) */}
									{/* Map is sufficient for city selection */}
									<div className="mt-2 flex items-center justify-between">
										<p className="text-xs text-zinc-400">
											{formData.cities.length}/3 selected
										</p>
										{formData.cities.length > 0 && citiesValidation.isValid && (
											<FormFieldSuccess
												message={`${formData.cities.length} ${formData.cities.length === 1 ? "city" : "cities"} selected`}
												id="cities-success"
											/>
										)}
									</div>
									{formData.cities.length > 0 && (
										<p className="mt-1 text-xs text-zinc-300">
											{formData.cities.join(", ")}
										</p>
									)}
									{shouldShowError(
										"cities",
										formData.cities.length === 0,
										citiesValidation.isValid,
									) && (
										<FormFieldError
											error="Please select at least one city. You can click on the map or use the buttons below."
											id="cities-error"
										/>
									)}
									{formData.cities.length >= 3 && (
										<p className="text-xs text-amber-400 mt-1 hidden sm:block">
											Maximum 3 cities selected. Deselect one to choose another.
										</p>
									)}
								</div>

								<div>
									<label
										id="languages-label"
										htmlFor="languages-field"
										className="block text-base font-bold text-white mb-3"
									>
										Languages (Professional Level) *
									</label>
									<p className="text-sm text-zinc-400 mb-2">
										Select languages you can use professionally
									</p>
									<p className="text-xs text-zinc-500 mb-4">
										💡 We'll prioritize jobs that match your language skills.
									</p>
									<div
										id="languages-field"
										aria-labelledby="languages-label"
										aria-describedby={
											shouldShowError(
												"languages",
												formData.languages.length > 0,
												languagesValidation.isValid,
											)
												? "languages-error"
												: formData.languages.length > 0 &&
														languagesValidation.isValid
													? "languages-success"
													: undefined
										}
										onBlur={() =>
											setTouchedFields((prev) => new Set(prev).add("languages"))
										}
									>
										<LanguageSelector
											languages={LANGUAGES}
											selected={formData.languages}
											onChange={(lang) => {
												setFormData({
													...formData,
													languages: toggleArray(formData.languages, lang),
												});
												setTouchedFields((prev) =>
													new Set(prev).add("languages"),
												);
												if (formData.languages.length === 0) {
													announce(
														`Selected ${lang}. ${formData.languages.length + 1} language selected.`,
														"polite",
													);
												}
											}}
										/>
									</div>
									{formData.languages.length > 0 &&
										languagesValidation.isValid && (
											<FormFieldSuccess
												message={`${formData.languages.length} language${formData.languages.length > 1 ? "s" : ""} selected`}
												id="languages-success"
											/>
										)}
									{shouldShowError(
										"languages",
										formData.languages.length === 0,
										languagesValidation.isValid,
									) && (
										<FormFieldError
											error="Please select at least one language"
											id="languages-error"
										/>
									)}
								</div>

								<motion.button
									onClick={() => setStep(2)}
									disabled={
										!formData.fullName.trim() ||
										!formData.email.trim() ||
										!emailValidation.isValid ||
										formData.cities.length === 0 ||
										formData.languages.length === 0 ||
										!formData.gdprConsent
									}
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
									className="w-full bg-gradient-to-r from-brand-500 via-purple-500 to-brand-500 text-white font-bold text-base sm:text-lg md:text-xl py-4 sm:py-5 md:py-6 rounded-xl sm:rounded-2xl shadow-[0_20px_50px_rgba(99,102,241,0.4)] hover:shadow-[0_24px_60px_rgba(99,102,241,0.5)] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-[0_20px_50px_rgba(99,102,241,0.4)] touch-manipulation min-h-[48px] sm:min-h-[56px]"
								>
									{getDisabledMessage(1)}
								</motion.button>
							</motion.div>
						)}

						{/* Step 2: Preferences */}
						{step === 2 && (
							<motion.div
								key="step2"
								initial={{ opacity: 0, x: 20 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: -20 }}
								transition={{ duration: 0.4 }}
								className="relative"
							>
								<div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-brand-500/20 bg-gradient-to-br from-brand-500/10 via-[#12002b]/40 to-purple-600/15 px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8">
									<div className="pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full bg-brand-500/25 blur-3xl hidden sm:block" />
									<div className="pointer-events-none absolute -bottom-28 left-12 h-56 w-56 bg-purple-600/20 blur-[120px] hidden sm:block" />
									<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(155,106,255,0.15),transparent_55%)]" />
									<div className="relative z-10 space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-12">
										<div>
											<h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-2 sm:mb-3">
												Your preferences
											</h2>
											<p className="text-base sm:text-lg font-medium text-zinc-100">
												Help us match you perfectly
											</p>
											<p className="text-xs sm:text-sm font-medium text-zinc-300 mt-2">
												These fields improve the quality of your first 5 jobs.
											</p>

											{/* Progress Helper */}
											<div className="mt-4 rounded-2xl border border-brand-500/30 bg-gradient-to-r from-brand-500/10 via-purple-600/10 to-brand-500/10 p-4 shadow-glow-subtle">
												<h3 className="text-sm font-bold text-white/80 mb-2">
													Required for next step:
												</h3>
												<div className="space-y-1 text-sm">
													<div
														className={`flex items-center gap-2 ${formData.visaStatus ? "text-brand-200" : "text-zinc-300"}`}
													>
														<span
															className={`w-2 h-2 rounded-full ${formData.visaStatus ? "bg-brand-400" : "bg-zinc-500"}`}
														></span>
														Visa Status
													</div>
													<div
														className={`flex items-center gap-2 ${formData.entryLevelPreferences.length > 0 ? "text-brand-200" : "text-zinc-300"}`}
													>
														<span
															className={`w-2 h-2 rounded-full ${formData.entryLevelPreferences.length > 0 ? "bg-brand-400" : "bg-zinc-500"}`}
														></span>
														Entry Level Preferences (
														{formData.entryLevelPreferences.length}/1+ selected)
													</div>
												</div>
											</div>
										</div>

										<div>
											<label className="block text-base font-bold text-white mb-3">
												Work Environment
											</label>
											<p className="text-sm text-zinc-200 mb-4">
												Where would you like to work?
											</p>
											<WorkEnvironmentSelector
												selected={formData.workEnvironment}
												onChange={(env) =>
													setFormData({
														...formData,
														workEnvironment: toggleArray(
															formData.workEnvironment,
															env,
														),
													})
												}
											/>
										</div>

										<div>
											<label
												id="visa-label"
												htmlFor="visa-field"
												className="block text-base font-bold text-white mb-3"
											>
												Work Authorization *
											</label>
											<p className="text-sm text-zinc-200 mb-3">
												Select your work authorization status in the EU/UK
											</p>
											<div
												id="visa-field"
												role="group"
												aria-labelledby="visa-label"
												aria-describedby={
													shouldShowError(
														"visaStatus",
														!!formData.visaStatus,
														!!formData.visaStatus,
													)
														? "visa-error"
														: undefined
												}
												className="space-y-2"
												onBlur={() =>
													setTouchedFields((prev) =>
														new Set(prev).add("visaStatus"),
													)
												}
											>
												{[
													"EU citizen",
													"EEA citizen (Iceland, Liechtenstein, Norway)",
													"Swiss citizen",
													"UK citizen",
													"Dual EU & UK citizenship",
													"Student Visa (EU)",
													"Student Visa (Non-EU)",
													"Non-EU (require sponsorship)",
													"Non-UK (require sponsorship)",
												].map((visa) => (
													<motion.button
														key={visa}
														type="button"
														onClick={() => {
															setFormData({ ...formData, visaStatus: visa });
															setTouchedFields((prev) =>
																new Set(prev).add("visaStatus"),
															);
														}}
														whileHover={{ scale: 1.01 }}
														whileTap={{ scale: 0.99 }}
														className={`w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl border-2 transition-all font-medium text-left touch-manipulation min-h-[48px] ${
															formData.visaStatus === visa
																? "border-brand-500 bg-gradient-to-r from-brand-500/20 to-purple-600/10 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]"
																: "border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:border-zinc-600"
														}`}
													>
														{visa}
													</motion.button>
												))}
											</div>
											{shouldShowError(
												"visaStatus",
												!formData.visaStatus,
												!!formData.visaStatus,
											) && (
												<FormFieldError
													error="Please select your work authorization status"
													id="visa-error"
												/>
											)}
										</div>

										<div>
											<label
												id="entry-level-label"
												htmlFor="entry-level-field"
												className="block text-base font-bold text-white mb-3"
											>
												Entry Level Preference *
											</label>
											<p className="text-sm text-zinc-200 mb-4">
												What type of roles are you looking for?
											</p>
											<div
												id="entry-level-field"
												aria-labelledby="entry-level-label"
												aria-describedby={
													shouldShowError(
														"entryLevelPreferences",
														formData.entryLevelPreferences.length > 0,
														formData.entryLevelPreferences.length > 0,
													)
														? "entry-level-error"
														: formData.entryLevelPreferences.length > 0
															? "entry-level-success"
															: undefined
												}
												onBlur={() =>
													setTouchedFields((prev) =>
														new Set(prev).add("entryLevelPreferences"),
													)
												}
											>
												<EntryLevelSelector
													selected={formData.entryLevelPreferences}
													onChange={(pref) => {
														setFormData({
															...formData,
															entryLevelPreferences: toggleArray(
																formData.entryLevelPreferences,
																pref,
															),
														});
														setTouchedFields((prev) =>
															new Set(prev).add("entryLevelPreferences"),
														);
													}}
												/>
											</div>
											{formData.entryLevelPreferences.length > 0 && (
												<>
													<FormFieldSuccess
														message={`${formData.entryLevelPreferences.length} preference${formData.entryLevelPreferences.length > 1 ? "s" : ""} selected`}
														id="entry-level-success"
													/>
													<p className="text-sm text-zinc-200 mt-2">
														<span className="font-bold text-brand-200">
															{formData.entryLevelPreferences.length}
														</span>{" "}
														selected
													</p>
												</>
											)}
											{shouldShowError(
												"entryLevelPreferences",
												formData.entryLevelPreferences.length === 0,
												formData.entryLevelPreferences.length > 0,
											) && (
												<FormFieldError
													error="Please select at least one entry level preference"
													id="entry-level-error"
												/>
											)}
										</div>

										<div>
											<label className="block text-base font-bold text-white mb-3">
												Target Companies
											</label>
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
												{COMPANIES.map((company) => (
													<motion.button
														key={company}
														type="button"
														onClick={() =>
															setFormData({
																...formData,
																targetCompanies: toggleArray(
																	formData.targetCompanies,
																	company,
																),
															})
														}
														whileHover={{ scale: 1.01 }}
														whileTap={{ scale: 0.99 }}
														className={`px-4 py-3 rounded-xl border-2 transition-all font-medium text-left text-sm ${
															formData.targetCompanies.includes(company)
																? "border-brand-500 bg-gradient-to-r from-brand-500/20 to-purple-600/10 text-white"
																: "border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:border-zinc-600"
														}`}
													>
														{company}
													</motion.button>
												))}
											</div>
										</div>

										<div className="flex gap-3 sm:gap-4 pt-4 sm:pt-6">
											<motion.button
												onClick={() => setStep(1)}
												whileHover={{ scale: 1.02 }}
												whileTap={{ scale: 0.98 }}
												className="flex-1 py-4 sm:py-5 text-base sm:text-lg font-bold border-2 border-white/25 bg-white/[0.08] text-white rounded-xl sm:rounded-2xl hover:border-brand-500/50 hover:bg-white/12 transition-all touch-manipulation min-h-[48px] sm:min-h-[56px]"
											>
												← Back
											</motion.button>
											<motion.button
												onClick={() => setStep(3)}
												disabled={
													!formData.visaStatus ||
													formData.entryLevelPreferences.length === 0
												}
												whileHover={{ scale: 1.02 }}
												className={`relative flex-1 py-4 sm:py-6 md:py-7 text-base sm:text-xl md:text-2xl font-black uppercase tracking-wide rounded-xl sm:rounded-2xl overflow-hidden transition-all touch-manipulation min-h-[48px] sm:min-h-[56px] md:min-h-[64px] ${
													!formData.visaStatus ||
													formData.entryLevelPreferences.length === 0
														? "opacity-40 cursor-not-allowed bg-zinc-700 text-zinc-400"
														: "bg-gradient-to-r from-brand-500 to-purple-600 text-white shadow-[0_20px_50px_rgba(99,102,241,0.4)] hover:shadow-[0_24px_60px_rgba(99,102,241,0.5)] hover:scale-105"
												}`}
												whileTap={{ scale: 0.98 }}
											>
												{getDisabledMessage(2)}
											</motion.button>
										</div>
									</div>
								</div>
							</motion.div>
						)}

						{/* Step 3: Career Path */}
						{step === 3 && (
							<motion.div
								key="step3"
								initial={{ opacity: 0, x: 20 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: -20 }}
								transition={{ duration: 0.4 }}
								className="relative"
							>
								<div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-brand-500/20 bg-gradient-to-br from-brand-500/10 via-[#130433]/45 to-purple-600/15 px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8">
									<div className="pointer-events-none absolute -top-24 left-6 h-48 w-48 rounded-full bg-purple-600/25 blur-3xl hidden sm:block" />
									<div className="pointer-events-none absolute -bottom-28 right-0 h-56 w-56 bg-brand-500/25 blur-[120px] hidden sm:block" />
									<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(99,102,241,0.12),transparent_60%)]" />
									<div className="relative z-10 space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-12">
										<div>
											<h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-2 sm:mb-3">
												Your career path
											</h2>
											<p className="text-base sm:text-lg font-medium text-zinc-100">
												What type of roles interest you?
											</p>

											{/* Progress Helper */}
											<div className="mt-6 rounded-2xl border-2 border-brand-500/40 bg-gradient-to-r from-brand-500/15 via-purple-600/15 to-brand-500/15 p-5 shadow-[0_0_30px_rgba(99,102,241,0.25)]">
												<h3 className="text-sm font-bold text-white/80 mb-2">
													Required for next step:
												</h3>
												<div className="space-y-1 text-sm">
													<div
														className={`flex items-center gap-2 ${formData.careerPath ? "text-brand-200" : "text-zinc-300"}`}
													>
														<span
															className={`w-2 h-2 rounded-full ${formData.careerPath ? "bg-brand-400" : "bg-zinc-500"}`}
														></span>
														Career Path Selection
													</div>
													<div
														className={`flex items-center gap-2 ${formData.roles.length > 0 ? "text-brand-200" : "text-zinc-300"}`}
													>
														<span
															className={`w-2 h-2 rounded-full ${formData.roles.length > 0 ? "bg-brand-400" : "bg-zinc-500"}`}
														></span>
														Role Selection ({formData.roles.length}/1+ selected)
													</div>
												</div>
											</div>
										</div>

										<div>
											<label
												id="career-path-label"
												htmlFor="career-path-field"
												className="block text-base font-bold text-white mb-4"
											>
												Select Your Career Path *
											</label>
											<p className="text-sm text-zinc-400 mb-6">
												Choose the career path that interests you most
											</p>
											<div
												id="career-path-field"
												role="group"
												aria-labelledby="career-path-label"
												aria-describedby={
													shouldShowError(
														"careerPath",
														!!formData.careerPath,
														!!formData.careerPath,
													)
														? "career-path-error"
														: undefined
												}
												className="grid grid-cols-1 sm:grid-cols-2 gap-4"
												onBlur={() =>
													setTouchedFields((prev) =>
														new Set(prev).add("careerPath"),
													)
												}
											>
												{CAREER_PATHS.map((path) => (
													<motion.button
														key={path.value}
														type="button"
														onClick={() => {
															const newCareer = CAREER_PATHS.find(
																(c) => c.value === path.value,
															);
															if (newCareer) {
																const validRoles = formData.roles.filter(
																	(role) => newCareer.roles.includes(role),
																);
																setFormData({
																	...formData,
																	careerPath: path.value,
																	roles: validRoles,
																});
															}
														}}
														whileHover={{ scale: 1.02, y: -3 }}
														whileTap={{ scale: 0.98 }}
														className={`relative px-4 sm:px-6 py-4 sm:py-6 rounded-xl sm:rounded-2xl border-2 transition-all text-left overflow-hidden group touch-manipulation min-h-[80px] sm:min-h-[100px] ${
															formData.careerPath === path.value
																? "border-brand-500 bg-gradient-to-br from-brand-500/20 to-purple-600/15 shadow-glow-signup"
																: "border-zinc-700 bg-zinc-900/40 hover:border-zinc-600 hover:bg-zinc-900/60"
														}`}
													>
														{/* Background gradient on select */}
														{formData.careerPath === path.value && (
															<motion.div
																className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-purple-600/5"
																initial={{ opacity: 0 }}
																animate={{ opacity: 1 }}
																transition={{ duration: 0.3 }}
															/>
														)}

														<div className="relative flex items-start gap-4">
															{/* Large emoji icon */}
															<motion.div
																className={`text-4xl sm:text-5xl ${
																	formData.careerPath === path.value
																		? "scale-110"
																		: ""
																}`}
																animate={
																	formData.careerPath === path.value
																		? { scale: 1.1 }
																		: { scale: 1 }
																}
																transition={{ duration: 0.2 }}
															>
																{path.emoji}
															</motion.div>

															{/* Content */}
															<div className="flex-1 min-w-0">
																<div
																	className={`font-bold text-lg mb-1 ${
																		formData.careerPath === path.value
																			? "text-white"
																			: "text-zinc-200"
																	}`}
																>
																	{path.label}
																</div>
																<div className="flex items-center gap-2 text-xs text-zinc-400">
																	<BrandIcons.Briefcase className="w-3.5 h-3.5" />
																	<span>
																		{path.roles.length} roles available
																	</span>
																</div>
															</div>

															{/* Selection indicator */}
															{formData.careerPath === path.value && (
																<motion.div
																	initial={{ scale: 0, rotate: -180 }}
																	animate={{ scale: 1, rotate: 0 }}
																	className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-glow-subtle"
																>
																	<BrandIcons.Check className="w-5 h-5 text-white" />
																</motion.div>
															)}
														</div>

														{/* Glow effect on hover */}
														{formData.careerPath !== path.value && (
															<div className="absolute inset-0 bg-gradient-to-br from-brand-500/0 to-purple-600/0 group-hover:from-brand-500/5 group-hover:to-purple-600/5 transition-all duration-300" />
														)}
													</motion.button>
												))}
											</div>
											{shouldShowError(
												"careerPath",
												!formData.careerPath,
												!!formData.careerPath,
											) && (
												<FormFieldError
													error="Please select a career path"
													id="career-path-error"
												/>
											)}
										</div>

										{(() => {
											const selectedCareer = CAREER_PATHS.find(
												(c) => c.value === formData.careerPath,
											);
											if (!selectedCareer) return null;

											return (
												<motion.div
													initial={{ opacity: 0, y: 10 }}
													animate={{ opacity: 1, y: 0 }}
													transition={{ delay: 0.2 }}
													className="border-2 border-brand-500/30 rounded-2xl p-6 bg-gradient-to-br from-brand-500/5 to-purple-600/5"
												>
													<label
														id="roles-label"
														htmlFor="roles-field"
														className="block text-lg font-black text-white mb-4"
													>
														<span className="text-2xl mr-2">
															{selectedCareer.emoji}
														</span>
														{selectedCareer.label} Roles
														<span className="text-zinc-400 font-normal text-base ml-2">
															(Select at least one - required)
														</span>
													</label>

													{/* Select All / Clear All Controls */}
													<div className="flex flex-col sm:flex-row gap-2 mb-4">
														<motion.button
															type="button"
															onClick={() =>
																selectAllRoles(formData.careerPath)
															}
															whileHover={{ scale: 1.02 }}
															whileTap={{ scale: 0.98 }}
															className="px-4 py-3 sm:py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-lg transition-colors shadow-glow-subtle hover:shadow-glow-medium touch-manipulation min-h-[44px]"
															title={`Select all ${selectedCareer.roles.length} roles in ${selectedCareer.label}`}
														>
															Select All {selectedCareer.roles.length} Roles
														</motion.button>
														<motion.button
															type="button"
															onClick={clearAllRoles}
															whileHover={{ scale: 1.02 }}
															whileTap={{ scale: 0.98 }}
															className="px-4 py-3 sm:py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm font-semibold rounded-lg transition-colors touch-manipulation min-h-[44px]"
															title="Clear all selected roles"
														>
															Clear All
														</motion.button>
													</div>

													<div
														id="roles-field"
														role="group"
														aria-labelledby="roles-label"
														aria-describedby={
															shouldShowError(
																"roles",
																formData.roles.length > 0,
																formData.roles.length > 0,
															)
																? "roles-error"
																: formData.roles.length > 0
																	? "roles-success"
																	: undefined
														}
														className="max-h-[350px] overflow-y-auto custom-scrollbar pr-2 -mr-2"
														onBlur={() =>
															setTouchedFields((prev) =>
																new Set(prev).add("roles"),
															)
														}
													>
														<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
															{selectedCareer.roles.map(
																(role: string, idx: number) => (
																	<motion.button
																		key={role}
																		type="button"
																		onClick={() =>
																			setFormData({
																				...formData,
																				roles: toggleArray(
																					formData.roles,
																					role,
																				),
																			})
																		}
																		initial={{ opacity: 0, x: -10 }}
																		animate={{ opacity: 1, x: 0 }}
																		transition={{ delay: idx * 0.02 }}
																		whileHover={{ scale: 1.02, x: 2 }}
																		whileTap={{ scale: 0.98 }}
																		className={`px-3 sm:px-4 py-3 sm:py-3.5 rounded-xl border-2 transition-all font-semibold text-left text-xs sm:text-sm relative overflow-hidden touch-manipulation min-h-[44px] ${
																			formData.roles.includes(role)
																				? "border-brand-500 bg-gradient-to-r from-brand-500/20 to-purple-600/15 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]"
																				: "border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:border-brand-500/40 hover:bg-zinc-900/80"
																		}`}
																	>
																		{formData.roles.includes(role) && (
																			<motion.div
																				layoutId="selected-role"
																				className="absolute inset-0 bg-gradient-to-r from-brand-500/10 to-purple-600/10 -z-10"
																				initial={{ opacity: 0 }}
																				animate={{ opacity: 1 }}
																				exit={{ opacity: 0 }}
																			/>
																		)}
																		<span className="flex items-center justify-between">
																			{role}
																			{formData.roles.includes(role) && (
																				<svg
																					className="w-5 h-5 text-brand-400"
																					fill="none"
																					viewBox="0 0 24 24"
																					stroke="currentColor"
																				>
																					<path
																						strokeLinecap="round"
																						strokeLinejoin="round"
																						strokeWidth={2}
																						d="M5 13l4 4L19 7"
																					/>
																				</svg>
																			)}
																		</span>
																	</motion.button>
																),
															)}
														</div>
													</div>
													{formData.roles.length > 0 && (
														<FormFieldSuccess
															message={`${formData.roles.length} role${formData.roles.length > 1 ? "s" : ""} selected`}
															id="roles-success"
														/>
													)}
													{shouldShowError(
														"roles",
														formData.roles.length === 0,
														formData.roles.length > 0,
													) && (
														<FormFieldError
															error="Please select at least one role"
															id="roles-error"
														/>
													)}
												</motion.div>
											);
										})()}

										<div className="flex gap-3 sm:gap-4 pt-4 sm:pt-6">
											<motion.button
												onClick={() => setStep(2)}
												whileHover={{ scale: 1.02 }}
												whileTap={{ scale: 0.98 }}
												className="btn-secondary flex-1 py-4 sm:py-5 text-base sm:text-lg touch-manipulation min-h-[48px] sm:min-h-[56px]"
												disabled={loading}
											>
												← Back
											</motion.button>
											<motion.button
												onClick={() => setStep(4)}
												disabled={
													!formData.careerPath || formData.roles.length === 0
												}
												whileHover={{ scale: loading ? 1 : 1.03 }}
												whileTap={{ scale: loading ? 1 : 0.97 }}
												className="relative flex-1 py-4 sm:py-6 md:py-7 text-base sm:text-xl md:text-2xl font-black disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 uppercase tracking-wide rounded-xl sm:rounded-2xl overflow-hidden touch-manipulation min-h-[48px] sm:min-h-[56px] md:min-h-[64px]"
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
												{!loading && (
													<motion.div
														className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
														animate={{
															x: ["-200%", "200%"],
														}}
														transition={{
															duration: 2,
															repeat: Infinity,
															repeatDelay: 1,
															ease: "easeInOut",
														}}
													/>
												)}
												<span className="relative z-10 text-white flex items-center justify-center gap-3">
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
															<span>→</span>
															<span>{getDisabledMessage(3)}</span>
															<motion.span
																animate={{ x: [0, 4, 0] }}
																transition={{
																	duration: 1,
																	repeat: Infinity,
																	repeatDelay: 0.5,
																}}
															>
																→
															</motion.span>
														</>
													)}
												</span>
											</motion.button>
										</div>
									</div>
								</div>
							</motion.div>
						)}

						{/* STEP 4: Matching Preferences */}
						{step === 4 && (
							<motion.div
								key="step4"
								initial={{ opacity: 0, x: 20 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: -20 }}
								transition={{ duration: 0.4 }}
								className="relative"
							>
								<div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-brand-500/20 bg-gradient-to-br from-brand-500/10 via-[#0d0425]/45 to-purple-600/15 px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8">
									<div className="pointer-events-none absolute -top-28 right-8 h-52 w-52 rounded-full bg-brand-500/25 blur-[120px] hidden sm:block" />
									<div className="pointer-events-none absolute -bottom-24 left-6 h-48 w-48 rounded-full bg-purple-600/20 blur-3xl hidden sm:block" />
									<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(136,84,255,0.12),transparent_60%)]" />
									<div className="relative z-10 space-y-6 sm:space-y-8 md:space-y-10">
										<div className="text-center">
											<h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
												Additional Preferences
											</h2>
											<p className="text-sm sm:text-base text-zinc-200 mb-4">
												Optional - helps us match you even better
											</p>
											<motion.button
												type="button"
												onClick={() => {
													if (formData.gdprConsent) {
														handleSubmit();
													} else {
														const gdprCheckbox = document.querySelector(
															'input[type="checkbox"]',
														) as HTMLInputElement;
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
												className="text-brand-300 hover:text-brand-200 text-sm font-semibold underline"
											>
												Skip Optional Fields →
											</motion.button>
										</div>

										{/* Industry Preferences */}
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
																industries: toggleArray(
																	formData.industries,
																	industry,
																),
															})
														}
														whileHover={{ scale: 1.02 }}
														whileTap={{ scale: 0.98 }}
														className={`px-3 py-2.5 rounded-lg border-2 transition-all font-medium text-sm ${
															formData.industries.includes(industry)
																? "border-brand-500 bg-gradient-to-r from-brand-500/20 to-purple-600/10 text-white"
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
																? "border-brand-500 bg-gradient-to-br from-brand-500/20 to-purple-600/10 text-white shadow-glow-subtle"
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
											<h3 className="text-xl font-bold text-white">
												Career Keywords
											</h3>
											<p className="text-sm text-zinc-400">
												Describe what you're looking for in your own words
												(optional)
											</p>
											<p className="text-xs text-zinc-400">
												Examples: "customer-facing", "data-driven", "creative
												problem-solving", "client interaction", "analytical
												work"
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
														className={`px-3 py-2 rounded-lg border-2 transition-all font-medium text-xs ${
															formData.skills.includes(skill)
																? "border-brand-500 bg-gradient-to-r from-brand-500/20 to-purple-600/10 text-white"
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

										<div className="flex gap-3 sm:gap-4 pt-4 sm:pt-6">
											<motion.button
												onClick={() => setStep(3)}
												whileHover={{ scale: 1.02 }}
												whileTap={{ scale: 0.98 }}
												className="btn-secondary flex-1 py-4 sm:py-5 text-base sm:text-lg touch-manipulation min-h-[48px] sm:min-h-[56px]"
											>
												← Back
											</motion.button>
											<motion.button
												onClick={handleSubmit}
												disabled={loading}
												whileHover={{ scale: loading ? 1 : 1.03 }}
												whileTap={{ scale: loading ? 1 : 0.97 }}
												className="relative flex-1 py-4 sm:py-6 md:py-7 text-base sm:text-xl md:text-2xl font-black disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 uppercase tracking-wide rounded-xl sm:rounded-2xl overflow-hidden touch-manipulation min-h-[48px] sm:min-h-[56px] md:min-h-[64px]"
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
														<span>→</span>
														<span>Find my matches</span>
														<motion.span
															animate={{ x: [0, 4, 0] }}
															transition={{
																duration: 1,
																repeat: Infinity,
																repeatDelay: 0.5,
															}}
														>
															→
														</motion.span>
													</>
												)}
											</motion.button>
										</div>
									</div>
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</div>

				{/* Trust Signals - PROMINENT */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.6 }}
					className="mt-12 text-center space-y-4"
				>
					<div className="inline-flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 px-6 py-3 rounded-full backdrop-blur-sm">
						<span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
						<span className="text-sm font-bold text-zinc-300">
							{isLoadingStats ? (
								<span className="inline-block w-24 h-4 bg-zinc-600/20 rounded animate-pulse"></span>
							) : (
								`${activeJobs} active early-career roles`
							)}
						</span>
						<span className="text-zinc-400">·</span>
						<span className="text-sm text-zinc-400">Updated daily</span>
					</div>
					<div className="flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-400 px-4">
						<div className="flex items-center gap-1.5">
							<svg
								className="w-4 h-4 text-green-500"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M5 13l4 4L19 7"
								/>
							</svg>
							<span>No CV required</span>
						</div>
						<span className="text-zinc-700">·</span>
						<div className="flex items-center gap-1.5">
							<svg
								className="w-4 h-4 text-green-500"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M5 13l4 4L19 7"
								/>
							</svg>
							<span>Unsubscribe anytime</span>
						</div>
					</div>
				</motion.div>
			</div>
		</div>
	);
}

// Wrap in Suspense to handle useSearchParams
export default function SignupPage() {
	return (
		<ErrorBoundary>
			<Suspense
				fallback={
					<div className="min-h-screen bg-black flex items-center justify-center">
						<div className="text-white text-xl">Loading...</div>
					</div>
				}
			>
				<SignupForm />
			</Suspense>
		</ErrorBoundary>
	);
}
