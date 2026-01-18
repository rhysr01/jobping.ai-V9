import "./globals.css";
import "../lib/web-vitals";
import type { Metadata } from "next";

// TODO: Add Axiom Web Vitals export once URL is properly configured
// export { reportWebVitals } from 'next-axiom';
import { headers } from "next/headers";
import Script from "next/script";
import { KeyboardShortcuts } from "@/components/ui/keyboard-shortcuts";
import { Toaster as Sonner, Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ui/theme-provider";
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
	// Get nonce from headers (set by middleware)
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
				<ThemeProvider
					attribute="class"
					defaultTheme="dark"
					enableSystem
					disableTransitionOnChange
				>
					{/* Enhanced animated background */}
					<AnimatedBackground />

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
					{/* Google Analytics - deferred for better performance */}
					<Script
						src="https://www.googletagmanager.com/gtag/js?id=G-G40ZHDYNL6"
						strategy="lazyOnload"
					/>
					<Script id="google-analytics" strategy="afterInteractive">
						{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            
            // GDPR: Disable analytics by default until consent
            const consent = typeof localStorage !== 'undefined' ? localStorage.getItem('cookie-consent') : null;
            gtag('consent', 'default', {
              analytics_storage: consent === 'accepted' ? 'granted' : 'denied',
              ad_storage: 'denied',
            });
            
            gtag('config', 'G-G40ZHDYNL6', {
              anonymize_ip: true, // Anonymize IP addresses for GDPR
            });
          `}
					</Script>
					{/* PostHog Analytics - Session Replay & Feature Flags */}
					{process.env.NEXT_PUBLIC_POSTHOG_KEY && (
						<Script
							id="posthog"
							strategy="lazyOnload"
							nonce={nonce}
							dangerouslySetInnerHTML={{
								__html: `
                !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
                var consent = typeof localStorage !== 'undefined' ? localStorage.getItem('cookie-consent') : null;
                var isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
                posthog.init('${process.env.NEXT_PUBLIC_POSTHOG_KEY}',{
                  api_host:'https://app.posthog.com',
                  autocapture:false,
                  disable_session_recording:consent !== 'accepted' || isMobile,
                  ip:false,
                  loaded:function(posthog){
                    if(consent !== 'accepted'){posthog.opt_out_capturing();}
                  }
                });
              `,
							}}
						/>
					)}

					{/* PWA Service Worker Registration - Only on mobile for better performance */}
					<Script
						id="pwa-registration"
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
				</ThemeProvider>
			</body>
		</html>
	);
}
