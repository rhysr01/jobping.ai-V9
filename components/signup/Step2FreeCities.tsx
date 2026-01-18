"use client";

import { motion } from "framer-motion";
import React, { useRef } from "react";
import { CityChip } from "../ui/CityChip";
import {
	FormFieldError,
	FormFieldSuccess,
} from "../ui/FormFieldFeedback";
import { MobileNavigation } from "./MobileNavigation";
import { showToast } from "../../lib/toast";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import { CITIES } from "./constants";
import type { SignupFormData } from "./types";

interface Step2FreeCitiesProps {
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

export const Step2FreeCities = React.memo(function Step2FreeCities({
	formData,
	setFormData,
	touchedFields: _touchedFields,
	setTouchedFields,
	loading,
	setStep,
	shouldShowError,
	getDisabledMessage,
	toggleArray,
}: Step2FreeCitiesProps) {
	const formRefs = {
		cities: useRef<HTMLDivElement>(null),
	};

	const handleCityToggle = (city: string) => {
		if ("vibrate" in navigator) {
			navigator.vibrate(10);
		}

		const isDisabled = !formData.cities.includes(city) && formData.cities.length >= 3;
		if (isDisabled) {
			showToast.error(
				"Maximum 3 cities selected. Deselect one to choose another.",
			);
			return;
		}

		const wasSelected = formData.cities.includes(city);
		const newCities = toggleArray(formData.cities, city);

		setFormData({
			...formData,
			cities: newCities,
		});
		setTouchedFields((prev) => new Set(prev).add("cities"));

		// Show success feedback
		if (!wasSelected) {
			showToast.success(`Added ${city} to your preferences`);
		} else {
			showToast.info(`Removed ${city}`);
		}
	};

	const handleCitiesBlur = () => {
		setTouchedFields((prev) => new Set(prev).add("cities"));
	};

	const isStepValid = formData.fullName.trim() && formData.cities.length > 0;

	return (
		<motion.div
			key="step2"
			initial={{ opacity: 0, x: 20 }}
			animate={{ opacity: 1, x: 0 }}
			exit={{ opacity: 0, x: -20 }}
			transition={{ duration: 0.4 }}
			className="space-y-6 sm:space-y-8 md:space-y-10"
		>
			<div className="mb-6 sm:mb-8">
				<h2 className="text-display-md font-black text-white mb-2 sm:mb-3 bg-gradient-to-r from-white to-zinc-200 bg-clip-text text-transparent">
					Where do you want to work?
				</h2>
				<p className="text-base sm:text-lg font-medium text-zinc-100 leading-relaxed">
					Choose up to 3 cities for instant job matches
				</p>
				<div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20">
					<span className="text-sm font-medium text-blue-200">🎯 Location matters for visa sponsorship</span>
				</div>
			</div>

			{/* Name field first */}
			<div className="mb-8 max-w-md mx-auto">
				<label className="block text-base font-bold text-white mb-3">
					What's your name?
				</label>
				<input
					type="text"
					value={formData.fullName}
					onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
					placeholder="John Smith"
					className="w-full px-4 py-4 bg-black/50 border-2 border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:border-emerald-500 focus:outline-none transition-all"
					autoComplete="name"
				/>
			</div>

			<div>
				<div className="flex items-center gap-2 mb-3">
					<label
						id="cities-label"
						htmlFor="cities-field"
						className="block text-base font-bold text-white flex items-center gap-2"
					>
						<span>Preferred Cities</span>
						<span className="text-error text-sm" aria-label="required">*</span>
						<span className="text-zinc-400 font-normal text-sm">(Select up to 3)</span>
					</label>
					<HoverCard>
						<HoverCardTrigger asChild>
							<button className="text-zinc-400 hover:text-zinc-300 transition-colors">
								<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</button>
						</HoverCardTrigger>
						<HoverCardContent className="w-80 p-4">
							<div className="space-y-2">
								<p className="text-sm font-semibold text-white">🌍 Choose your location preferences</p>
								<p className="text-xs text-zinc-300 leading-relaxed">
									We'll find job matches in all selected cities. Most roles are remote-friendly,
									so you can work from anywhere. Start with your preferred locations!
								</p>
							</div>
						</HoverCardContent>
					</HoverCard>
				</div>
				<p id="cities-help" className="text-sm text-zinc-400 mb-2 leading-relaxed">
					Choose cities where you'd like to work. We'll find the best matches instantly.
				</p>

				{/* Mobile-Optimized City Selection - No Map Dependency */}
				<div
					ref={formRefs.cities}
					className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4"
					role="group"
					aria-labelledby="cities-label"
					aria-describedby="cities-help"
					onBlur={handleCitiesBlur}
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
								onToggle={() => handleCityToggle(city)}
								onRemove={(city) => {
									setFormData({
										...formData,
										cities: formData.cities.filter((c: string) => c !== city),
									});
								}}
								className="min-h-[48px] touch-manipulation" // Mobile-friendly sizing
							/>
						);
					})}
				</div>

				{/* Selection Summary */}
				<div className="mt-4 flex items-center justify-between">
					<p className="text-sm text-zinc-400">
						{formData.cities.length}/3 selected
					</p>
					{formData.cities.length > 0 && (
						<FormFieldSuccess
							message={`${formData.cities.length} ${formData.cities.length === 1 ? "city" : "cities"} selected`}
							id="cities-success"
						/>
					)}
				</div>

				{/* Selected Cities Display */}
				{formData.cities.length > 0 && (
					<div className="mt-2 p-3 bg-white/5 rounded-lg">
						<p className="text-sm text-zinc-300 mb-1">Selected:</p>
						<p className="text-sm font-medium text-white">
							{formData.cities.join(", ")}
						</p>
					</div>
				)}

				{/* Error Display */}
				{shouldShowError(
					"cities",
					formData.cities.length === 0,
					formData.cities.length > 0,
				) && (
					<FormFieldError
						error="Please select at least one city to find relevant job opportunities."
						id="cities-error"
					/>
				)}
			</div>

			{/* Spacer for sticky navigation */}
			<div className="h-32" />

			{/* Mobile Navigation */}
			<MobileNavigation
				currentStep={2}
				totalSteps={3}
				onNext={() => setStep(3)}
				onBack={() => setStep(1)}
				nextDisabled={!isStepValid || loading}
				nextLabel={getDisabledMessage(2)}
				loading={loading}
			/>
		</motion.div>
	);
});