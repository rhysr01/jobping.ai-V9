"use client";

import { Suspense } from "react";
import Button from "../../components/ui/Button";
import { BasicInfoSection } from "../../components/preferences/BasicInfoSection";
import { LanguageLocationSection } from "../../components/preferences/LanguageLocationSection";
import { CareerPreferencesSection } from "../../components/preferences/CareerPreferencesSection";
import { usePreferences } from "@/hooks/usePreferences";

function PreferencesContent() {
	const {
		loading,
		saving,
		error,
		success,
		formData,
		updateFormData,
		handleSubmit,
	} = usePreferences();

	if (loading) {
		return (
			<div className="min-h-screen bg-black flex items-center justify-center">
				<div className="text-white text-xl">Loading preferences...</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-black text-white py-8">
			<div className="container mx-auto px-4 max-w-4xl">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold mb-4">Set Your Job Preferences</h1>
					<p className="text-lg text-content-secondary">
						Help us find the perfect job matches for you
					</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-8">
					{/* Basic Info Section */}
					<div className="bg-white/5 rounded-2xl p-6 border border-white/10">
						<h2 className="text-xl font-semibold mb-6">Basic Information</h2>
						<BasicInfoSection formData={formData} onUpdate={updateFormData} />
					</div>

					{/* Language & Location Section */}
					<div className="bg-white/5 rounded-2xl p-6 border border-white/10">
						<h2 className="text-xl font-semibold mb-6">Language & Location</h2>
						<LanguageLocationSection formData={formData} onUpdate={updateFormData} />
					</div>

					{/* Career Preferences Section */}
					<div className="bg-white/5 rounded-2xl p-6 border border-white/10">
						<h2 className="text-xl font-semibold mb-6">Career Preferences</h2>
						<CareerPreferencesSection formData={formData} onUpdate={updateFormData} />
					</div>

					{/* Error Display */}
					{error && (
						<div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
							<p className="text-red-400">{error}</p>
						</div>
					)}

					{/* Success Display */}
					{success && (
						<div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
							<p className="text-green-400">
								Preferences saved successfully! Redirecting to your matches...
							</p>
						</div>
					)}

					{/* Submit Button */}
					<div className="flex justify-center">
						<Button
							type="submit"
							variant="primary"
							size="lg"
							disabled={saving || !formData.experience}
							className="px-8 py-3"
						>
							{saving ? "Saving Preferences..." : "Save & Find Matches →"}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}

export default function PreferencesPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-black flex items-center justify-center">
					<div className="text-white text-xl">Loading...</div>
				</div>
			}
		>
			<PreferencesContent />
		</Suspense>
	);
}