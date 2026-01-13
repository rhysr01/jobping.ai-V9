"use client";

import { motion } from "framer-motion";
import React, { useState } from "react";
import { BrandIcons } from "../ui/BrandIcons";
import {
	FormFieldError,
	FormFieldSuccess,
} from "../ui/FormFieldFeedback";
import { CAREER_PATHS } from "./constants";
import type { SignupFormData } from "./types";

interface Step3CareerPathProps {
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
	selectAllRoles: (careerPath: string) => void;
	clearAllRoles: () => void;
	tier?: "free" | "premium";
}

export const Step3CareerPath = React.memo(function Step3CareerPath({
	formData,
	setFormData,
	touchedFields: _touchedFields,
	setTouchedFields,
	loading,
	setStep,
	shouldShowError,
	getDisabledMessage,
	toggleArray,
	selectAllRoles,
	clearAllRoles,
	tier = "premium",
}: Step3CareerPathProps) {
	// Determine max selections based on premium status
	const maxSelections = tier === "premium" ? 2 : 1;
	const [showAllRoles, setShowAllRoles] = useState(false);
	return (
		<motion.div
			key="step3"
			initial={{ opacity: 0, x: 20 }}
			animate={{ opacity: 1, x: 0 }}
			exit={{ opacity: 0, x: -20 }}
			transition={{ duration: 0.4 }}
			className="relative"
		>
				<div className="relative overflow-hidden rounded-3xl border border-brand-500/20 bg-gradient-to-br from-zinc-900/80 via-zinc-900/60 to-zinc-800/80 backdrop-blur-sm px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8">
					{/* Enhanced background effects */}
					<div
						className="pointer-events-none absolute -top-32 left-8 h-64 w-64 rounded-full bg-gradient-to-br from-brand-700/20 to-brand-500/15 blur-3xl hidden sm:block"
						aria-hidden="true"
					/>
					<div
						className="pointer-events-none absolute -bottom-36 right-6 h-72 w-72 bg-gradient-to-br from-purple-600/15 to-brand-500/20 blur-[140px] hidden sm:block"
						aria-hidden="true"
					/>
					<div
						className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-brand-500/8 via-transparent to-purple-600/8 rounded-full blur-3xl"
						aria-hidden="true"
					/>
					<div
						className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(99,102,241,0.08),transparent_70%)]"
						aria-hidden="true"
					/>

					{/* Floating particles effect */}
					<motion.div
						className="absolute top-20 right-16 w-2 h-2 bg-brand-400/60 rounded-full"
						animate={{
							y: [0, -20, 0],
							opacity: [0.4, 1, 0.4],
						}}
						transition={{
							duration: 3,
							repeat: Infinity,
							ease: "easeInOut",
						}}
					/>
					<motion.div
						className="absolute bottom-24 left-20 w-1.5 h-1.5 bg-purple-400/60 rounded-full"
						animate={{
							y: [0, 15, 0],
							opacity: [0.6, 1, 0.6],
						}}
						transition={{
							duration: 2.5,
							repeat: Infinity,
							ease: "easeInOut",
							delay: 1,
						}}
					/>

					<div className="relative z-10 space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-12">
					<div className="mb-6 sm:mb-8">
						<motion.div
							initial={{ opacity: 0, y: -20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.2 }}
							className="flex items-center gap-4 mb-4"
						>
							<motion.div
								animate={{
									rotate: [0, 360],
									scale: [1, 1.1, 1]
								}}
								transition={{
									duration: 4,
									repeat: Infinity,
									ease: "easeInOut",
									repeatDelay: 2
								}}
								className="w-12 h-12 bg-gradient-to-br from-brand-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl"
							>
								<BrandIcons.Briefcase className="w-6 h-6 text-white" />
							</motion.div>
							<div>
								<h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-1 bg-gradient-to-r from-white via-zinc-100 to-zinc-200 bg-clip-text text-transparent">
									Your Career Path
								</h2>
								<div className="h-0.5 w-24 bg-gradient-to-r from-brand-500 to-purple-600 rounded-full" />
							</div>
						</motion.div>

						<motion.p
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.4 }}
							className="text-base sm:text-lg font-medium text-zinc-300 leading-relaxed"
						>
							Discover the perfect career direction for your skills and interests
						</motion.p>

						{/* Enhanced Progress Helper */}
						<motion.div
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ delay: 0.6 }}
							className="mt-8 rounded-2xl border border-brand-500/30 bg-gradient-to-r from-brand-500/10 via-brand-700/10 to-purple-600/10 p-6 shadow-[0_0_40px_rgba(99,102,241,0.2)] backdrop-blur-sm"
						>
							<div className="flex items-center gap-3 mb-4">
								<motion.div
									animate={{ rotate: [0, 360] }}
									transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
									className="w-8 h-8 bg-gradient-to-br from-brand-500 to-purple-600 rounded-lg flex items-center justify-center"
								>
									<BrandIcons.Target className="w-4 h-4 text-white" />
								</motion.div>
								<h3 className="text-lg font-bold text-white">
									Next Step Requirements
								</h3>
							</div>

							<div className="space-y-3">
								<motion.div
									className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
										formData.careerPath.length > 0
											? "bg-emerald-500/10 border border-emerald-500/30"
											: "bg-zinc-800/50 border border-zinc-700/30"
									}`}
									animate={formData.careerPath.length > 0 ? { scale: [1, 1.02, 1] } : {}}
									transition={{ duration: 0.5 }}
								>
									<motion.span
										className={`w-3 h-3 rounded-full ${
											formData.careerPath.length > 0 ? "bg-emerald-500" : "bg-zinc-500"
										}`}
										animate={formData.careerPath.length > 0 ? {
											boxShadow: ["0 0 0 0 rgba(16, 185, 129, 0.7)", "0 0 0 4px rgba(16, 185, 129, 0)", "0 0 0 0 rgba(16, 185, 129, 0.7)"]
										} : {}}
										transition={{ duration: 2, repeat: Infinity }}
									/>
									<span className={`font-medium ${
										formData.careerPath.length > 0 ? "text-emerald-200" : "text-zinc-300"
									}`}>
										Career Path{maxSelections > 1 ? 's' : ''} Selection ({formData.careerPath.length}/{maxSelections})
									</span>
									{formData.careerPath.length > 0 && (
										<motion.div
											initial={{ scale: 0 }}
											animate={{ scale: 1 }}
											className="ml-auto"
										>
											<BrandIcons.CheckCircle className="w-5 h-5 text-emerald-400" />
										</motion.div>
									)}
								</motion.div>

								<motion.div
									className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
										formData.roles.length > 0
											? "bg-emerald-500/10 border border-emerald-500/30"
											: "bg-zinc-800/50 border border-zinc-700/30"
									}`}
									animate={formData.roles.length > 0 ? { scale: [1, 1.02, 1] } : {}}
									transition={{ duration: 0.5, delay: 0.1 }}
								>
									<motion.span
										className={`w-3 h-3 rounded-full ${
											formData.roles.length > 0 ? "bg-emerald-500" : "bg-zinc-500"
										}`}
										animate={formData.roles.length > 0 ? {
											boxShadow: ["0 0 0 0 rgba(16, 185, 129, 0.7)", "0 0 0 4px rgba(16, 185, 129, 0)", "0 0 0 0 rgba(16, 185, 129, 0.7)"]
										} : {}}
										transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
									/>
									<span className={`font-medium ${
										formData.roles.length > 0 ? "text-emerald-200" : "text-zinc-300"
									}`}>
										Role Selection ({formData.roles.length}/1+ selected)
									</span>
									{formData.roles.length > 0 && (
										<motion.div
											initial={{ scale: 0 }}
											animate={{ scale: 1 }}
											className="ml-auto"
										>
											<BrandIcons.CheckCircle className="w-5 h-5 text-emerald-400" />
										</motion.div>
									)}
								</motion.div>
							</div>
						</motion.div>
					</div>

					<div>
						<label
							id="career-path-label"
							htmlFor="career-path-field"
							className="block text-base font-bold text-white mb-4"
						>
							Select Your Career Path{maxSelections > 1 ? 's' : ''} *
						</label>
						<p className="text-sm text-zinc-400 mb-6">
							Choose {maxSelections > 1 ? `up to ${maxSelections} career paths` : 'the career path'} that interest{maxSelections > 1 ? '' : 's'} you most
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
								setTouchedFields((prev) => new Set(prev).add("careerPath"))
							}
						>
							{CAREER_PATHS.map((path, index) => {
								const isSelected = formData.careerPath.includes(path.value);
								return (
									<motion.button
										key={path.value}
										type="button"
										onClick={() => {
											const newCareer = CAREER_PATHS.find(
												(c) => c.value === path.value,
											);
											if (newCareer) {
												let newCareerPaths: string[];
												if (isSelected) {
													// Remove from selection
													newCareerPaths = formData.careerPath.filter(cp => cp !== path.value);
												} else {
													// Add to selection (if under limit)
													if (formData.careerPath.length >= maxSelections) {
														return; // Don't allow more than max selections
													}
													newCareerPaths = [...formData.careerPath, path.value];
												}

												// Filter roles to only include those from selected career paths
												const validRoles = formData.roles.filter((role) => {
													return newCareerPaths.some(cp => {
														const career = CAREER_PATHS.find(c => c.value === cp);
														return career?.roles.includes(role);
													});
												});

												setFormData({
													...formData,
													careerPath: newCareerPaths,
													roles: validRoles,
												});
											}
										}}
									initial={{ opacity: 0, x: -20 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: 0.8 + index * 0.1 }}
									whileHover={{
										scale: 1.03,
										y: -4,
										boxShadow: "0 20px 40px rgba(99, 102, 241, 0.2)"
									}}
									whileTap={{ scale: 0.97 }}
									className={`relative px-6 sm:px-8 py-6 sm:py-8 rounded-2xl border-2 transition-all duration-300 text-left overflow-hidden group touch-manipulation min-h-[100px] sm:min-h-[120px] ${
										isSelected
											? "border-brand-500 bg-gradient-to-br from-brand-500/20 via-brand-600/15 to-brand-700/10 shadow-[0_0_50px_rgba(99,102,241,0.4)]"
											: formData.careerPath.length >= maxSelections
											? "border-zinc-700/60 bg-zinc-900/30 opacity-50 cursor-not-allowed"
											: "border-zinc-700/60 bg-zinc-900/50 hover:border-brand-500/50 hover:bg-zinc-900/70 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)]"
									}`}
								>
									{/* Enhanced background effects */}
									{isSelected && (
										<motion.div
											className="absolute inset-0 bg-gradient-to-br from-brand-500/15 via-brand-600/10 to-brand-700/5"
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											transition={{ duration: 0.4 }}
										/>
									)}

									{/* Hover background effect */}
									{!isSelected && formData.careerPath.length < maxSelections && (
										<div className="absolute inset-0 bg-gradient-to-br from-brand-500/0 to-brand-700/0 group-hover:from-brand-500/8 group-hover:to-brand-700/8 transition-all duration-300" />
									)}

									{/* Floating particles for selected state */}
									{isSelected && (
										<>
											<motion.div
												className="absolute top-4 right-8 w-1 h-1 bg-brand-400/60 rounded-full"
												animate={{ y: [0, -8, 0], opacity: [0.6, 1, 0.6] }}
												transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
											/>
											<motion.div
												className="absolute bottom-6 left-12 w-1.5 h-1.5 bg-purple-400/60 rounded-full"
												animate={{ y: [0, 6, 0], opacity: [0.4, 1, 0.4] }}
												transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
											/>
										</>
									)}

									<div className="relative flex items-start gap-6">
										{/* Enhanced icon container */}
										<motion.div
											className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
												isSelected
													? "bg-gradient-to-br from-brand-500 to-brand-700 scale-110"
													: "bg-gradient-to-br from-zinc-700 to-zinc-800 group-hover:from-zinc-600 group-hover:to-zinc-700"
											}`}
											animate={
												isSelected
													? { scale: 1.1, rotate: [0, 5, -5, 0] }
													: { scale: 1, rotate: 0 }
											}
											transition={{ duration: 0.3 }}
											whileHover={{ scale: isSelected ? 1.15 : formData.careerPath.length < maxSelections ? 1.05 : 1 }}
										>
											<span className="text-3xl filter drop-shadow-sm">
												{path.emoji}
											</span>
										</motion.div>

										<div className="flex-1 min-w-0 pt-1">
											<div
												className={`font-bold text-xl mb-2 ${
													isSelected
														? "text-white"
														: "text-zinc-200 group-hover:text-white"
												} transition-colors`}
											>
												{path.label}
											</div>
											<div className="flex items-center gap-2 text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
												<BrandIcons.Briefcase className="w-4 h-4" />
												<span>{path.roles.length} specialized roles</span>
											</div>
										</div>

										{/* Enhanced checkmark */}
										{isSelected && (
											<motion.div
												initial={{ scale: 0, rotate: -180 }}
												animate={{ scale: 1, rotate: 0 }}
												transition={{ type: "spring", stiffness: 200, damping: 10 }}
												className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center flex-shrink-0 shadow-xl border-2 border-white/20"
											>
												<BrandIcons.Check className="w-6 h-6 text-white" />
											</motion.div>
										)}
									</div>
								</motion.button>
								);
							})}
						</div>
						{shouldShowError(
							"careerPath",
							formData.careerPath.length === 0,
							formData.careerPath.length > 0,
						) && (
							<FormFieldError
														error="Your career interests help us find the perfect job matches tailored to your goals and experience level."
								id="career-path-error"
							/>
						)}
					</div>

					{(() => {
						const selectedCareers = CAREER_PATHS.filter(
							(c) => formData.careerPath.includes(c.value),
						);
						if (selectedCareers.length === 0) return null;

						// For now, show the first selected career's roles
						// In the future, we could show combined roles from all selected careers
						const primaryCareer = selectedCareers[0];

						return (
							<motion.div
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.2 }}
								className="border-2 border-brand-500/30 rounded-2xl p-6 bg-gradient-to-br from-brand-500/5 to-brand-700/5"
							>
								<label
									id="roles-label"
									htmlFor="roles-field"
									className="block text-lg font-black text-white mb-4"
								>
									<span className="text-2xl mr-2">{primaryCareer.emoji}</span>
									{selectedCareers.length > 1 ? 'Selected Career' : primaryCareer.label} Roles
									<span className="text-zinc-400 font-normal text-base ml-2">
										(Select at least one - required)
									</span>
								</label>

								<div className="flex flex-col sm:flex-row gap-2 mb-4">
									<motion.button
										type="button"
										onClick={() => selectAllRoles(primaryCareer.value)}
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
										className="px-4 py-3 sm:py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-lg transition-colors shadow-glow-subtle hover:shadow-glow-medium touch-manipulation min-h-[48px]"
										title={`Select all ${primaryCareer.roles.length} roles in ${primaryCareer.label}`}
									>
										Select Popular Roles ({primaryCareer.popularRoles?.length || primaryCareer.roles.length})
									</motion.button>
									<motion.button
										type="button"
										onClick={clearAllRoles}
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
										className="px-4 py-3 sm:py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm font-semibold rounded-lg transition-colors touch-manipulation min-h-[48px]"
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
										setTouchedFields((prev) => new Set(prev).add("roles"))
									}
								>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
										{primaryCareer.roles
											.slice(0, showAllRoles ? primaryCareer.roles.length : 5)
											.map((role: string, idx: number) => (
											<motion.button
												key={role}
												type="button"
												onClick={() =>
													setFormData({
														...formData,
														roles: toggleArray(formData.roles, role),
													})
												}
												initial={{ opacity: 0, x: -10 }}
												animate={{ opacity: 1, x: 0 }}
												transition={{ delay: idx * 0.02 }}
												whileHover={{ scale: 1.02, x: 2 }}
												whileTap={{ scale: 0.98 }}
												className={`px-3 sm:px-4 py-3 sm:py-3.5 rounded-xl border-2 transition-all font-semibold text-left text-sm relative overflow-hidden touch-manipulation min-h-[48px] ${
													formData.roles.includes(role)
														? "border-brand-500 bg-gradient-to-r from-brand-500/20 to-brand-700/15 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]"
														: "border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:border-brand-500/40 hover:bg-zinc-900/80"
												}`}
											>
												{formData.roles.includes(role) && (
													<motion.div
														layoutId="selected-role"
														className="absolute inset-0 bg-gradient-to-r from-brand-500/10 to-brand-700/10 -z-10"
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
										))}

										{!showAllRoles && primaryCareer.roles.length > 5 && (
											<motion.button
												type="button"
												onClick={() => setShowAllRoles(true)}
												className="px-3 sm:px-4 py-3 sm:py-3.5 rounded-xl border-2 border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:border-brand-500/40 hover:bg-zinc-900/80 text-left text-sm min-h-[48px] col-span-full"
												whileHover={{ scale: 1.02 }}
												whileTap={{ scale: 0.98 }}
											>
												Show {primaryCareer.roles.length - 5} More Roles →
											</motion.button>
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
															error="Selecting specific roles helps us find more accurate matches. Try the 'Select Popular Roles' button to get started quickly."
										id="roles-error"
									/>
								)}
							</motion.div>
						);
					})()}

					{/* Spacer for sticky button */}
					<div className="h-32 sm:h-0" aria-hidden="true" />

					{/* Sticky Submit Button */}
					<div className="sticky bottom-0 left-0 right-0 z-40 md:z-50 bg-black/80 backdrop-blur-xl border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8">
						<div className="flex gap-3 sm:gap-4">
							<motion.button
								onClick={() => setStep(2)}
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								className="btn-secondary flex-1 py-4 sm:py-5 text-base sm:text-lg touch-manipulation min-h-[56px]"
								disabled={loading}
							>
								← Back
							</motion.button>
							<motion.button
								onClick={() => setStep(4)}
								disabled={
									loading || formData.careerPath.length === 0 || formData.roles.length === 0
								}
								whileHover={{ scale: loading ? 1 : 1.03 }}
								whileTap={{ scale: loading ? 1 : 0.97 }}
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
			</div>
		</motion.div>
	);
});
