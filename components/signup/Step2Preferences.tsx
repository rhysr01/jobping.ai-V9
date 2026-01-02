"use client";

import { motion } from "framer-motion";
import EntryLevelSelector from "@/components/ui/EntryLevelSelector";
import {
	FormFieldError,
	FormFieldSuccess,
} from "@/components/ui/FormFieldFeedback";
import WorkEnvironmentSelector from "@/components/ui/WorkEnvironmentSelector";
import { COMPANIES } from "./constants";
import type { SignupFormData } from "./types";

interface Step2PreferencesProps {
	formData: SignupFormData;
	setFormData: React.Dispatch<React.SetStateAction<SignupFormData>>;
	touchedFields: Set<string>;
	setTouchedFields: React.Dispatch<React.SetStateAction<Set<string>>>;
	loading: boolean;
	setStep: (step: number) => void;
	shouldShowError: (
		fieldName: string,
		hasValue: boolean,
		isValid: boolean,
	) => boolean;
	getDisabledMessage: (stepNumber: number) => string;
	toggleArray: (arr: string[], value: string) => string[];
}

export function Step2Preferences({
	formData,
	setFormData,
	touchedFields: _touchedFields,
	setTouchedFields,
	loading,
	setStep,
	shouldShowError,
	getDisabledMessage,
	toggleArray,
}: Step2PreferencesProps) {
	return (
		<motion.div
			key="step2"
			initial={{ opacity: 0, x: 20 }}
			animate={{ opacity: 1, x: 0 }}
			exit={{ opacity: 0, x: -20 }}
			transition={{ duration: 0.4 }}
			className="relative"
		>
			<div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-brand-500/20 bg-gradient-to-br from-brand-500/10 via-[#12002b]/40 to-brand-700/15 px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8">
				<div
					className="pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full bg-brand-500/25 blur-3xl hidden sm:block"
					aria-hidden="true"
				/>
				<div
					className="pointer-events-none absolute -bottom-28 left-12 h-56 w-56 bg-brand-700/20 blur-[120px] hidden sm:block"
					aria-hidden="true"
				/>
				<div
					className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(155,106,255,0.15),transparent_55%)]"
					aria-hidden="true"
				/>
				<div className="relative z-10 space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-12">
					<div>
						<h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-2 sm:mb-3">
							Your preferences
						</h2>
						<p className="text-base sm:text-lg font-medium text-zinc-100">
							Help us match you perfectly
						</p>
						<p className="text-sm font-medium text-zinc-300 mt-2">
							These fields improve the quality of your first 5 jobs.
						</p>

						{/* Progress Helper */}
						<div className="mt-4 rounded-2xl border border-brand-500/30 bg-gradient-to-r from-brand-500/10 via-brand-700/10 to-brand-500/10 p-4 shadow-glow-subtle">
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
									Role Type ({formData.entryLevelPreferences.length}/1+
									selected)
								</div>
							</div>
						</div>
					</div>

					<div>
						<label
							htmlFor="work-environment-field"
							className="block text-base font-bold text-white mb-3"
						>
							Work Environment
						</label>
						<p className="text-sm text-zinc-200 mb-4">
							Where would you like to work?
						</p>
						<div id="work-environment-field">
							<WorkEnvironmentSelector
								selected={formData.workEnvironment}
								onChange={(env) =>
									setFormData({
										...formData,
										workEnvironment: toggleArray(formData.workEnvironment, env),
									})
								}
							/>
						</div>
					</div>

					<div>
						<label
							id="visa-label"
							htmlFor="visa-field"
							className="block text-base font-bold text-white mb-3"
						>
							Do you require visa sponsorship? *
						</label>
						<p className="text-sm text-zinc-200 mb-3">
							We ask this so we can filter for companies that provide visa
							sponsorship for your specific region
						</p>
						<fieldset
							id="visa-field"
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
								setTouchedFields((prev) => new Set(prev).add("visaStatus"))
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
										setTouchedFields((prev) => new Set(prev).add("visaStatus"));
									}}
									whileHover={{ scale: 1.01 }}
									whileTap={{ scale: 0.99 }}
									className={`w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl border-2 transition-all font-medium text-left touch-manipulation min-h-[48px] ${
										formData.visaStatus === visa
											? "border-brand-500 bg-gradient-to-r from-brand-500/20 to-brand-700/10 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]"
											: "border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:border-zinc-600"
									}`}
								>
									{visa}
								</motion.button>
							))}
						</fieldset>
						{shouldShowError(
							"visaStatus",
							!formData.visaStatus,
							!!formData.visaStatus,
						) && (
							<FormFieldError
								error="Please select whether you require visa sponsorship"
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
							What type of roles are you looking for? *
						</label>
						<p className="text-sm text-zinc-200 mb-4">
							Select the experience levels you're interested in (internships,
							graduate roles, junior positions)
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
						<label
							htmlFor="target-companies-field"
							className="block text-base font-bold text-white mb-3"
						>
							Target Companies
						</label>
						<div
							id="target-companies-field"
							className="grid grid-cols-1 sm:grid-cols-2 gap-2"
						>
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
											? "border-brand-500 bg-gradient-to-r from-brand-500/20 to-brand-700/10 text-white"
											: "border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:border-zinc-600"
									}`}
								>
									{company}
								</motion.button>
							))}
						</div>
					</div>

					{/* Spacer for sticky button */}
					<div className="h-32 sm:h-0" aria-hidden="true" />

					{/* Sticky Submit Button */}
					<div className="sticky bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8">
						<div className="flex gap-3 sm:gap-4">
							<motion.button
								type="button"
								onClick={() => setStep(1)}
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								className="flex-1 py-4 sm:py-5 text-base sm:text-lg font-bold border-2 border-white/25 bg-white/[0.08] text-white rounded-xl sm:rounded-2xl hover:border-brand-500/50 hover:bg-white/12 transition-all touch-manipulation min-h-[56px]"
							>
								← Back
							</motion.button>
							<motion.button
								type="button"
								onClick={() => setStep(3)}
								disabled={
									loading ||
									!formData.visaStatus ||
									formData.entryLevelPreferences.length === 0
								}
								whileHover={{ scale: loading ? 1 : 1.02 }}
								whileTap={{ scale: loading ? 1 : 0.98 }}
								className={`relative flex-1 py-4 sm:py-6 md:py-7 text-base sm:text-xl md:text-2xl font-black uppercase tracking-wide rounded-xl sm:rounded-2xl overflow-hidden transition-all touch-manipulation min-h-[56px] ${
									loading ||
									!formData.visaStatus ||
									formData.entryLevelPreferences.length === 0
										? "opacity-40 cursor-not-allowed bg-zinc-700 text-zinc-400"
										: "bg-gradient-to-r from-brand-500 to-brand-700 text-white shadow-[0_20px_50px_rgba(99,102,241,0.4)] hover:shadow-[0_24px_60px_rgba(99,102,241,0.5)] hover:scale-105"
								}`}
							>
								{loading ? (
									<span className="flex items-center justify-center gap-2">
										<svg
											className="w-5 h-5 animate-spin"
											viewBox="0 0 24 24"
											fill="none"
											aria-hidden="true"
										>
											<title>Loading</title>
											<circle
												className="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												strokeWidth="4"
											/>
											<path
												className="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											/>
										</svg>
										Loading...
									</span>
								) : (
									getDisabledMessage(2)
								)}
							</motion.button>
						</div>
					</div>
				</div>
			</div>
		</motion.div>
	);
}
