"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { CityChip } from "../ui/CityChip";
import { FormFieldError, FormFieldSuccess } from "../ui/FormFieldFeedback";
import { CITIES } from "./constants";

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
		<div>
			<label
				id="cities-label"
				htmlFor="cities-field"
				className="block text-base font-bold text-white mb-3"
			>
				Where would you like to work? *
			</label>
			<p className="text-sm text-content-secondary mb-6">
				Select up to 3 cities. We'll match you with roles in these locations.
			</p>

			{/* Desktop Map */}
			<div className="hidden sm:block mb-6">
				<EuropeMap
					selectedCities={cities}
					onCityClick={handleCityToggle}
					maxSelections={3}
					className=""
				/>
			</div>

			{/* Mobile City Chips */}
			<div className="sm:hidden mb-6">
				<div
					className="flex overflow-x-auto pb-4 gap-2 scrollbar-hide -mx-4 px-4 snap-x snap-mandatory"
					role="group"
					aria-labelledby="cities-label"
				>
					{CITIES.map((city) => {
						const isSelected = cities.includes(city);
						const isDisabled = isSubmitting || (!isSelected && cities.length >= 3);

						return (
							<CityChip
								key={city}
								city={city}
								isSelected={isSelected}
								isDisabled={isDisabled}
								onToggle={handleCityToggle}
							/>
						);
					})}
				</div>

				{/* Clear All Button - Mobile Only */}
				{cities.length > 0 && (
					<div className="mb-3 sm:hidden">
						<motion.button
							type="button"
							onClick={handleClearAll}
							whileTap={{ scale: 0.95 }}
							disabled={isSubmitting}
							className="text-xs text-content-secondary hover:text-white underline disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							Clear all
						</motion.button>
					</div>
				)}
			</div>

			{/* Selection Counter and Validation */}
			<div className="mt-2 flex items-center justify-between">
				<p className="text-sm text-content-secondary">
					{cities.length}/3 selected
				</p>
				{cities.length > 0 && validation.isValid && (
					<FormFieldSuccess message="Great choice!" />
				)}
			</div>

			{!validation.isValid && validation.message && (
				<FormFieldError error={validation.message} />
			)}
		</div>
	);
}