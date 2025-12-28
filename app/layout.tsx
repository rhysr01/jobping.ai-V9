import "./globals.css";
import "@/lib/web-vitals";
import type { Metadata } from "next";
import Script from "next/script";
import { headers } from "next/headers";
import StructuredData from "@/components/StructuredData";
import FAQSchema from "@/components/FAQSchema";
import ErrorBoundary from "@/components/ErrorBoundary";
import Toaster from "@/components/ui/Toaster";
import Header from "@/components/sections/Header";
import CookieBanner from "@/components/ui/CookieBanner";

export const metadata: Metadata = {
  title: "JobPing → EU early-career roles. Free: instant matches. Premium: 3x per week.",
  description:
    "EU early-career roles. Free: Get 5 instant matches. Premium: 15 jobs per week via email (3x per week: Mon/Wed/Fri). We monitor 1,000+ companies across Europe and send you hand-picked internships, graduate schemes, and entry-level roles - matched to your city, skills, and goals.",
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
    title: "JobPing → EU early-career roles. Free: instant matches. Premium: 3x per week.",
    description:
      "EU early-career roles. Free: Get 5 instant matches. Premium: 15 jobs per week via email (3x per week: Mon/Wed/Fri). Hand-picked internships, graduate schemes, and entry-level roles matched to your profile.",
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
    title: "JobPing → EU early-career roles. Free: instant matches. Premium: 3x per week.",
    description:
      "EU early-career roles. Free: Get 5 instant matches. Premium: 15 jobs per week via email (3x per week: Mon/Wed/Fri).",
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get nonce from headers (set by middleware)
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') || '';

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
        <StructuredData nonce={nonce} />
        <FAQSchema nonce={nonce} />
        <script
          type="application/ld+json"
          nonce={nonce}
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
        {/* Cursor follower radial gradient - desktop only */}
        <div 
          id="cursor-follower"
          className="fixed pointer-events-none z-0 w-[600px] h-[600px] rounded-full opacity-0 transition-opacity duration-300 hidden md:block"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.03), transparent 70%)',
            transform: 'translate(-50%, -50%)',
            willChange: 'transform',
          }}
        />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3
                     bg-black/80 border border-white/20 rounded-md px-3 py-2"
        >
          Skip to content
        </a>
        <Header />
        {/* Spacer for fixed header */}
        <div className="h-20 md:h-24" aria-hidden />
        <ErrorBoundary>{children}</ErrorBoundary>
        <Toaster />
        <CookieBanner />
        {/* Cursor follower script - desktop only */}
        <Script id="cursor-follower" strategy="afterInteractive">
          {`
            if (window.matchMedia('(min-width: 768px)').matches) {
              const follower = document.getElementById('cursor-follower');
              if (follower) {
                let mouseX = 0, mouseY = 0;
                let followerX = 0, followerY = 0;
                
                document.addEventListener('mousemove', (e) => {
                  mouseX = e.clientX;
                  mouseY = e.clientY;
                  follower.style.opacity = '1';
                });
                
                function animate() {
                  followerX += (mouseX - followerX) * 0.1;
                  followerY += (mouseY - followerY) * 0.1;
                  follower.style.left = followerX + 'px';
                  follower.style.top = followerY + 'px';
                  requestAnimationFrame(animate);
                }
                animate();
                
                document.addEventListener('mouseleave', () => {
                  follower.style.opacity = '0';
                });
              }
            }
          `}
        </Script>
        {/* Google Analytics - inline script will work with CSP nonce via Next.js */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-G40ZHDYNL6"
          strategy="afterInteractive"
        />
        <Script 
          id="google-analytics" 
          strategy="afterInteractive"
        >
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
