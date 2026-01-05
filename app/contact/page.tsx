import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact | JobPing",
  description: "Get in touch with JobPing. We're here to help.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="container-page py-16 md:py-24">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-semibold text-white mb-6">
            Contact Us
          </h1>

          <div className="prose prose-invert max-w-none space-y-8 text-zinc-300">
            <p className="text-lg leading-relaxed">
              Have a question or feedback? We'd love to hear from you.
            </p>

            <div className="rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-xl shadow-pricing px-6 py-8 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">Email</h2>
                <a
                  href="mailto:hello@getjobping.com"
                  className="text-brand-200 hover:text-brand-100 transition-colors"
                >
                  hello@getjobping.com
                </a>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  Support
                </h2>
                <p className="text-zinc-300">
                  For account-related questions or technical issues, email us at{" "}
                  <a
                    href="mailto:hello@getjobping.com"
                    className="text-brand-200 hover:text-brand-100 transition-colors"
                  >
                    hello@getjobping.com
                  </a>
                  . We typically respond within 24 hours.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  Feedback
                </h2>
                <p className="text-zinc-300">
                  Found a role that doesn't fit? Reply to any email with
                  feedback and we'll retune your matches within 24 hours.
                </p>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-white/10">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 h-11 rounded-full bg-violet-500 px-6 text-sm font-medium text-white shadow-md shadow-purple-900/40 transition-all duration-200 hover:bg-violet-400 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
