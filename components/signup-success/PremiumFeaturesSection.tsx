import { BrandIcons } from "../ui/BrandIcons";
import { SuccessAnimation } from "../ui/SuccessAnimation";
import {
	PREMIUM_ROLES_PER_MONTH,
	PREMIUM_ROLES_PER_WEEK,
} from "../../lib/productMetrics";

interface PremiumFeaturesSectionProps {
	matchCount: number;
	email: string;
}

export function PremiumFeaturesSection({ matchCount, email }: PremiumFeaturesSectionProps) {
	return (
		<div className="text-center mb-8">
			<SuccessAnimation message="Welcome to JobPing Premium!" />

			<div className="inline-flex items-center gap-2 rounded-full border-2 border-brand-500/40 bg-brand-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-200 mb-4">
				<BrandIcons.Zap className="h-3 w-3" />
				Premium Activated
			</div>

			<h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
				Welcome to JobPing Premium!
			</h1>

			<p className="text-lg text-content-secondary mb-8 max-w-2xl mx-auto">
				You've been sent your first {matchCount} personalized job matches.
				From now on, you'll receive{" "}
				<strong className="text-brand-400">
					{PREMIUM_ROLES_PER_WEEK} jobs per week
				</strong>{" "}
				({PREMIUM_ROLES_PER_MONTH} per month) instead of the free 5.
			</p>

			{/* Premium Benefits Grid */}
			<div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
				<div className="bg-white/5 rounded-lg p-6 border border-white/10">
					<div className="w-12 h-12 rounded-full bg-brand-500/20 flex items-center justify-center mb-4 mx-auto">
						<BrandIcons.Zap className="w-6 h-6 text-brand-400" />
					</div>
					<h3 className="text-lg font-semibold text-white mb-2">
						{PREMIUM_ROLES_PER_WEEK} Jobs Per Week
					</h3>
					<p className="text-sm text-content-secondary">
						3x more opportunities delivered to your inbox every Monday
					</p>
				</div>

				<div className="bg-white/5 rounded-lg p-6 border border-white/10">
					<div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4 mx-auto">
						<BrandIcons.Check className="w-6 h-6 text-success" />
					</div>
					<h3 className="text-lg font-semibold text-white mb-2">
						Advanced Matching
					</h3>
					<p className="text-sm text-content-secondary">
						AI-powered job matching with detailed compatibility scores
					</p>
				</div>

				<div className="bg-white/5 rounded-lg p-6 border border-white/10">
					<div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-4 mx-auto">
						<BrandIcons.Clock className="w-6 h-6 text-info" />
					</div>
					<h3 className="text-lg font-semibold text-white mb-2">
						Priority Support
					</h3>
					<p className="text-sm text-content-secondary">
						Direct access to our team for any questions or custom requests
					</p>
				</div>
			</div>

			{/* Email Confirmation */}
			<div className="bg-gradient-to-r from-brand-500/10 via-purple-500/10 to-pink-500/10 rounded-lg p-6 border border-brand-500/20 max-w-md mx-auto">
				<div className="flex items-center justify-center gap-3 mb-4">
					<BrandIcons.Mail className="w-6 h-6 text-brand-400" />
					<span className="text-lg font-semibold text-white">Check Your Email</span>
				</div>
				<p className="text-sm text-content-secondary mb-4">
					We've sent your first batch of {matchCount} job matches to:
				</p>
				<p className="text-brand-400 font-medium">{email}</p>
			</div>
		</div>
	);
}