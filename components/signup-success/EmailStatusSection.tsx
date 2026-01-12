import { BrandIcons } from "../ui/BrandIcons";
import Button from "../ui/Button";
import { EmailStatus } from "@/hooks/useSignupSuccess";

interface EmailStatusSectionProps {
	emailSentAt: string;
	emailStatus: EmailStatus;
	resending: boolean;
	onResendEmail: () => void;
}

export function EmailStatusSection({
	emailSentAt,
	emailStatus,
	resending,
	onResendEmail,
}: EmailStatusSectionProps) {
	return (
		<div className="bg-white/5 rounded-2xl p-6 border border-white/10">
			<div className="flex items-start justify-between mb-4">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
						<BrandIcons.Check className="w-5 h-5 text-green-400" />
					</div>
					<div>
						<h3 className="text-lg font-semibold text-white">
							Welcome to JobPing Premium!
						</h3>
						<p className="text-sm text-green-400">
							Account created • Email sent at {emailSentAt}
						</p>
					</div>
				</div>
			</div>

			<div className="space-y-4">
				<div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
					<div className={`w-3 h-3 rounded-full ${emailStatus.sent ? "bg-green-400" : "bg-yellow-400"}`} />
					<div className="flex-1">
						<p className="text-sm font-medium text-white">
							{emailStatus.sent ? "Email sent successfully" : "Sending welcome email..."}
						</p>
						{emailStatus.sentAt && (
							<p className="text-xs text-green-400">
								Delivered at {emailStatus.sentAt}
							</p>
						)}
						{emailStatus.error && (
							<p className="text-xs text-red-400">{emailStatus.error}</p>
						)}
					</div>
					{!emailStatus.sent && !emailStatus.retrying && (
						<Button
							variant="secondary"
							size="sm"
							onClick={onResendEmail}
							disabled={resending}
							className="text-xs"
						>
							{resending ? "Sending..." : "Resend"}
						</Button>
					)}
				</div>

				<div className="text-center">
					<p className="text-sm text-content-secondary mb-2">
						Didn't receive the email? Check your spam folder or
					</p>
					<Button
						variant="secondary"
						size="sm"
						onClick={onResendEmail}
						disabled={resending}
						className="text-xs"
					>
						{resending ? "Sending..." : "Send Again"}
					</Button>
				</div>
			</div>
		</div>
	);
}