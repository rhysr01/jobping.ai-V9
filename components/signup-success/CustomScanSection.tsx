import { BrandIcons } from "../ui/BrandIcons";
import CustomScanTrigger from "../ui/CustomScanTrigger";
import { CustomScan } from "@/hooks/useSignupSuccess";

interface CustomScanSectionProps {
	customScan: CustomScan | null;
	email: string;
}

export function CustomScanSection({ customScan, email }: CustomScanSectionProps) {
	if (!customScan) {
		return null;
	}

	return (
		<div className="bg-white/5 rounded-2xl p-6 border border-white/10">
			<div className="flex items-center gap-3 mb-6">
				<div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
					<BrandIcons.Sparkles className="w-5 h-5 text-purple-400" />
				</div>
				<div>
					<h3 className="text-lg font-semibold text-white">
						Custom Job Scan Available
					</h3>
					<p className="text-sm text-content-secondary">
						Run an additional scan for more job matches
					</p>
				</div>
			</div>

			<CustomScanTrigger
				scanId={customScan.scanId}
				estimatedTime={customScan.estimatedTime}
				message={customScan.message}
				userEmail={email}
			/>

			<div className="mt-4 p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
				<p className="text-sm text-purple-200">
					🚀 <strong>Bonus scan:</strong> Get additional job matches beyond your
					weekly {customScan.estimatedTime.toLowerCase()} scan. Perfect for urgent job searches!
				</p>
			</div>
		</div>
	);
}