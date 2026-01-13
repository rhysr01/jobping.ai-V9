import { PreferencesFormData, CAREER_PATHS, ENTRY_LEVEL_PREFERENCES } from "@/hooks/usePreferences";

interface CareerPreferencesSectionProps {
	formData: PreferencesFormData;
	onUpdate: (updates: Partial<PreferencesFormData>) => void;
}

export function CareerPreferencesSection({ formData, onUpdate }: CareerPreferencesSectionProps) {
	return (
		<div className="space-y-6">
			<div>
				<label className="block text-sm font-medium text-white mb-2">
					Career Path Interests
				</label>
				<div className="space-y-2">
					{CAREER_PATHS.map((path) => {
						const isSelected = formData.careerPath.includes(path);
						const canSelect = !isSelected && formData.careerPath.length >= 2;

						return (
							<label key={path} className="flex items-center space-x-3">
								<input
									type="checkbox"
									checked={isSelected}
									disabled={canSelect}
									onChange={(e) => {
										if (e.target.checked) {
											if (formData.careerPath.length < 2) {
												onUpdate({ careerPath: [...formData.careerPath, path] });
											}
										} else {
											onUpdate({ careerPath: formData.careerPath.filter(cp => cp !== path) });
										}
									}}
									className="w-4 h-4 text-brand-600 bg-white/10 border-white/20 rounded focus:ring-brand-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
								/>
								<span className={`text-sm ${canSelect ? 'text-zinc-500' : 'text-content-secondary'}`}>
									{path}
								</span>
							</label>
						);
					})}
				</div>
				<p className="text-xs text-zinc-400 mt-2">
					Select up to 2 career paths that interest you most
				</p>
			</div>

			<div>
				<label className="block text-sm font-medium text-white mb-2">
					Job Roles You're Interested In
				</label>
				<input
					type="text"
					value={formData.roles.join(", ")}
					onChange={(e) => {
						const roles = e.target.value
							.split(",")
							.map((role) => role.trim())
							.filter((role) => role.length > 0);
						onUpdate({ roles });
					}}
					placeholder="e.g., Frontend Developer, Product Manager, Data Engineer"
					className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
				/>
				<p className="text-xs text-content-secondary mt-1">
					Separate multiple roles with commas
				</p>
			</div>

			{formData.experience.includes("Entry Level") && (
				<div>
					<label className="block text-sm font-medium text-white mb-2">
						Entry-Level Preferences
					</label>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						{ENTRY_LEVEL_PREFERENCES.map((preference) => (
							<label key={preference} className="flex items-center space-x-3">
								<input
									type="checkbox"
									checked={formData.entryLevelPreferences.includes(preference)}
									onChange={(e) => {
										const updated = e.target.checked
											? [...formData.entryLevelPreferences, preference]
											: formData.entryLevelPreferences.filter((item) => item !== preference);
										onUpdate({ entryLevelPreferences: updated });
									}}
									className="w-4 h-4 text-brand-600 bg-white/10 border-white/20 rounded focus:ring-brand-500 focus:ring-2"
								/>
								<span className="text-sm text-content-secondary">{preference}</span>
							</label>
						))}
					</div>
				</div>
			)}

			<div>
				<label className="block text-sm font-medium text-white mb-2">
					Target Companies (Optional)
				</label>
				<input
					type="text"
					value={formData.targetCompanies.join(", ")}
					onChange={(e) => {
						const companies = e.target.value
							.split(",")
							.map((company) => company.trim())
							.filter((company) => company.length > 0);
						onUpdate({ targetCompanies: companies });
					}}
					placeholder="e.g., Google, Netflix, Spotify"
					className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
				/>
				<p className="text-xs text-content-secondary mt-1">
					Separate multiple companies with commas
				</p>
			</div>
		</div>
	);
}