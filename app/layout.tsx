import "./globals.css";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";

export const metadata: Metadata = {
  title: "JobPing · Five roles. Zero scrolling.",
  description:
    "Weekly job matches for early-career roles across Europe — delivered to your inbox. 5 hand-picked roles per email. No dashboards. No scrolling marathons.",
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
    title: "JobPing · Five roles. Zero scrolling.",
    description:
      "Weekly job matches for early-career roles across Europe — delivered to your inbox. Hand-picked quality, zero noise.",
    url: "https://getjobping.com",
    siteName: "JobPing",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "JobPing · Five roles. Zero scrolling.",
    description: "Weekly job matches for early-career roles across Europe.",
    creator: "@jobping",
  },
  metadataBase: new URL("https://getjobping.com"),
  alternates: {
    canonical: "https://getjobping.com",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body className="text-white premium-bg custom-scrollbar">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3
                     bg-black/80 border border-white/20 rounded-md px-3 py-2"
        >
          Skip to content
        </a>
        <div className="container-page h-14 flex items-center justify-center" aria-hidden />
        <main id="main">{children}</main>
      </body>
    </html>
  );
}