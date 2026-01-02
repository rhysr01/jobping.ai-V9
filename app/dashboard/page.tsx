"use client";

import {
	CheckCircle,
	ExternalLink,
	Loader2,
	Package,
	XCircle,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";

interface AccountStatus {
	accountId: string | null;
	onboardingComplete: boolean;
	chargesEnabled: boolean;
	payoutsEnabled: boolean;
	detailsSubmitted: boolean;
	requirements: {
		currentlyDue: string[];
		pastDue: string[];
	};
}

function DashboardContent() {
	const searchParams = useSearchParams();
	const [loading, setLoading] = useState(true);
	const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(
		null,
	);
	const [error, setError] = useState<string>("");
	const [onboardingUrl, setOnboardingUrl] = useState<string>("");

	// Get userId from query params (you may want to get this from auth instead)
	const userId = searchParams.get("userId") || "";

	const loadAccountStatus = useCallback(async () => {
		try {
			setLoading(true);
			setError("");

			// Create or get account
			const createRes = await fetch("/api/stripe-connect/create-account", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-csrf-token": "jobping-request",
				},
				body: JSON.stringify({
					userId,
					email: `user-${userId}@example.com`, // Replace with actual user email
					country: "US",
				}),
			});

			if (!createRes.ok) {
				const data = await createRes.json();
				throw new Error(data.error || "Failed to create/get account");
			}

			const createData = await createRes.json();
			const accountId = createData.accountId;

			if (!createData.onboardingComplete) {
				// Get onboarding link
				const linkRes = await fetch("/api/stripe-connect/create-account-link", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-csrf-token": "jobping-request",
					},
					body: JSON.stringify({ accountId }),
				});

				if (linkRes.ok) {
					const linkData = await linkRes.json();
					setOnboardingUrl(linkData.url);
				}
			}

			// Get account details
			const accountRes = await fetch(
				`/api/stripe-connect/get-account?accountId=${accountId}`,
			);
			if (accountRes.ok) {
				const accountData = await accountRes.json();
				setAccountStatus({
					accountId,
					onboardingComplete:
						accountData.account.chargesEnabled &&
						accountData.account.payoutsEnabled,
					chargesEnabled: accountData.account.chargesEnabled,
					payoutsEnabled: accountData.account.payoutsEnabled,
					detailsSubmitted: accountData.account.detailsSubmitted,
					requirements: accountData.account.requirements,
				});
			}
		} catch (err: any) {
			setError(err.message || "Failed to load account status");
		} finally {
			setLoading(false);
		}
	}, [userId]);

	useEffect(() => {
		if (!userId) {
			setError("User ID is required");
			setLoading(false);
			return;
		}

		loadAccountStatus();
	}, [userId, loadAccountStatus]);

	if (loading) {
		return (
			<div className="min-h-screen bg-black flex items-center justify-center">
				<Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
			</div>
		);
	}

	if (error && !accountStatus) {
		return (
			<div className="min-h-screen bg-black flex items-center justify-center">
				<div className="text-center">
					<XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
					<p className="text-white text-lg mb-4">{error}</p>
					<Button onClick={loadAccountStatus}>Retry</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-black">
			<div className="container-page py-16 md:py-24">
				<div className="max-w-4xl mx-auto">
					<h1 className="text-4xl md:text-5xl font-semibold text-white mb-8">
						Connect Dashboard
					</h1>

					{accountStatus && (
						<div className="space-y-6">
							{/* Account Status Card */}
							<div className="rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-xl px-6 py-8">
								<h2 className="text-xl font-semibold text-white mb-4">
									Account Status
								</h2>

								<div className="space-y-3">
									<div className="flex items-center justify-between">
										<span className="text-zinc-300">Account ID</span>
										<code className="text-sm text-brand-300">
											{accountStatus.accountId}
										</code>
									</div>

									<div className="flex items-center justify-between">
										<span className="text-zinc-300">Charges Enabled</span>
										{accountStatus.chargesEnabled ? (
											<CheckCircle className="w-5 h-5 text-green-500" />
										) : (
											<XCircle className="w-5 h-5 text-red-500" />
										)}
									</div>

									<div className="flex items-center justify-between">
										<span className="text-zinc-300">Payouts Enabled</span>
										{accountStatus.payoutsEnabled ? (
											<CheckCircle className="w-5 h-5 text-green-500" />
										) : (
											<XCircle className="w-5 h-5 text-red-500" />
										)}
									</div>

									<div className="flex items-center justify-between">
										<span className="text-zinc-300">Onboarding Complete</span>
										{accountStatus.onboardingComplete ? (
											<CheckCircle className="w-5 h-5 text-green-500" />
										) : (
											<XCircle className="w-5 h-5 text-red-500" />
										)}
									</div>
								</div>

								{!accountStatus.onboardingComplete && onboardingUrl && (
									<div className="mt-6 pt-6 border-t border-white/10">
										<Button
											href={onboardingUrl}
											target="_blank"
											className="w-full"
										>
											Complete Onboarding
											<ExternalLink className="w-4 h-4" />
										</Button>
									</div>
								)}

								{accountStatus.requirements.currentlyDue.length > 0 && (
									<div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
										<p className="text-yellow-200 text-sm font-medium mb-2">
											Requirements to Complete:
										</p>
										<ul className="list-disc list-inside text-yellow-200/80 text-sm space-y-1">
											{accountStatus.requirements.currentlyDue.map((req, i) => (
												<li key={i}>{req}</li>
											))}
										</ul>
									</div>
								)}
							</div>

							{/* Quick Actions */}
							{accountStatus.onboardingComplete && (
								<div className="rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-xl px-6 py-8">
									<h2 className="text-xl font-semibold text-white mb-4">
										Quick Actions
									</h2>

									<div className="grid gap-4 md:grid-cols-2">
										<Button
											href={`/store/${accountStatus.accountId}`}
											variant="secondary"
											className="w-full"
										>
											<Package className="w-4 h-4" />
											View Storefront
										</Button>

										<Button
											onClick={loadAccountStatus}
											variant="ghost"
											className="w-full"
										>
											Refresh Status
										</Button>
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default function DashboardPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-black flex items-center justify-center">
					<Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
				</div>
			}
		>
			<DashboardContent />
		</Suspense>
	);
}
