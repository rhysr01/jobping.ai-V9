"use client";

import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { CityChip } from "../ui/CityChip";
import { FormFieldError, FormFieldSuccess } from "../ui/FormFieldFeedback";
import { CITIES } from "./constants";
import { BrandIcons } from "../ui/BrandIcons";

const EuropeMap = dynamic(() => import("@/components/ui/EuropeMap"), {
	loading: () => (
		<div className="relative w-full h-[420px] sm:h-[480px] md:h-[540px] lg:h-[600px] rounded-3xl border border-brand-500/20 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 overflow-hidden">
			{/* Animated background */}
			<div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 via-transparent to-brand-700/10" />
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.05),transparent_70%)]" />

			{/* Loading content */}
			<div className="relative z-10 flex items-center justify-center h-full">
				<motion.div
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.5 }}
					className="text-center"
				>
					<motion.div
						animate={{ rotate: 360 }}
						transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
						className="w-16 h-16 border-4 border-brand-500/30 border-t-brand-500 rounded-full mx-auto mb-6"
					/>
					<motion.h3
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2 }}
						className="text-xl font-bold text-white mb-2"
					>
						Discovering Europe
					</motion.h3>
					<motion.p
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.3 }}
						className="text-content-secondary text-sm"
					>
						Loading interactive map...
					</motion.p>
				</motion.div>
			</div>
		</div>
	),
	ssr: false, // Map is interactive, no need for SSR
});

interface CitySelectionSectionProps {
	cities: string[];
	onChange: (cities: string[]) => void;
	isSubmitting: boolean;
	validation: {
		isValid: boolean;
		message: string;
	};
}

