import "./globals.css";
import "@/lib/web-vitals";
import type { Metadata } from "next";

// TODO: Add Axiom Web Vitals export once URL is properly configured
// export { reportWebVitals } from 'next-axiom';
import { headers } from "next/headers";
import Script from "next/script";
import ErrorBoundary from "@/components/ErrorBoundary";
import FAQSchema from "@/components/FAQSchema";
import StructuredData from "@/components/StructuredData";
import Header from "@/components/sections/Header";
import AnimatedBackground from "@/components/ui/AnimatedBackground";
import CookieBanner from "@/components/ui/CookieBanner";
import Toaster from "@/components/ui/Toaster";

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
		<html lang="en" className="scroll-smooth">
			<head>
				{/* Font preconnect for faster font loading */}
				<link
					rel="preconnect"
					href="https://api.fontshare.com"
					crossOrigin="anonymous"
				/>
				<link
					href="https://api.fontshare.com/v2/css?f[]=satoshi@1,900,700,500,400&display=swap"
					rel="stylesheet"
				/>
				<link
					rel="preload"
					href="https://api.fontshare.com/v2/css?f[]=satoshi@1,900,700,500,400&display=swap"
					as="style"
				/>
				{/* biome-ignore lint/security/noDangerouslySetInnerHtml: Internal font-face declaration */}
				<style
					dangerouslySetInnerHTML={{
						__html: `
              @font-face {
                font-family: 'Satoshi';
                font-display: swap;
              }
            `,
					}}
				/>
				<StructuredData />
				<FAQSchema />
				{/* biome-ignore lint/security/noDangerouslySetInnerHtml: Schema.org structured data */}
				<script
					type="application/ld+json"
					// Organization schema to complement SoftwareApplication
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
			<body className="text-white premium-bg custom-scrollbar relative">
				{/* Enhanced animated background */}
				<AnimatedBackground />
				
				<a
					href="#main-content"
					className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3
                     bg-black/80 border border-white/20 rounded-md px-3 py-2"
				>
					Skip to content
				</a>
				<Header />
				<ErrorBoundary>{children}</ErrorBoundary>
				<Toaster />
				<CookieBanner />
				{/* Google Analytics - inline script will work with CSP nonce via Next.js */}
				<Script
					src="https://www.googletagmanager.com/gtag/js?id=G-G40ZHDYNL6"
					strategy="afterInteractive"
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
					/* biome-ignore lint/security/noDangerouslySetInnerHtml: Internal tracking script */
					<Script
						id="posthog"
						strategy="afterInteractive"
						nonce={nonce}
						dangerouslySetInnerHTML={{
							__html: `
                !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
                var consent = typeof localStorage !== 'undefined' ? localStorage.getItem('cookie-consent') : null;
                posthog.init('${process.env.NEXT_PUBLIC_POSTHOG_KEY}',{
                  api_host:'https://app.posthog.com',
                  autocapture:false,
                  disable_session_recording:consent !== 'accepted',
                  ip:false,
                  loaded:function(posthog){
                    if(consent !== 'accepted'){posthog.opt_out_capturing();}
                  }
                });
              `,
						}}
					/>
				)}
			</body>
		</html>
	);
}
