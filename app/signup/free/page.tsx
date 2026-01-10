"use client";

import ErrorBoundary from "@/components/error-boundary";
import SignupFormFree from "@/components/signup/SignupFormFree";

export default function FreeSignupPage() {
	return (
		<ErrorBoundary>
			<div className="min-h-screen bg-black py-16">
				<div className="container max-w-2xl mx-auto px-4">
					<SignupFormFree />
				</div>
			</div>
		</ErrorBoundary>
	);
}
