"use client";

import { motion } from "framer-motion";
import React, { useRef } from "react";
import { CityChip } from "../ui/CityChip";
import EuropeMap from "../ui/EuropeMap";
import {
	FormFieldError,
	FormFieldSuccess,
} from "../ui/FormFieldFeedback";
import { Skeleton } from "../ui/Skeleton";
import LanguageSelector from "../ui/LanguageSelector";
import { SIGNUP_INITIAL_ROLES } from "../../lib/productMetrics";
import { showToast } from "../../lib/toast";
import { CITIES, LANGUAGES } from "./constants";
import type { SignupFormData } from "./types";

interface Step1BasicsProps {
	formData: SignupFormData;
	setFormData: React.Dispatch<React.SetStateAction<SignupFormData>>;
	touchedFields: Set<string>;
	setTouchedFields: React.Dispatch<React.SetStateAction<Set<string>>>;
	fieldErrors: Record<string, string>;
	setFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
	announce: (message: string, politeness?: "polite" | "assertive") => void;
	loading: boolean;
	setStep: (step: number) => void;
	emailValidation: { isValid: boolean; error?: string };
	nameValidation: { isValid: boolean; error?: string };
	citiesValidation: { isValid: boolean; error?: string };
	languagesValidation: { isValid: boolean; error?: string };
	shouldShowError: (
		fieldName: string,
		hasValue: boolean,
		isValid: boolean,
	) => boolean;
	getDisabledMessage: (stepNumber: number) => string;
	toggleArray: (arr: string[], value: string) => string[];
}

