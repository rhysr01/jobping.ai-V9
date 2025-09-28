import "./globals.css";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";

export const metadata: Metadata = {
  title: "JobPing · Five roles. Zero scrolling.",
  description:
    "Europe's best intern and graduate roles filtered for you. {'{matches_per_email}'} accurate matches based on city, work rights and interests. No job board dumps.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "JobPing · Five roles. Zero scrolling.",
    description:
      "Weekly early career matches across Europe straight to your inbox.",
    type: "website",
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