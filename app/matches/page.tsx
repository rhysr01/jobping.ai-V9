"use client";

import { Suspense } from "react";
import ErrorBoundary from "../../components/error-boundary";
import MatchesPageContent from "./components/MatchesPageContent";

export default function MatchesPage() {
	return (
		<ErrorBoundary>
			<Suspense
				fallback={
					<div className="min-h-screen bg-black flex items-center justify-center">
						<div className="text-white text-xl">Loading...</div>
					</div>
				}
			>
				<MatchesPageContent />
			</Suspense>
		</ErrorBoundary>
	);
}