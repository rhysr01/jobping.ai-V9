import './globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-inter',
  preload: true
});

export const metadata: Metadata = {
  metadataBase: new URL('https://jobping.ai'),
  alternates: {
    canonical: '/',
  },
  title: 'JobPing - AI-powered job matching for students',
        description: 'AI-curated job opportunities delivered every 48 hours to ambitious students and graduates. Stop scrolling job boards, start landing interviews.',
  keywords: ['jobs', 'students', 'graduates', 'AI', 'career', 'recruitment', 'internships', 'job matching'],
  authors: [{ name: 'JobPing Team' }],
  creator: 'JobPing',
  publisher: 'JobPing',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: 'JobPing - AI-powered job matching for students',
    description: 'AI-curated job opportunities delivered every 48 hours to ambitious students and graduates. Stop scrolling job boards, start landing interviews.',
    url: 'https://www.jobping.ai',
    siteName: 'JobPing',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'JobPing - Smart Job Discovery Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JobPing - AI-powered job matching for students',
    description: 'AI-curated job opportunities delivered every 48 hours to ambitious students and graduates.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="theme-color" content="#000000" />
        <meta name="color-scheme" content="dark" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "JobPing",
              "description": "AI-powered job matching for students and graduates",
              "url": "https://jobping.ai",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "EUR"
              }
            })
          }}
        />
      </head>
      <body className="bg-black text-white overflow-x-hidden font-inter selection:bg-white selection:text-black">
        {children}
      </body>
    </html>
  );
}