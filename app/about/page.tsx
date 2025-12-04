import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About | JobPing',
  description: 'Learn about JobPing - helping early-career jobseekers find EU graduate roles and internships.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="container-page py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-semibold text-white mb-6">About JobPing</h1>
          
          <div className="prose prose-invert max-w-none space-y-6 text-zinc-300">
            <p className="text-lg leading-relaxed">
              JobPing helps early-career jobseekers find EU graduate roles and internships without the endless scrolling.
            </p>
            
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Our Mission</h2>
            <p>
              We filter the entire EU job market and send you only the roles worth applying for—matched to your city, visa status, and experience level.
            </p>
            
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">How It Works</h2>
            <p>
              Tell us your preferences once. We search European job boards and company pages daily, then send you curated matches directly to your inbox. No dashboards, no spam—just roles that fit.
            </p>
            
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">For Early-Career Jobseekers</h2>
            <p>
              We focus exclusively on internships, graduate programmes, and entry-level roles. Every email includes salary hints, visa notes, and why the role fits you—everything you need to decide in seconds.
            </p>
            
            <div className="mt-12 pt-8 border-t border-white/10">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 h-11 rounded-full bg-violet-500 px-6 text-sm font-medium text-white shadow-md shadow-purple-900/40 transition-all duration-200 hover:bg-violet-400 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                Get my first 5 matches
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

