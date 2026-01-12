"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { GhostMatches } from "../../../components/matches/GhostMatches";
import { FreeMatchingSuite } from "../../../components/signup/FreeMatchingSuite";
import { JobList } from "../../../components/matches/JobList";
import { UpgradeBanner } from "../../../components/matches/UpgradeBanner";
import CustomScanTrigger from "../../../components/ui/CustomScanTrigger";
import JobClosedModal from "../../../components/ui/JobClosedModal";
import TargetCompaniesAlert from "../../../components/ui/TargetCompaniesAlert";
import { useMatches } from "@/hooks/useMatches";

export default function MatchesPageContent() {
	const {
		jobs,
		targetCompanies,
		customScan,
		loading,
		error,
		loadingMessage,
		showUpgradeBanner,
		jobsViewed,
		clickedJobId,
		dismissedJobIds,
		dismissingJobId,
		jobsContainerRef,
		showJobClosedModal,
		jobClosedData,
		handleJobDismiss,
		handleJobClick,
		handleScroll,
		setShowJobClosedModal,
	} = useMatches();

	// Matching suite state for free signup
	const [showMatchingSuite, setShowMatchingSuite] = useState(false);
	const [successMatchCount] = useState(0);

	// Set up scroll listener
	useEffect(() => {
		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, [handleScroll]);

	if (loading && !showMatchingSuite) {
		return (
			<div className="min-h-screen bg-black flex items-center justify-center p-4">
				<div className="flex items-center justify-center py-8">
					<div className="text-center">
						<div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
						<p className="text-white font-medium">{loadingMessage}</p>
						<p className="text-zinc-400 text-sm mt-1">This usually takes 5-10 seconds</p>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-black flex items-center justify-center p-4">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className="glass-card elevation-2 p-8 text-center max-w-md mx-auto"
				>
					<div className="text-red-400 mb-4">
						<svg
							className="w-16 h-16 mx-auto mb-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
							/>
						</svg>
					</div>
					<h2 className="text-xl font-bold text-white mb-4">Oops! Something went wrong</h2>
					<p className="text-zinc-300 mb-6">{error}</p>
					<a href="/signup/free" className="inline-block">
						<button className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 rounded-lg font-medium transition-colors">
							Try Again
						</button>
					</a>
				</motion.div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-black py-8">
			{/* Unified Matching Suite - Combines celebration + progress */}
			{showMatchingSuite && (
				<FreeMatchingSuite
					matchCount={successMatchCount}
					isLoading={loading}
					onComplete={() => setShowMatchingSuite(false)}
				/>
			)}

			{/* Upgrade Banner */}
			<UpgradeBanner showUpgradeBanner={showUpgradeBanner} jobsViewed={jobsViewed} />

			{/* Main Content */}
			<div className="container mx-auto px-4 max-w-4xl">
				{/* Target Companies Alert */}
				{targetCompanies && targetCompanies.length > 0 && (
					<div className="mb-8">
						<TargetCompaniesAlert
							companies={targetCompanies}
							message="These companies have been hiring recently"
							onSetAlert={() => {}}
						/>
					</div>
				)}

				{/* Custom Scan Trigger */}
				{customScan && (
					<div className="mb-8">
						<CustomScanTrigger
							scanId={customScan.scanId}
							estimatedTime={customScan.estimatedTime}
							message={customScan.message}
							userEmail=""
						/>
					</div>
				)}

				{/* Jobs Container */}
				<div ref={jobsContainerRef} className="space-y-6">
					{/* Header */}
					<div className="text-center mb-8">
						<motion.h1
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							className="text-3xl sm:text-4xl font-bold text-white mb-4"
						>
							Your Perfect Matches
						</motion.h1>
						<p className="text-lg text-content-secondary">
							We found {jobs.length} jobs that match your preferences
						</p>
					</div>

					{/* Job List */}
					<JobList
						jobs={jobs}
						dismissedJobIds={dismissedJobIds}
						dismissingJobId={dismissingJobId}
						clickedJobId={clickedJobId}
						onJobClick={handleJobClick}
						onJobDismiss={handleJobDismiss}
						showUpgradeBanner={showUpgradeBanner}
					/>
				</div>

				{/* Ghost Matches for Empty State */}
				{jobs.length === 0 && !loading && (
					<GhostMatches />
				)}

				{/* Job Closed Modal */}
				{showJobClosedModal && jobClosedData && (
					<JobClosedModal
						isOpen={showJobClosedModal}
						onClose={() => setShowJobClosedModal(false)}
						originalJob={jobClosedData.originalJob}
						similarMatches={jobClosedData.similarMatches}
						message={jobClosedData.message}
					/>
				)}
			</div>
		</div>
	);
}