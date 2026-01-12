import { motion } from "framer-motion";
import Link from "next/link";
import Button from "../ui/Button";
import { BrandIcons } from "../ui/BrandIcons";

interface UpgradeBannerProps {
	showUpgradeBanner: boolean;
	jobsViewed: number;
}

export function UpgradeBanner({ showUpgradeBanner, jobsViewed }: UpgradeBannerProps) {
	if (!showUpgradeBanner) return null;

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className="sticky top-4 z-40 mx-auto max-w-md"
		>
			<div className="rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-amber-500/20 p-6 shadow-[0_0_40px_rgba(245,158,11,0.2)] backdrop-blur-xl">
				<div className="text-center">
					<div className="mb-4 inline-flex items-center justify-center rounded-full bg-amber-500/20 p-3">
						<BrandIcons.Zap className="h-6 w-6 text-amber-400" />
					</div>

					<h3 className="mb-2 text-lg font-bold text-white">
						Ready for More Matches?
					</h3>

					<p className="mb-4 text-sm text-amber-200">
						You've viewed {jobsViewed} job{jobsViewed !== 1 ? "s" : ""}. Premium users get{" "}
						<strong>15 jobs per week</strong> instead of 5.
					</p>

					<div className="flex gap-3">
						<Link href="/pricing" className="flex-1">
							<Button variant="primary" size="sm" className="w-full">
								Upgrade Now
							</Button>
						</Link>
						<Link href="/preferences">
							<Button variant="secondary" size="sm">
								Refine Search
							</Button>
						</Link>
					</div>

					<p className="mt-3 text-xs text-amber-300/70">
						Cancel anytime • Instant activation
					</p>
				</div>
			</div>
		</motion.div>
	);
}