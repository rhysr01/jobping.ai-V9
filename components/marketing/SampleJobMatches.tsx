"use client";

export default function SampleJobMatches() {
  // Diverse sample jobs: 5 cities, 5 different career paths
  const sampleJobs = [
    {
      title: "Software Engineer",
      company: "Spotify",
      location: "Stockholm, Sweden",
      match: 92,
      isHot: true,
      description: "Join Spotify's engineering team building products used by millions. You'll work with modern technologies, learn from world-class engineers, and contribute to impactful projects.",
      tags: ["Tech", "Hybrid"],
      matchReason: "Perfect match for Tech roles in Stockholm",
    },
    {
      title: "Marketing Coordinator",
      company: "Booking.com",
      location: "Amsterdam, Netherlands",
      match: 88,
      isHot: false,
      description: "Booking.com's marketing team is looking for a Marketing Coordinator to support campaigns across Europe. Perfect for recent graduates interested in growth marketing.",
      tags: ["Marketing", "Hybrid"],
      matchReason: "Great match for Marketing roles in Amsterdam",
    },
    {
      title: "Data Analyst",
      company: "N26",
      location: "Berlin, Germany",
      match: 87,
      isHot: false,
      description: "N26's data team is looking for a Data Analyst to analyze user behavior and support product decisions. Entry-level friendly with mentorship.",
      tags: ["Data", "Hybrid"],
      matchReason: "Strong match for Data roles in Berlin",
    },
    {
      title: "Product Designer",
      company: "Zalando",
      location: "Dublin, Ireland",
      match: 89,
      isHot: false,
      description: "Zalando's design team seeks a Product Designer to work on e-commerce experiences. You'll collaborate with product managers and engineers on real features.",
      tags: ["Design", "Hybrid"],
      matchReason: "Excellent match for Design roles in Dublin",
    },
    {
      title: "Business Analyst",
      company: "Deloitte",
      location: "London, UK",
      match: 85,
      isHot: false,
      description: "Deloitte's consulting practice is looking for a Business Analyst to work on strategic projects. Perfect entry point into consulting with comprehensive training.",
      tags: ["Consulting", "Hybrid"],
      matchReason: "Good match for Consulting roles in London",
    },
  ];

  return (
    <div className="bg-black text-white h-full overflow-y-auto">
      {/* Email Header - Purple Gradient */}
      <div className="bg-gradient-to-br from-brand-600 via-brand-500 to-brand-700 px-6 py-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-50" />
        <div className="relative z-10">
          <div className="text-3xl font-bold text-white mb-2 tracking-tight">JobPing</div>
          <div className="text-xs text-white/90 font-medium tracking-widest uppercase">AI-Powered Job Matching</div>
        </div>
      </div>

      {/* Email Content */}
      <div className="px-6 py-6 space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Here's what you'll see in 2 minutes</h2>
        </div>

        {/* Job Cards - Show all 5 jobs like the real email */}
        {sampleJobs.map((job, i) => (
          <div
            key={i}
            className={`rounded-2xl p-5 border ${
              job.isHot
                ? 'bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border-purple-500/50 shadow-lg shadow-purple-500/20'
                : 'bg-zinc-900/50 border-zinc-800'
            }`}
          >
            {/* Match Badge - Simpler for Free */}
            <div className="inline-block px-3 py-1.5 rounded-lg text-xs font-bold mb-3 bg-gradient-to-r from-brand-500 to-brand-600 text-white">
              {job.match}% Match
            </div>

            {/* Job Title */}
            <h3 className="text-lg font-semibold text-white mb-1.5 leading-tight">
              {job.title}
            </h3>

            {/* Company */}
            <div className="text-base text-zinc-300 font-medium mb-1">
              {job.company}
            </div>

            {/* Location */}
            <div className="text-sm text-zinc-500 mb-3">
              📍 {job.location}
            </div>

            {/* Match Reason */}
            <p className="text-xs text-zinc-400 mb-3 italic">
              {job.matchReason}
            </p>

            {/* Description */}
            <p className="text-sm text-zinc-400 leading-relaxed mb-3">
              {job.description}
            </p>

            {/* Tags */}
            <div className="flex gap-2 flex-wrap">
              {job.tags.map((tag, j) => (
                <span
                  key={j}
                  className="text-xs text-zinc-400 bg-zinc-800/50 px-2.5 py-1 rounded-full border border-zinc-700/50"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}

      </div>
    </div>
  );
}
