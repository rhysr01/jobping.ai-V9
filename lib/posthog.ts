import posthog from "posthog-js";

if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
	// Check cookie consent before initializing
	const consent = localStorage.getItem("cookie-consent");

	posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
		api_host: "https://app.posthog.com",
		// GDPR compliance - disable PII capture by default
		autocapture: false, // Don't auto-capture form inputs (prevents email capture)
		capture_pageview: true, // Still track pageviews
		capture_pageleave: true,
		disable_session_recording: consent !== "accepted", // Only enable with consent
		ip: false, // Don't capture IP addresses
		loaded: (posthog) => {
			if (process.env.NODE_ENV === "development") posthog.debug();

			// Respect cookie consent
			if (consent !== "accepted") {
				posthog.opt_out_capturing(); // Disable tracking until consent
			}
		},
	});
}

export default posthog;
