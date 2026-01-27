"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";
import { BrandIcons } from "../../../components/ui/BrandIcons";
import { SuccessAnimation } from "../../../components/ui/SuccessAnimation";
import CustomButton from "../../../components/ui/CustomButton";

function EmailVerificationContent() {
	const searchParams = useSearchParams();
	const email = searchParams.get("email") || "";
	const [isResending, setIsResending] = useState(false);
	const [resendMessage, setResendMessage] = useState("");

	const handleResend = async () => {
		if (!email) return;

		setIsResending(true);
		try {
			const response = await fetch("/api/verify-email/resend", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email }),
			});

			if (response.ok) {
				setResendMessage("Verification email sent! Check your inbox.");
			} else {
				setResendMessage("Failed to send email. Please try again.");
			}
		} catch (error) {
			setResendMessage("Network error. Please try again.");
		} finally {
			setIsResending(false);
			setTimeout(() => setResendMessage(""), 5000);
		}
	};

	return (
		<div className="min-h-screen bg-black text-white py-16">
			<div className="container mx-auto px-4 max-w-2xl">
				<div className="text-center mb-8">
					<SuccessAnimation message="Account Created!" />

					<div className="inline-flex items-center gap-2 rounded-full border-2 border-emerald-500/40 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300 mb-4">
						<BrandIcons.Mail className="h-3 w-3" />
						Email Verification Required
					</div>

					<h1 className="text-3xl md:text-4xl font-bold mb-4">
						Check Your Email
					</h1>

					<p className="text-lg text-zinc-400 mb-8">
						We sent a verification link to{" "}
						<strong className="text-white">{email}</strong>
					</p>

					<div className="bg-white/5 rounded-2xl p-8 border border-white/10 mb-8">
						<div className="flex items-start gap-4 mb-6">
							<div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
								<BrandIcons.Mail className="w-6 h-6 text-purple-400" />
							</div>
							<div className="text-left">
								<h3 className="text-xl font-bold mb-2">Verify to Continue</h3>
								<p className="text-zinc-400 mb-4">
									Click the verification link in your email to activate your
									account and proceed to payment.
								</p>
								<ul className="text-sm text-zinc-400 space-y-1">
									<li>• Link expires in 24 hours</li>
									<li>• Check your spam folder if you don't see it</li>
									<li>• The email comes from contact@getjobping.com</li>
								</ul>
							</div>
						</div>

						{resendMessage && (
							<div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
								{resendMessage}
							</div>
						)}

						<div className="flex gap-4 justify-center">
							<CustomButton
								onClick={handleResend}
								disabled={isResending || !email}
								variant="secondary"
								size="sm"
							>
								{isResending ? "Sending..." : "Resend Email"}
							</CustomButton>
							<Link href="/signup">
								<CustomButton variant="secondary" size="sm">
									Start Over
								</CustomButton>
							</Link>
						</div>
					</div>

					<div className="text-sm text-zinc-500">
						Need help?{" "}
						<a
							href="mailto:contact@getjobping.com"
							className="text-purple-400 hover:text-purple-300 underline"
						>
							Contact Support
						</a>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function EmailVerificationPage() {
	return (
		<Suspense fallback={<div className="min-h-screen bg-black" />}>
			<EmailVerificationContent />
		</Suspense>
	);
}
