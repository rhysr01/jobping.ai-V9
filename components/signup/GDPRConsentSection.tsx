import { FormFieldError } from "../ui/FormFieldFeedback";
import { UseSignupFormReturn } from "@/hooks/useSignupForm";

interface GDPRConsentSectionProps {
	formState: UseSignupFormReturn;
}

export function GDPRConsentSection({ formState }: GDPRConsentSectionProps) {
	const { formData, setFormData, setTouchedFields, shouldShowError } = formState;

	const handleGDPRChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFormData((prev) => ({
			...prev,
			gdprConsent: e.target.checked,
		}));
	};

	const handleGDPRBlur = () => {
		setTouchedFields((prev) => new Set(prev).add("gdprConsent"));
	};

	return (
		<div className="mt-6 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
			<label className="flex items-start gap-3 cursor-pointer group">
				<input
					type="checkbox"
					required
					checked={formData.gdprConsent}
					onChange={handleGDPRChange}
					onBlur={handleGDPRBlur}
					className="mt-1 w-5 h-5 rounded border-2 border-zinc-600 bg-zinc-800 checked:bg-brand-500 checked:border-brand-500 cursor-pointer"
					aria-required="true"
				/>
				<span className="text-sm text-content-secondary">
					I agree to the{" "}
					<a
						href="/legal/privacy"
						target="_blank"
						rel="noopener noreferrer"
						className="text-brand-400 hover:text-brand-300 underline"
					>
						Privacy Policy
					</a>{" "}
					and consent to processing my data for job matching purposes. *
				</span>
			</label>
			{shouldShowError(
				"gdprConsent",
				!formData.gdprConsent,
				formData.gdprConsent,
			) && (
				<FormFieldError
					error="Please accept the Privacy Policy to continue"
					id="gdpr-error"
				/>
			)}
		</div>
	);
}