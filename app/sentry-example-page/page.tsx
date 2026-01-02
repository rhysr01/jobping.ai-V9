"use client";

import * as Sentry from "@sentry/nextjs";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function SentryExampleContent() {
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const searchParams = useSearchParams();

	// Auto-trigger test error if ?test=true is in URL
	useEffect(() => {
		if (searchParams.get("test") === "true") {
			// Trigger the exact error from Sentry docs
			try {
				// @ts-expect-error - Intentionally calling undefined function
				myUndefinedFunction();
			} catch (error) {
				Sentry.captureException(error);
				setErrorMessage("Auto-triggered test error sent to Sentry!");
			}
		}
	}, [searchParams]);

	const triggerClientError = () => {
		try {
			// @ts-expect-error - Intentionally calling undefined function
			myUndefinedFunction();
		} catch (error) {
			Sentry.captureException(error);
			setErrorMessage("Client error captured and sent to Sentry!");
		}
	};

	const triggerUnhandledError = () => {
		// This will trigger an unhandled error
		// @ts-expect-error - Intentionally calling undefined function
		myUndefinedFunction();
	};

	const triggerSentryException = () => {
		try {
			throw new Error("Test error from Sentry example page");
		} catch (error) {
			Sentry.captureException(error, {
				tags: {
					test: "sentry-example-page",
				},
				extra: {
					page: "sentry-example-page",
					timestamp: new Date().toISOString(),
				},
			});
			setErrorMessage("Exception captured and sent to Sentry!");
		}
	};

	const triggerSentryMessage = () => {
		Sentry.captureMessage("Test message from Sentry example page", "info");
		setErrorMessage("Message captured and sent to Sentry!");
	};

	const triggerServerError = async () => {
		try {
			const response = await fetch("/api/sentry-test");
			const data = await response.json();
			setErrorMessage(data.message || "Server error triggered!");
		} catch (error) {
			Sentry.captureException(error);
			setErrorMessage("Failed to trigger server error");
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-900/10 via-zinc-950 to-zinc-950 p-8">
			<div className="max-w-2xl mx-auto">
				<h1 className="text-4xl font-bold text-white mb-2">
					Sentry Integration Test Page
				</h1>
				<p className="text-zinc-400 mb-8">
					Use the buttons below to test different types of errors and verify
					your Sentry integration is working correctly.
				</p>

				{errorMessage && (
					<div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
						<p className="text-green-400">{errorMessage}</p>
					</div>
				)}

				{/* Prominent test button matching Sentry docs */}
				<div className="mb-6 p-6 bg-gradient-to-r from-red-600/20 to-orange-600/20 border-2 border-red-500/50 rounded-lg">
					<h2 className="text-2xl font-bold text-white mb-3">
						Quick Test (Sentry Docs Example)
					</h2>
					<button
						type="button"
						onClick={() => {
							// Exact example from Sentry docs
							// @ts-expect-error - Intentionally calling undefined function
							myUndefinedFunction();
						}}
						className="w-full px-6 py-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors text-lg shadow-lg"
					>
						Trigger Test Error (myUndefinedFunction)
					</button>
					<p className="text-sm text-zinc-300 mt-3">
						This triggers the exact error from Sentry's documentation. Check
						your Sentry dashboard to see if it appears!
					</p>
				</div>

				<div className="space-y-4">
					<div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
						<h2 className="text-xl font-semibold text-white mb-4">
							Client-Side Errors
						</h2>
						<div className="space-y-3">
							<button
								type="button"
								onClick={triggerClientError}
								className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
							>
								Trigger Handled Client Error
							</button>
							<p className="text-sm text-zinc-400">
								Captures an error with try/catch and sends it to Sentry
							</p>

							<button
								type="button"
								onClick={triggerUnhandledError}
								className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
							>
								Trigger Unhandled Client Error
							</button>
							<p className="text-sm text-zinc-400">
								Triggers an unhandled error (will be caught by Sentry
								automatically)
							</p>

							<button
								type="button"
								onClick={triggerSentryException}
								className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
							>
								Trigger Sentry Exception with Context
							</button>
							<p className="text-sm text-zinc-400">
								Captures an exception with custom tags and extra data
							</p>

							<button
								type="button"
								onClick={triggerSentryMessage}
								className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
							>
								Send Test Message to Sentry
							</button>
							<p className="text-sm text-zinc-400">
								Sends an informational message to Sentry
							</p>
						</div>
					</div>

					<div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
						<h2 className="text-xl font-semibold text-white mb-4">
							Server-Side Errors
						</h2>
						<div className="space-y-3">
							<button
								type="button"
								onClick={triggerServerError}
								className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
							>
								Trigger Server Error
							</button>
							<p className="text-sm text-zinc-400">
								Calls a server API route that triggers an error
							</p>
						</div>
					</div>
				</div>

				<div className="mt-8 p-4 bg-zinc-900/30 border border-zinc-800 rounded-lg">
					<h3 className="text-lg font-semibold text-white mb-2">Next Steps</h3>
					<ol className="list-decimal list-inside space-y-2 text-zinc-400 text-sm">
						<li>Click any of the buttons above to trigger an error</li>
						<li>
							Check your Sentry dashboard at{" "}
							<a
								href="https://sentry.io/organizations/jobping/projects/javascript-nextjs/"
								target="_blank"
								rel="noopener noreferrer"
								className="text-blue-400 hover:text-blue-300 underline"
							>
								sentry.io
							</a>
						</li>
						<li>
							You should see the error appear in your Sentry Issues within a few
							seconds
						</li>
						<li>
							Once you see an issue, your Sentry integration is working
							correctly!
						</li>
					</ol>
				</div>
			</div>
		</div>
	);
}

export default function SentryExamplePage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-gradient-to-br from-purple-900/10 via-zinc-950 to-zinc-950 flex items-center justify-center">
					<p className="text-white">Loading...</p>
				</div>
			}
		>
			<SentryExampleContent />
		</Suspense>
	);
}
