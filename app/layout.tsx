import "./globals.css";
import "../lib/web-vitals";
import type { Metadata } from "next";
import { headers } from "next/headers";

// TODO: Add Axiom Web Vitals export once URL is properly configured
// export { reportWebVitals } from 'next-axiom';
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { KeyboardShortcuts } from "@/components/ui/keyboard-shortcuts";
import { Toaster as Sonner, Toaster } from "@/components/ui/sonner";
import ErrorBoundary from "../components/error-boundary";
import FAQSchema from "../components/faq-schema";
import Header from "../components/sections/header";
import StructuredData from "../components/structured-data";
import AnimatedBackground from "../components/ui/AnimatedBackground";
import CookieBanner from "../components/ui/CookieBanner";

export const metadata: Metadata = {
	title:
		"JobPing → EU early-career roles. Free: instant matches. Premium: 3x per week.",
	description:
		"EU early-career roles. Free: Get 5 instant matches. Premium: 15 jobs per week via email (3x per week: Mon/Wed/Fri). We monitor 4,000+ companies across Europe and send you hand-picked internships, graduate schemes, and entry-level roles - matched to your city, skills, and goals.",
	keywords: [
		"graduate jobs",
		"internships Europe",
		"entry level jobs",
		"junior jobs",
		"graduate scheme",
		"trainee program",
		"job matching",
		"career search",
		"London jobs",
		"Berlin jobs",
		"Paris jobs",
		"Madrid jobs",
		"Dublin jobs",
		"Amsterdam jobs",
		"early career jobs",
		"graduate opportunities",
		"internship opportunities",
		"job alerts",
		"job matching service",
	],
	authors: [{ name: "JobPing" }],
	creator: "JobPing",
	publisher: "JobPing",
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			"max-video-preview": -1,
			"max-image-preview": "large",
			"max-snippet": -1,
		},
	},
	openGraph: {
		title:
			"JobPing → EU early-career roles. Free: instant matches. Premium: 3x per week.",
		description:
			"EU early-career roles. Free: Get 5 instant matches. Premium: 15 jobs per week via email (3x per week: Mon/Wed/Fri). Hand-picked internships, graduate schemes, and entry-level roles matched to your profile.",
		url: "https://getjobping.com",
		siteName: "JobPing",
		locale: "en_US",
		type: "website",
		images: [
			{
				url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://getjobping.com"}/api/og?city=Berlin&count=14`,
				width: 1200,
				height: 630,
				alt: "JobPing - 14 new jobs found in Berlin",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title:
			"JobPing → EU early-career roles. Free: instant matches. Premium: 3x per week.",
		description:
			"EU early-career roles. Free: Get 5 instant matches. Premium: 15 jobs per week via email (3x per week: Mon/Wed/Fri).",
		creator: "@jobping",
		images: [
			`${process.env.NEXT_PUBLIC_BASE_URL || "https://getjobping.com"}/api/og?city=Berlin&count=14`,
		],
	},
	metadataBase: new URL("https://getjobping.com"),
	alternates: {
		canonical: "https://getjobping.com",
	},
};

export const viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 5,
	userScalable: true,
	viewportFit: "cover",
};

export default async function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// Get the nonce from the security-headers middleware
	const headersList = await headers();
	const nonce = headersList.get("x-nonce") || "";

	return (
		<html lang="en" className="scroll-smooth" suppressHydrationWarning>
			<head>
				{/* Font preconnect for faster font loading */}
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link
					rel="preconnect"
					href="https://fonts.gstatic.com"
					crossOrigin="anonymous"
				/>
				{/* Mobile-optimized font loading - only essential weights */}
				<link
					href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap"
					rel="stylesheet"
					media="(max-width: 1024px)"
				/>
				{/* Desktop: Lazy load Clash Display + Inter combined for efficiency */}
				<link
					href="https://fonts.googleapis.com/css2?family=Clash+Display:opsz,wght@40..72,400..700&family=Inter:wght@400;500;600;700&display=swap"
					rel="stylesheet"
					media="(min-width: 1025px)"
				/>
				<StructuredData />
				<FAQSchema />
				{/* PWA Manifest */}
				<link rel="manifest" href="/manifest.json" />
				<meta name="theme-color" content="#6d28d9" />
				<meta name="mobile-web-app-capable" content="yes" />
				<meta
					name="apple-mobile-web-app-status-bar-style"
					content="black-translucent"
				/>
				<meta name="apple-mobile-web-app-title" content="JobPing" />
				<link rel="apple-touch-icon" href="/og-image.png" />
				<script
					nonce={nonce}
					type="application/ld+json"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: Safe JSON-LD structured data
					dangerouslySetInnerHTML={{
						__html: JSON.stringify({
							"@context": "https://schema.org",
							"@type": "Organization",
							name: "JobPing",
							url: "https://getjobping.com",
							logo: "https://getjobping.com/og-image.png",
							sameAs: ["https://www.linkedin.com/company/jobping"],
						}),
					}}
				/>
			</head>
			<body
				className="text-foreground premium-bg custom-scrollbar relative"
				role="application"
				aria-label="JobPing - AI Job Matching Platform"
			>
				{/* Enhanced animated background */}
				<AnimatedBackground />
				<Analytics />

				<a
					href="#main-content"
					className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 z-50 bg-black/90 border border-white/20 rounded-md px-3 py-2 text-white text-sm font-medium backdrop-blur-sm shadow-lg hover:bg-black/95 transition-colors"
					aria-label="Skip navigation to main content"
				>
					Skip to content
				</a>
				<Header />
				<ErrorBoundary>{children}</ErrorBoundary>
				<Toaster />
				<Sonner />
				<KeyboardShortcuts />
				<CookieBanner />

				{/* PWA Service Worker Registration - Only on mobile for better performance */}
				<Script
					id="pwa-registration"
					nonce={nonce}
					strategy="afterInteractive"
					/* biome-ignore lint/security/noDangerouslySetInnerHtml: Safe PWA service worker script */
					dangerouslySetInnerHTML={{
						__html: `
              if ('serviceWorker' in navigator && window.innerWidth < 1024) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('[PWA] ServiceWorker registration successful');
                    })
                    .catch(function(error) {
                      console.log('[PWA] ServiceWorker registration failed:', error);
                    });
                });
              }
            `,
					}}
				/>
			</body>
		</html>
	);
}
