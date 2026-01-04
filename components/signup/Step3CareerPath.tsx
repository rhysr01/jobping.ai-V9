"use client";

import { motion } from "framer-motion";
import { BrandIcons } from "@/components/ui/BrandIcons";
import {
	FormFieldError,
	FormFieldSuccess,
} from "@/components/ui/FormFieldFeedback";
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
}

export function Step3CareerPath({
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
}: Step3CareerPathProps) {
	return (
		<motion.div
			key="step3"
			initial={{ opacity: 0, x: 20 }}
			animate={{ opacity: 1, x: 0 }}
			exit={{ opacity: 0, x: -20 }}
			transition={{ duration: 0.4 }}
			className="relative"
		>
			<div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-brand-500/20 bg-gradient-to-br from-brand-500/10 via-[#130433]/45 to-brand-700/15 px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8">
				<div
					className="pointer-events-none absolute -top-24 left-6 h-48 w-48 rounded-full bg-brand-700/25 blur-3xl hidden sm:block"
					aria-hidden="true"
				/>
				<div
					className="pointer-events-none absolute -bottom-28 right-0 h-56 w-56 bg-brand-500/25 blur-[120px] hidden sm:block"
					aria-hidden="true"
				/>
				<div
					className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(99,102,241,0.12),transparent_60%)]"
					aria-hidden="true"
				/>
				<div className="relative z-10 space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-12">
					<div>
						<h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-2 sm:mb-3">
							Your career path
						</h2>
						<p className="text-base sm:text-lg font-medium text-zinc-100">
							What type of roles interest you?
						</p>

						{/* Progress Helper */}
						<div className="mt-6 rounded-2xl border-2 border-brand-500/40 bg-gradient-to-r from-brand-500/15 via-brand-700/15 to-brand-500/15 p-5 shadow-[0_0_30px_rgba(99,102,241,0.25)]">
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
								setTouchedFields((prev) => new Set(prev).add("careerPath"))
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
											const validRoles = formData.roles.filter((role) =>
												newCareer.roles.includes(role),
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
											? "border-brand-500 bg-gradient-to-br from-brand-500/20 to-brand-700/15 shadow-glow-signup"
											: "border-zinc-700 bg-zinc-900/40 hover:border-zinc-600 hover:bg-zinc-900/60"
									}`}
								>
									{formData.careerPath === path.value && (
										<motion.div
											className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-brand-700/5"
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											transition={{ duration: 0.3 }}
										/>
									)}

									<div className="relative flex items-start gap-4">
										<motion.div
											className={`text-4xl sm:text-5xl ${
												formData.careerPath === path.value ? "scale-110" : ""
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
												<span>{path.roles.length} roles available</span>
											</div>
										</div>

										{formData.careerPath === path.value && (
											<motion.div
												initial={{ scale: 0, rotate: -180 }}
												animate={{ scale: 1, rotate: 0 }}
												className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0 shadow-glow-subtle"
											>
												<BrandIcons.Check className="w-5 h-5 text-white" />
											</motion.div>
										)}
									</div>

									{formData.careerPath !== path.value && (
										<div className="absolute inset-0 bg-gradient-to-br from-brand-500/0 to-brand-700/0 group-hover:from-brand-500/5 group-hover:to-brand-700/5 transition-all duration-300" />
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
								className="border-2 border-brand-500/30 rounded-2xl p-6 bg-gradient-to-br from-brand-500/5 to-brand-700/5"
							>
								<label
									id="roles-label"
									htmlFor="roles-field"
									className="block text-lg font-black text-white mb-4"
								>
									<span className="text-2xl mr-2">{selectedCareer.emoji}</span>
									{selectedCareer.label} Roles
									<span className="text-zinc-400 font-normal text-base ml-2">
										(Select at least one - required)
									</span>
								</label>

								<div className="flex flex-col sm:flex-row gap-2 mb-4">
									<motion.button
										type="button"
										onClick={() => selectAllRoles(formData.careerPath)}
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
										className="px-4 py-3 sm:py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-lg transition-colors shadow-glow-subtle hover:shadow-glow-medium touch-manipulation min-h-[48px]"
										title={`Select all ${selectedCareer.roles.length} roles in ${selectedCareer.label}`}
									>
										Select All {selectedCareer.roles.length} Roles
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
										{selectedCareer.roles.map((role: string, idx: number) => (
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

					{/* Spacer for sticky button */}
					<div className="h-32 sm:h-0" aria-hidden="true" />

					{/* Sticky Submit Button */}
					<div className="sticky bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8">
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
									loading || !formData.careerPath || formData.roles.length === 0
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
}
