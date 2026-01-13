"use client";

import { Suspense } from "react";
import { EmailStatusSection } from "../../../components/signup-success/EmailStatusSection";
import { PremiumFeaturesSection } from "../../../components/signup-success/PremiumFeaturesSection";
import { TargetCompaniesSection } from "../../../components/signup-success/TargetCompaniesSection";
import { CustomScanSection } from "../../../components/signup-success/CustomScanSection";
import { NextStepsSection } from "../../../components/signup-success/NextStepsSection";
import { FreeSuccessPage } from "../../../components/signup-success/FreeSuccessPage";
import { useSignupSuccess } from "../../../hooks/useSignupSuccess";

function SignupSuccessContent() {
	const {
		emailSentAt,
		resending,
		emailStatus,
		metadata,
		metadataLoading,
		email,
		matchCount,
		isFree,
		isPremium,
		handleSetAlert,
		handleResendEmail,
	} = useSignupSuccess();

	// Show dedicated free success page for free tier users
	if (isFree) {
		return <FreeSuccessPage matchCount={matchCount} email={email} />;
	}

	// Premium success page (existing layout)
	return (
		<div className="min-h-screen bg-black text-white py-8">
			<div className="container mx-auto px-4 max-w-4xl">
				{/* Premium Features Section */}
				<PremiumFeaturesSection matchCount={matchCount} email={email} />

				{/* Content Grid */}
				<div className="grid lg:grid-cols-2 gap-8">
					{/* Left Column */}
					<div className="space-y-6">
						{/* Email Status */}
						<EmailStatusSection
							emailSentAt={emailSentAt}
							emailStatus={emailStatus}
							resending={resending}
							onResendEmail={handleResendEmail}
						/>

						{/* Target Companies */}
						{metadata?.targetCompanies && (
							<TargetCompaniesSection
								targetCompanies={metadata.targetCompanies}
								metadataLoading={metadataLoading}
								onSetAlert={handleSetAlert}
							/>
						)}
					</div>

					{/* Right Column */}
					<div className="space-y-6">
						{/* Custom Scan */}
						{metadata?.customScan && (
							<CustomScanSection customScan={metadata.customScan} email={email} />
						)}

						{/* Next Steps */}
						<NextStepsSection email={email} />
					</div>
				</div>
			</div>
		</div>
	);
}

export default function SignupSuccessPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-black flex items-center justify-center">
					<div className="text-white text-xl">Loading...</div>
				</div>
			}
		>
			<SignupSuccessContent />
		</Suspense>
	);
}