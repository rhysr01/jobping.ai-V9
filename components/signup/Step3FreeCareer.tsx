"use client";

import { motion } from "framer-motion";
import React, { useRef } from "react";
import { BrandIcons } from "../ui/BrandIcons";
import { FormFieldError, FormFieldSuccess } from "../ui/FormFieldFeedback";
import { MobileNavigation } from "./MobileNavigation";
import { CAREER_PATHS } from "./constants";
import { showToast } from "../../lib/toast";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { SignupFormData } from "./types";
import { JobCountTeaser } from "./JobCountTeaser";

interface Step3FreeCareerProps {
	formData: SignupFormData;
	setFormData: React.Dispatch<React.SetStateAction<SignupFormData>>;
	touchedFields: Set<string>;
	setTouchedFields: React.Dispatch<React.SetStateAction<Set<string>>>;
	loading: boolean;
	setStep: (step: number) => void;
	handleSubmit: () => void;
}

export const Step3FreeCareer = React.memo(function Step3FreeCareer({
	formData,
	setFormData,
	touchedFields: _touchedFields,
	setTouchedFields,
	loading,
	setStep,
	handleSubmit,
}: Step3FreeCareerProps) {
	const formRefs = {
		careerPath: useRef<HTMLDivElement>(null),
	};

	const handleCareerPathSelect = (pathValue: string) => {
		setFormData((prev) => ({ ...prev, careerPath: [pathValue] }));
		setTouchedFields((prev) => new Set(prev).add("careerPath"));

		// Show success feedback
		const selectedPath = CAREER_PATHS.find((p) => p.value === pathValue);
		if (selectedPath) {
			showToast.success(`Selected ${selectedPath.label} - great choice!`);
		}
	};

	const handleCareerPathBlur = () => {
		setTouchedFields((prev) => new Set(prev).add("careerPath"));
	};

	const isStepValid = formData.careerPath && formData.careerPath.length > 0;

	return (
		<motion.div
			key="step3"
			initial={{ opacity: 0, x: 20 }}
			animate={{ opacity: 1, x: 0 }}
			exit={{ opacity: 0, x: -20 }}
			transition={{ duration: 0.4 }}
			className="space-y-6 sm:space-y-8 md:space-y-10"
		>
			<div className="mb-6 sm:mb-8">
				<h2 className="text-display-md font-black text-white mb-2 sm:mb-3 bg-gradient-to-r from-white to-zinc-200 bg-clip-text text-transparent">
					What type of role are you looking for?
				</h2>
				<p className="text-base sm:text-lg font-medium text-zinc-100 leading-relaxed">
					Select your career path to get personalized matches
				</p>
				<div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20">
					<span className="text-sm font-medium text-purple-200">
						🎉 Almost done - your matches are ready!
					</span>
				</div>
			</div>

			<div>
				<label
					id="career-label"
					htmlFor="career-field"
					className="block text-base font-bold text-white mb-3 flex items-center gap-2"
				>
					<span>Career Path</span>
					<span className="text-error text-sm" aria-label="required">
						*
					</span>
				</label>
				<p
					id="career-help"
					className="text-sm text-zinc-400 mb-4 leading-relaxed"
				>
					Choose the type of role that interests you most. This helps us find
					the perfect matches.
				</p>

				{/* Career Path Selection */}
				<div
					ref={formRefs.careerPath}
					className="grid gap-3 sm:gap-4"
					role="radiogroup"
					aria-labelledby="career-label"
					aria-describedby="career-help"
					onBlur={handleCareerPathBlur}
				>
					{CAREER_PATHS.map((path) => {
						const isSelected = formData.careerPath.includes(path.value);
						return (
							<HoverCard key={path.value}>
								<HoverCardTrigger asChild>
									<motion.button
										type="button"
										onClick={() => handleCareerPathSelect(path.value)}
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
										className={`w-full p-4 sm:p-5 text-left border-2 rounded-xl transition-all touch-manipulation min-h-[64px] ${
											isSelected
												? "border-brand-500 bg-brand-500/10 shadow-[0_0_20px_rgba(20,184,166,0.2)]"
												: "border-zinc-700 hover:border-zinc-600 bg-black/50 hover:bg-zinc-900/50"
										}`}
									>
										<div className="flex items-center gap-3">
											<div
												className={`p-2 rounded-lg ${
													isSelected ? "bg-brand-500/20" : "bg-zinc-700/50"
												}`}
											>
												<BrandIcons.Briefcase
													className={`w-5 h-5 ${
														isSelected ? "text-brand-300" : "text-zinc-400"
													}`}
												/>
											</div>
											<div className="flex-1">
												<h3
													className={`font-semibold text-base sm:text-lg ${
														isSelected ? "text-white" : "text-zinc-100"
													}`}
												>
													{path.label}
												</h3>
											</div>
											{isSelected && (
												<BrandIcons.Check className="w-6 h-6 text-brand-400" />
											)}
										</div>
									</motion.button>
								</HoverCardTrigger>
								<HoverCardContent className="w-80 p-4" side="right">
									<div className="space-y-3">
										<h4 className="font-bold text-white">{path.label}</h4>
										<div>
											<p className="text-xs font-semibold text-zinc-400 mb-2">
												POPULAR ROLES:
											</p>
											<div className="flex flex-wrap gap-1">
												{path.popularRoles?.slice(0, 4).map((role) => (
													<span
														key={role}
														className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded"
													>
														{role}
													</span>
												))}
												{(path.popularRoles?.length ?? 0) > 4 && (
													<span className="text-xs text-zinc-500 px-2 py-1">
														+{(path.popularRoles?.length ?? 0) - 4} more
													</span>
												)}
											</div>
										</div>
									</div>
								</HoverCardContent>
							</HoverCard>
						);
					})}
				</div>

				{/* Selection Display */}
				{formData.careerPath && formData.careerPath.length > 0 && (
					<div className="mt-4 p-3 bg-white/5 rounded-lg">
						<p className="text-sm text-zinc-300 mb-1">Selected:</p>
						<p className="text-sm font-medium text-white">
							{CAREER_PATHS.find((p) => p.value === formData.careerPath[0])
								?.label || formData.careerPath[0]}
						</p>
					</div>
				)}

				{/* Job Count Teaser - Shows available job count */}
				{formData.cities && formData.cities.length > 0 && formData.careerPath && formData.careerPath.length > 0 && (
					<JobCountTeaser
						cities={formData.cities}
						careerPath={formData.careerPath}
					/>
				)}

				{/* Success Message */}
				{isStepValid && (
					<FormFieldSuccess
						message="Career path selected!"
						id="career-success"
					/>
				)}

				{/* Error Display */}
				{!isStepValid && (
					<FormFieldError
						error="Please select a career path to continue."
						id="career-error"
					/>
				)}
			</div>

			{/* GDPR Consent - Required for submission */}
			<div className="mt-6">
				<label className="flex items-start gap-3 cursor-pointer">
					<input
						type="checkbox"
						checked={formData.gdprConsent || false}
						onChange={(e) =>
							setFormData({ ...formData, gdprConsent: e.target.checked })
						}
						className="mt-1 w-4 h-4 text-brand-500 bg-black/50 border-zinc-600 rounded focus:ring-brand-500 focus:ring-2 touch-manipulation"
					/>
					<span className="text-sm text-zinc-300 leading-relaxed">
						I agree to the{" "}
						<a
							href="/legal/terms"
							className="text-brand-400 hover:text-brand-300 underline"
							target="_blank"
							rel="noopener noreferrer"
						>
							Terms of Service
						</a>{" "}
						and{" "}
						<a
							href="/legal/privacy"
							className="text-brand-400 hover:text-brand-300 underline"
							target="_blank"
							rel="noopener noreferrer"
						>
							Privacy Policy
						</a>
						. I understand my data will be used to provide job matching
						services.
					</span>
				</label>
			</div>

			{/* Spacer for sticky navigation */}
			<div className="h-32" />

			{/* Mobile Navigation */}
			<MobileNavigation
				currentStep={3}
				totalSteps={3}
				onBack={() => setStep(2)}
				nextDisabled={!isStepValid || !formData.gdprConsent || loading}
				nextLabel="Get My 5 Matches"
				loading={loading}
				onNext={handleSubmit}
			/>
		</motion.div>
	);
});
