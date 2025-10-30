import "./globals.css";
import type { Metadata } from "next";
import StructuredData from "@/components/StructuredData";
import FAQSchema from "@/components/FAQSchema";
import ErrorBoundary from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "JobPing → Five roles. Zero scrolling.",
  description:
    "Weekly job matches for early-career roles across Europe  delivered to your inbox. 5 hand-picked roles per email. No dashboards. No scrolling marathons.",
  keywords: [
    "graduate jobs",
    "internships Europe",
    "entry level jobs",
    "junior roles",
    "graduate scheme",
    "trainee program",
    "job matching",
    "career search",
    "London jobs",
    "Berlin jobs",
    "Paris jobs",
    "Madrid jobs"
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
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    }
  },
  openGraph: {
    title: "JobPing → Five roles. Zero scrolling.",
    description:
      "Weekly job matches for early-career roles across Europe  delivered to your inbox. Hand-picked quality, zero noise.",
    url: "https://getjobping.com",
    siteName: "JobPing",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "JobPing → Five roles. Zero scrolling.",
    description: "Weekly job matches for early-career roles across Europe.",
    creator: "@jobping",
  },
  metadataBase: new URL("https://getjobping.com"),
  alternates: {
    canonical: "https://getjobping.com",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Font preconnect for faster font loading */}
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
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
              "name": "JobPing",
              "url": "https://getjobping.com",
              "logo": "https://getjobping.com/og-image.png",
              "sameAs": [
                "https://www.linkedin.com/company/jobping"
              ]
            })
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
        <div className="container-page h-14 flex items-center justify-center" aria-hidden />
        <main id="main">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </body>
    </html>
  );
}