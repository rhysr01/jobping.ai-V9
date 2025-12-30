"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import Button from "@/components/ui/Button";
import { apiCall } from "@/lib/api-client";

interface MatchEvidence {
	job: {
		id: number;
		title: string;
		company: string;
		location: string;
		description: string;
		job_url: string;
		job_hash: string;
		is_active: boolean;
		categories?: string[];
	};
	match: {
		match_score: number;
		match_reason: string;
		matched_at: string;
	};
	user_email: string;
	highlightedMatches?: string[]; // Skills, keywords, locations that triggered the match
}

function MatchEvidencePageContent() {
	const params = useParams();
	const searchParams = useSearchParams();
	const jobHash = params?.jobHash as string;
	const token = searchParams?.get("token") || "";
	const email = searchParams?.get("email") || "";

	const [evidence, setEvidence] = useState<MatchEvidence | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [applying, setApplying] = useState(false);

	const fetchEvidence = async () => {
		try {
			const response = await apiCall(
				`/api/matches/evidence?jobHash=${encodeURIComponent(jobHash)}&email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`,
			);

			if (!response.ok) {
				const data = await response
					.json()
					.catch(() => ({ error: "Failed to load match evidence" }));
				setError(data.error || "Failed to load match evidence");
				setLoading(false);
				return;
			}

			const data = await response.json();
			setEvidence(data);
			setLoading(false);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to load match evidence",
			);
			setLoading(false);
		}
	};

	useEffect(() => {
		if (!jobHash || !token || !email) {
			setError(
				"Missing required parameters. Please use the link from your email.",
			);
			setLoading(false);
			return;
		}

		// Fetch match evidence (token verification happens on server)
		fetchEvidence();
	}, [
		jobHash,
		token,
		email, // Fetch match evidence (token verification happens on server)
		fetchEvidence,
	]);

	const handleApply = async () => {
		if (!evidence?.job.job_url) {
			setError("No application URL available for this job");
			return;
		}

		setApplying(true);

		try {
			// Track positive click before redirecting
			await apiCall("/api/tracking/implicit", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					jobHash: evidence.job.job_hash,
					email: evidence.user_email,
					signalType: "click",
					source: "web",
					metadata: { action: "apply_clicked", page: "evidence" },
				}),
			}).catch(() => {
				// Fail silently - tracking is not critical
			});

			// Redirect to job URL
			window.open(evidence.job.job_url, "_blank", "noopener,noreferrer");
		} catch (err) {
			console.error("Error tracking apply click:", err);
			// Still redirect even if tracking fails
			window.open(evidence.job.job_url, "_blank", "noopener,noreferrer");
		} finally {
			setApplying(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-black text-white flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
					<p className="text-gray-400">Loading match evidence...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
				<div className="max-w-md text-center">
					<h1 className="text-2xl font-bold mb-4 text-red-400">Error</h1>
					<p className="text-gray-300 mb-6">{error}</p>
					<Button href="/signup/free" variant="primary">
						Sign Up for JobPing
					</Button>
				</div>
			</div>
		);
	}

	if (!evidence) {
		return (
			<div className="min-h-screen bg-black text-white flex items-center justify-center">
				<p className="text-gray-400">No match evidence found.</p>
			</div>
		);
	}

	const scoreColor =
		evidence.match.match_score >= 80
			? "text-green-400"
			: evidence.match.match_score >= 70
				? "text-yellow-400"
				: "text-gray-400";

	return (
		<div className="min-h-screen bg-black text-white">
			<div className="max-w-4xl mx-auto px-4 py-12">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-4xl font-bold mb-2">Why This Match Fits You</h1>
					<p className="text-gray-400">Evidence-based matching powered by AI</p>
				</div>

				{/* Match Score Card */}
				<div className="bg-zinc-900 rounded-lg p-6 mb-6 border border-zinc-800">
					<div className="flex items-center justify-between mb-4">
						<div>
							<h2 className="text-2xl font-bold mb-1">{evidence.job.title}</h2>
							<p className="text-gray-400">
								{evidence.job.company} • {evidence.job.location}
							</p>
						</div>
						<div className="text-right">
							<div className={`text-4xl font-bold ${scoreColor}`}>
								{evidence.match.match_score}
							</div>
							<div className="text-sm text-gray-500">Match Score</div>
						</div>
					</div>

					{/* Job Status Warning */}
					{!evidence.job.is_active && (
						<div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mb-4">
							<p className="text-yellow-400 text-sm">
								⚠️ This role may have been filled. The evidence below is still
								valuable for understanding your match profile.
							</p>
						</div>
					)}
				</div>

				{/* Evidence Section */}
				<div className="bg-zinc-900 rounded-lg p-6 mb-6 border border-zinc-800">
					<h3 className="text-xl font-bold mb-4">Match Evidence</h3>
					<div className="prose prose-invert max-w-none">
						<p className="text-gray-300 leading-relaxed whitespace-pre-line">
							{evidence.match.match_reason ||
								"AI-matched based on your preferences"}
						</p>
					</div>

					{/* Highlighted Skills & Keywords */}
					{evidence.highlightedMatches &&
						evidence.highlightedMatches.length > 0 && (
							<div className="mt-6 pt-6 border-t border-zinc-800">
								<h4 className="text-lg font-semibold mb-3 text-purple-400">
									What Triggered This Match
								</h4>
								<div className="flex flex-wrap gap-2">
									{evidence.highlightedMatches.map(
										(match: string, idx: number) => (
											<span
												key={idx}
												className="px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-lg text-sm font-medium text-purple-300"
											>
												{match}
											</span>
										),
									)}
								</div>
							</div>
						)}
				</div>

				{/* Skills Match Visualization */}
				<div className="bg-zinc-900 rounded-lg p-6 mb-6 border border-zinc-800">
					<h3 className="text-xl font-bold mb-4">Skills Alignment</h3>
					<div className="space-y-3">
						<div>
							<div className="flex justify-between text-sm mb-1">
								<span className="text-gray-300">Match Confidence</span>
								<span className="text-gray-400">
									{evidence.match.match_score}%
								</span>
							</div>
							<div className="w-full bg-zinc-800 rounded-full h-2">
								<div
									className={`h-2 rounded-full ${
										evidence.match.match_score >= 80
											? "bg-green-500"
											: evidence.match.match_score >= 70
												? "bg-yellow-500"
												: "bg-gray-500"
									}`}
									style={{ width: `${evidence.match.match_score}%` }}
								></div>
							</div>
						</div>
					</div>
				</div>

				{/* Apply Button */}
				<div className="flex gap-4">
					<Button
						onClick={handleApply}
						disabled={applying || !evidence.job.is_active}
						variant="primary"
						className="flex-1"
					>
						{applying
							? "Opening..."
							: evidence.job.is_active
								? "Apply on Source →"
								: "Job May Be Filled"}
					</Button>
				</div>

				{/* Footer */}
				<div className="mt-8 text-center text-sm text-gray-500">
					<p>
						This match was generated on{" "}
						{new Date(evidence.match.matched_at).toLocaleDateString()}
					</p>
					<p className="mt-2">
						<a
							href="/preferences"
							className="text-purple-400 hover:text-purple-300"
						>
							Update your preferences
						</a>
						{" • "}
						<a
							href="/dashboard"
							className="text-purple-400 hover:text-purple-300"
						>
							View all matches
						</a>
					</p>
				</div>
			</div>
		</div>
	);
}

export default function MatchEvidencePage() {
	return (
		<ErrorBoundary>
			<MatchEvidencePageContent />
		</ErrorBoundary>
	);
}
