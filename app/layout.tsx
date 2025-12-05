import "./globals.css";
import "@/lib/web-vitals";
import type { Metadata } from "next";
import Script from "next/script";
import StructuredData from "@/components/StructuredData";
import FAQSchema from "@/components/FAQSchema";
import ErrorBoundary from "@/components/ErrorBoundary";
import Toaster from "@/components/ui/Toaster";
import ScrollHeader from "@/components/ui/ScrollHeader";

export const metadata: Metadata = {
  title: "JobPing → EU early-career roles in your inbox. weekly.",
  description:
    "EU early-career roles delivered to your inbox weekly. We monitor 1,000+ companies across Europe and send you 5 hand-picked internships, graduate schemes, and entry-level roles—matched to your city, skills, and goals.",
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
    title: "JobPing → EU early-career roles in your inbox. weekly.",
    description:
      "EU early-career roles delivered to your inbox weekly. 5 hand-picked internships, graduate schemes, and entry-level roles matched to your profile.",
    url: "https://getjobping.com",
    siteName: "JobPing",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://getjobping.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "JobPing - AI-powered job matching for early-career jobs in Europe",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "JobPing → EU early-career roles in your inbox. weekly.",
    description:
      "EU early-career roles delivered weekly. 5 hand-picked matches per email.",
    creator: "@jobping",
    images: ["https://getjobping.com/og-image.png"],
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
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
      <body className="text-white premium-bg custom-scrollbar">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3
                     bg-black/80 border border-white/20 rounded-md px-3 py-2"
        >
          Skip to content
        </a>
        <ScrollHeader />
        <div
          className="container-page h-14 flex items-center justify-center"
          aria-hidden
        />
        <main id="main">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
        <Toaster />
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-G40ZHDYNL6"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-G40ZHDYNL6');
          `}
        </Script>
      </body>
    </html>
  );
}