export const Step1Basics = React.memo(function Step1Basics({
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
	nameValidation,
	citiesValidation,
	languagesValidation,
	shouldShowError,
	getDisabledMessage,
	toggleArray,
}: Step1BasicsProps) {
	const formRefs = {
		fullName: useRef<HTMLInputElement>(null),
		email: useRef<HTMLInputElement>(null),
	};

	return (
		<motion.div
			key="step1"
			initial={{ opacity: 0, x: 20 }}
			animate={{ opacity: 1, x: 0 }}
			exit={{ opacity: 0, x: -20 }}
			transition={{ duration: 0.4 }}
			className="space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-12"
		>
			<div className="mb-6 sm:mb-8">
				<h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-2 sm:mb-3 bg-gradient-to-r from-white to-zinc-200 bg-clip-text text-transparent">
					Let's get started
				</h2>
				<p className="text-base sm:text-lg font-medium text-zinc-100 leading-relaxed">
					Tell us about yourself
				</p>
			</div>

			<div>
				<label
					htmlFor="fullName"
					className="block text-base sm:text-lg font-bold text-white mb-2 sm:mb-3 flex items-center gap-2"
				>
					<span>Full Name</span>
					<span className="text-red-400 text-sm" aria-label="required">*</span>
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
					onBlur={() => {
						setTouchedFields((prev) => new Set(prev).add("fullName"));
						if (!formData.fullName.trim() && formData.fullName.length > 0) {
							announce("Full name is required", "polite");
						} else if (formData.fullName.trim().length > 0) {
							announce("Full name is valid", "polite");
						}
					}}
					className={`w-full px-4 sm:px-6 py-4 sm:py-5 min-h-[56px] bg-black/50 border-2 rounded-xl sm:rounded-2xl text-white placeholder-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/30 focus:ring-offset-2 focus:ring-offset-black transition-all text-base sm:text-lg font-medium backdrop-blur-sm touch-manipulation ${
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
					autoCorrect="off"
					autoCapitalize="words"
					aria-invalid={
						(formData.fullName.length > 0 && !nameValidation.isValid) ||
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
						<FormFieldSuccess message="Looks good!" id="fullName-success" />
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
					className="block text-base sm:text-lg font-bold text-white mb-2 sm:mb-3 flex items-center gap-2"
				>
					<span>Email</span>
					<span className="text-red-400 text-sm" aria-label="required">*</span>
				</label>
				<p id="email-help" className="text-sm font-medium text-zinc-300 mb-3 sm:mb-4 leading-relaxed">
					Get {SIGNUP_INITIAL_ROLES} jobs in your welcome email, then curated
					drops 3x per week (Mon/Wed/Fri).
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
					className={`w-full px-4 sm:px-6 py-4 sm:py-5 min-h-[56px] bg-black/50 border-2 rounded-xl sm:rounded-2xl text-white placeholder-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/30 focus:ring-offset-2 focus:ring-offset-black transition-all text-base sm:text-lg font-medium backdrop-blur-sm touch-manipulation ${
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
					inputMode="email"
					aria-invalid={
						(formData.email.length > 0 && !emailValidation.isValid) ||
						!!fieldErrors.email
					}
					aria-describedby={
						formData.email.length > 0
							? emailValidation.isValid && !fieldErrors.email
								? "email-success email-help"
								: "email-error email-help"
							: "email-help"
					}
					aria-required="true"
				/>
				{formData.email.length > 0 &&
					(emailValidation.isValid && !fieldErrors.email ? (
						<FormFieldSuccess message="Email looks good!" id="email-success" />
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
					className="block text-base font-bold text-white mb-3 flex items-center gap-2"
				>
					<span>Preferred Cities</span>
					<span className="text-red-400 text-sm" aria-label="required">*</span>
					<span className="text-zinc-400 font-normal text-sm">(Select up to 3)</span>
				</label>
				<p id="cities-help" className="text-sm text-zinc-400 mb-2 leading-relaxed">
					Choose up to 3 cities where you'd like to work. You can click on the
					map or use the buttons below.
				</p>
				<p className="text-sm text-zinc-500 mb-4 leading-relaxed">
					💡 We'll only show jobs in these cities. You can add more later in
					your preferences.
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
							? "cities-error cities-help"
							: formData.cities.length > 0 && citiesValidation.isValid
								? "cities-success cities-help"
								: "cities-help"
					}
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="mb-4 sm:mb-6 md:mb-8 lg:mb-10 hidden sm:block"
					onBlur={() => setTouchedFields((prev) => new Set(prev).add("cities"))}
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
								setTouchedFields((prev) => new Set(prev).add("cities"));
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
						onMaxSelectionsReached={(_city, max) => {
							showToast.error(
								`Maximum ${max} cities selected. Remove a city to select another.`,
							);
						}}
					/>
				</motion.div>

				{/* Clear All Cities Button */}
				{formData.cities.length > 0 && (
					<div className="mb-3 sm:hidden">
						<motion.button
							type="button"
							onClick={() => {
								setFormData({ ...formData, cities: [] });
								announce("All cities cleared", "polite");
							}}
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
							className="px-4 py-2 bg-zinc-500/10 hover:bg-zinc-500/20 border border-zinc-700 text-zinc-400 hover:text-zinc-300 text-sm font-medium rounded-lg transition-colors touch-manipulation min-h-[44px]"
						>
							Clear All Cities
						</motion.button>
					</div>
				)}

				{/* Mobile-friendly city chips */}
				<div
					className="flex overflow-x-auto pb-4 gap-2 scrollbar-hide -mx-4 px-4 snap-x snap-mandatory sm:hidden"
					role="group"
					aria-labelledby="cities-label"
				>
					{CITIES.map((city) => {
						const isSelected = formData.cities.includes(city);
						const isDisabled = !isSelected && formData.cities.length >= 3;
						return (
							<CityChip
								key={city}
								city={city}
								isSelected={isSelected}
								isDisabled={isDisabled}
								onToggle={(city) => {
									if ("vibrate" in navigator) {
										navigator.vibrate(10);
									}
									if (isDisabled) {
										showToast.error(
											"Maximum 3 cities selected. Remove a city to select another.",
										);
										announce(
											"Maximum cities selected. Deselect one to choose another.",
											"polite",
										);
										return;
									}
									const nextCities = toggleArray(formData.cities, city);
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
								onRemove={(city) => {
									const nextCities = formData.cities.filter(
										(c: string) => c !== city,
									);
									setFormData({
										...formData,
										cities: nextCities,
									});
									announce(
										`Removed ${city}. ${nextCities.length} of 3 cities selected.`,
										"polite",
									);
								}}
							/>
						);
					})}
				</div>
				{formData.cities.length >= 3 && (
					<p className="mt-2 text-sm text-amber-400 sm:hidden">
						Maximum 3 cities selected. Deselect one to choose another.
					</p>
				)}

				<div className="mt-2 flex items-center justify-between">
					<p className="text-sm text-zinc-400">
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
					<p className="mt-1 text-sm text-zinc-300">
						{formData.cities.join(", ")}
					</p>
				)}
				{shouldShowError(
					"cities",
					formData.cities.length === 0,
					citiesValidation.isValid,
				) && (
					<FormFieldError
						error="We need to know where you want to work so we can find relevant job opportunities in those cities."
						id="cities-error"
					/>
				)}
				{formData.cities.length >= 3 && (
					<p className="text-sm text-amber-400 mt-1 hidden sm:block">
						Maximum 3 cities selected. Deselect one to choose another.
					</p>
				)}
			</div>

			<div>
				<label
					id="languages-label"
					htmlFor="languages-field"
					className="block text-base font-bold text-white mb-3 flex items-center gap-2"
				>
					<span>Languages (Professional Level)</span>
					<span className="text-red-400 text-sm" aria-label="required">*</span>
				</label>
				<p id="languages-help" className="text-sm text-zinc-400 mb-2 leading-relaxed">
					Select languages you can use professionally
				</p>
				<p className="text-sm text-zinc-500 mb-4 leading-relaxed">
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
							? "languages-error languages-help"
							: formData.languages.length > 0 && languagesValidation.isValid
								? "languages-success languages-help"
								: "languages-help"
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
							setTouchedFields((prev) => new Set(prev).add("languages"));
							if (formData.languages.length === 0) {
								announce(
									`Selected ${lang}. ${formData.languages.length + 1} language selected.`,
									"polite",
								);
							}
						}}
					/>
				</div>
				{formData.languages.length > 0 && languagesValidation.isValid && (
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
						error="Your language skills help us match you with companies that communicate in languages you're comfortable with."
						id="languages-error"
					/>
				)}
			</div>

			{/* Spacer for sticky button */}
			<div className="h-32 sm:h-0" aria-hidden="true" />

			{/* Sticky Submit Button */}
			<div className="sticky bottom-0 left-0 right-0 z-40 md:z-50 bg-black/90 backdrop-blur-xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8">
				<motion.button
					onClick={() => setStep(2)}
					disabled={
						loading ||
						!formData.fullName.trim() ||
						!formData.email.trim() ||
						!emailValidation.isValid ||
						formData.cities.length === 0 ||
						formData.languages.length === 0 ||
						!formData.gdprConsent
					}
					whileHover={{ scale: loading ? 1 : 1.02 }}
					whileTap={{ scale: loading ? 1 : 0.98 }}
					className="w-full bg-gradient-to-r from-brand-500 via-brand-600 to-brand-500 text-white font-bold text-base sm:text-lg md:text-xl py-4 sm:py-5 md:py-6 rounded-xl sm:rounded-2xl shadow-[0_20px_50px_rgba(99,102,241,0.4)] hover:shadow-[0_24px_60px_rgba(99,102,241,0.5)] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-[0_20px_50px_rgba(99,102,241,0.4)] touch-manipulation min-h-[56px]"
				>
					{loading ? (
						<span className="flex items-center justify-center gap-2">
							<svg
								className="w-5 h-5 animate-spin"
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
								/>
								<path
									className="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								/>
							</svg>
							<Skeleton className="w-16 h-4" />
						</span>
					) : (
						getDisabledMessage(1)
					)}
				</motion.button>
			</div>
		</motion.div>
	);
});
