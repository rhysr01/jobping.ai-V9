import Link from "next/link";
import { BrandIcons } from "../ui/BrandIcons";
import Button from "../ui/Button";

interface NextStepsSectionProps {
	email: string;
}

export function NextStepsSection({ email }: NextStepsSectionProps) {
	return (
		<div className="bg-white/5 rounded-2xl p-6 border border-white/10">
			<div className="flex items-center gap-3 mb-6">
				<div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
					<BrandIcons.CheckCircle className="w-5 h-5 text-green-400" />
				</div>
				<div>
					<h3 className="text-lg font-semibold text-white">
						What's Next?
					</h3>
					<p className="text-sm text-content-secondary">
						Your personalized job matching journey begins now
					</p>
				</div>
			</div>

			<div className="space-y-4">
				<div className="flex items-start gap-3 p-4 bg-green-500/10 rounded-xl border border-green-500/20">
					<div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
						<span className="text-xs text-green-400 font-bold">1</span>
					</div>
					<div>
						<h4 className="text-sm font-semibold text-white mb-1">
							Check Your Email
						</h4>
						<p className="text-sm text-content-secondary">
							Your first batch of personalized job matches is on its way to{" "}
							<span className="text-green-400 font-medium">{email}</span>
						</p>
					</div>
				</div>

				<div className="flex items-start gap-3 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
					<div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
						<span className="text-xs text-blue-400 font-bold">2</span>
					</div>
					<div>
						<h4 className="text-sm font-semibold text-white mb-1">
							Apply to Matches
						</h4>
						<p className="text-sm text-content-secondary">
							Review your job matches and apply to positions that interest you
						</p>
					</div>
				</div>

				<div className="flex items-start gap-3 p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
					<div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center mt-0.5">
						<span className="text-xs text-purple-400 font-bold">3</span>
					</div>
					<div>
						<h4 className="text-sm font-semibold text-white mb-1">
							Get Weekly Updates
						</h4>
						<p className="text-sm text-content-secondary">
							Receive 15 new job matches every Monday, tailored to your preferences
						</p>
					</div>
				</div>
			</div>

			<div className="mt-6 flex gap-3">
				<Link href="/matches" className="flex-1">
					<Button variant="primary" className="w-full">
						View My Matches →
					</Button>
				</Link>
				<Link href="/preferences">
					<Button variant="secondary">
						Update Preferences
					</Button>
				</Link>
			</div>

			<div className="mt-4 text-center">
				<p className="text-xs text-content-secondary">
					Need help? <Link href="/contact" className="text-brand-400 hover:text-brand-300 underline">Contact our support team</Link>
				</p>
			</div>
		</div>
	);
}