export function CitySelectionSection({
	cities,
	onChange,
	isSubmitting,
	validation,
}: CitySelectionSectionProps) {
	const handleCityToggle = (city: string) => {
		if (cities.includes(city)) {
			onChange(cities.filter((c) => c !== city));
		} else if (cities.length < 3) {
			onChange([...cities, city]);
		}
	};

	const handleClearAll = () => {
		onChange([]);
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.6 }}
			className="relative"
		>
			{/* Background effects */}
			<div className="absolute -inset-4 bg-gradient-to-br from-brand-500/5 via-transparent to-brand-700/5 rounded-3xl blur-2xl" />
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.08),transparent_50%)]" />

			<div className="relative bg-gradient-to-br from-zinc-900/60 via-zinc-900/40 to-zinc-800/60 backdrop-blur-sm border border-brand-500/20 rounded-2xl p-6 sm:p-8 overflow-hidden">
				{/* Animated background elements */}
				<motion.div
					className="absolute top-4 right-4 w-32 h-32 bg-gradient-to-br from-brand-500/10 to-brand-700/10 rounded-full blur-xl"
					animate={{
						scale: [1, 1.2, 1],
						opacity: [0.3, 0.6, 0.3],
					}}
					transition={{
						duration: 4,
						repeat: Infinity,
						ease: "easeInOut",
					}}
				/>
				<motion.div
					className="absolute bottom-8 left-8 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-brand-500/10 rounded-full blur-lg"
					animate={{
						scale: [1.2, 1, 1.2],
						opacity: [0.4, 0.2, 0.4],
					}}
					transition={{
						duration: 3,
						repeat: Infinity,
						ease: "easeInOut",
						delay: 1,
					}}
				/>

				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 }}
					className="mb-6"
				>
					<div className="flex items-center gap-3 mb-4">
						<motion.div
							animate={{ rotate: [0, 10, -10, 0] }}
							transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
							className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center shadow-lg"
						>
							<BrandIcons.MapPin className="w-5 h-5 text-white" />
						</motion.div>
						<label
							id="cities-label"
							htmlFor="cities-field"
							className="text-xl sm:text-2xl font-black bg-gradient-to-r from-white to-zinc-200 bg-clip-text text-transparent"
						>
							Where would you like to work?
						</label>
						<span className="text-brand-400 font-bold">*</span>
					</div>

					<motion.p
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.4 }}
						className="text-base text-zinc-300 leading-relaxed"
					>
						Select up to <span className="font-semibold text-brand-400">3 cities</span>.
						We'll match you with graduate roles in these locations.
					</motion.p>
				</motion.div>

				{/* Desktop Map */}
				<motion.div
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ delay: 0.6, duration: 0.5 }}
					className="hidden sm:block mb-8"
				>
					<EuropeMap
						selectedCities={cities}
						onCityClick={handleCityToggle}
						maxSelections={3}
						className=""
					/>
				</motion.div>

				{/* Mobile City Chips */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.6, duration: 0.5 }}
					className="sm:hidden mb-8"
				>
					<div className="mb-4">
						<h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
							<BrandIcons.Compass className="w-5 h-5 text-brand-400" />
							Choose Your Cities
						</h3>
					</div>

					<div
						className="flex overflow-x-auto pb-6 gap-3 scrollbar-hide -mx-6 px-6 snap-x snap-mandatory"
						role="group"
						aria-labelledby="cities-label"
					>
						{CITIES.map((city, index) => {
							const isSelected = cities.includes(city);
							const isDisabled = isSubmitting || (!isSelected && cities.length >= 3);

							return (
								<motion.div
									key={city}
									initial={{ opacity: 0, x: -20 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: index * 0.05 }}
									className="flex-shrink-0"
								>
									<CityChip
										city={city}
										isSelected={isSelected}
										isDisabled={isDisabled}
										onToggle={handleCityToggle}
									/>
								</motion.div>
							);
						})}
					</div>

					{/* Clear All Button - Mobile Only */}
					<AnimatePresence>
						{cities.length > 0 && (
							<motion.div
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: "auto" }}
								exit={{ opacity: 0, height: 0 }}
								className="flex justify-center mt-4"
							>
								<motion.button
									type="button"
									onClick={handleClearAll}
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
									disabled={isSubmitting}
									className="px-4 py-2 bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-400 hover:text-zinc-300 text-sm font-medium rounded-lg border border-zinc-700/50 hover:border-zinc-600/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									Clear all selections
								</motion.button>
							</motion.div>
						)}
					</AnimatePresence>
				</motion.div>

				{/* Selection Counter and Validation */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.8 }}
					className="flex items-center justify-between"
				>
					<div className="flex items-center gap-3">
						<div className="flex items-center gap-2">
							<div className={`w-2 h-2 rounded-full transition-colors ${
								cities.length === 0 ? 'bg-zinc-600' :
								cities.length === 1 ? 'bg-yellow-500' :
								cities.length === 2 ? 'bg-orange-500' : 'bg-brand-500'
							}`} />
							<span className="text-sm font-medium text-zinc-300">
								{cities.length}/3 selected
							</span>
						</div>

						{/* Progress indicator */}
						<div className="flex gap-1">
							{[1, 2, 3].map((num) => (
								<motion.div
									key={num}
									initial={false}
									animate={{
										scale: cities.length >= num ? 1.1 : 1,
										backgroundColor: cities.length >= num ? '#6366f1' : '#374151'
									}}
									transition={{ duration: 0.2 }}
									className={`w-2 h-2 rounded-full ${
										cities.length >= num ? 'bg-brand-500' : 'bg-zinc-600'
									}`}
								/>
							))}
						</div>
					</div>

					<AnimatePresence>
						{cities.length > 0 && validation.isValid && (
							<motion.div
								initial={{ opacity: 0, scale: 0.8, x: 20 }}
								animate={{ opacity: 1, scale: 1, x: 0 }}
								exit={{ opacity: 0, scale: 0.8, x: 20 }}
							>
								<FormFieldSuccess message="Perfect choices! 🎯" />
							</motion.div>
						)}
					</AnimatePresence>
				</motion.div>

				<AnimatePresence>
					{!validation.isValid && validation.message && (
						<motion.div
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
						>
							<FormFieldError error={validation.message} />
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</motion.div>
	);
}