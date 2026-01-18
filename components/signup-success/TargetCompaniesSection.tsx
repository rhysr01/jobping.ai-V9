import { BrandIcons } from "../ui/BrandIcons";
import TargetCompaniesAlert from "../ui/TargetCompaniesAlert";
import { TargetCompany } from "@/hooks/useSignupSuccess";

interface TargetCompaniesSectionProps {
	targetCompanies: TargetCompany[];
	metadataLoading: boolean;
	onSetAlert: (company: string) => void;
}

export function TargetCompaniesSection({
	targetCompanies,
	metadataLoading,
	onSetAlert,
}: TargetCompaniesSectionProps) {
	if (metadataLoading) {
		return (
			<div className="bg-white/5 rounded-lg p-6 border border-white/10">
				<div className="flex items-center gap-3 mb-4">
					<div className="w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
					<h3 className="text-lg font-semibold text-white">
						Loading your target companies...
					</h3>
				</div>
			</div>
		);
	}

	if (!targetCompanies || targetCompanies.length === 0) {
		return null;
	}

	return (
		<div className="bg-white/5 rounded-2xl p-6 border border-white/10">
			<div className="flex items-center gap-3 mb-6">
				<div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
					<BrandIcons.Target className="w-5 h-5 text-info" />
				</div>
				<div>
					<h3 className="text-lg font-semibold text-white">
						Your Target Companies
					</h3>
					<p className="text-sm text-content-secondary">
						Companies that frequently hire for your profile
					</p>
				</div>
			</div>

			<TargetCompaniesAlert
				companies={targetCompanies}
				message="Set up alerts for these companies to get notified when they post new roles."
				onSetAlert={onSetAlert}
			/>

			<div className="mt-4 p-4 bg-blue-500/10 rounded-md border border-blue-500/20">
				<p className="text-sm text-info/80">
					💡 <strong>Pro tip:</strong> We'll automatically scan these companies weekly
					and send you priority notifications for new roles that match your preferences.
				</p>
			</div>
		</div>
	);
}