"use client";

export default function SampleJobMatches() {
  // Sample jobs matching a specific user profile: Finance roles in London
  const sampleJobs = [
    {
      title: "Graduate Analyst",
      company: "Goldman Sachs",
      location: "London, UK",
      match: 92,
      isHot: true,
      description: "Join Goldman Sachs' Investment Banking division as a Graduate Analyst. You'll work on M&A transactions, IPOs, and strategic advisory projects for leading clients.",
      tags: ["Finance", "Hybrid"],
      matchReason: "Based on your preference for Finance roles in London",
    },
    {
      title: "Junior Financial Analyst",
      company: "JPMorgan Chase",
      location: "London, UK",
      match: 88,
      isHot: false,
      description: "JPMorgan's Corporate Finance team is looking for a Junior Financial Analyst to support financial modeling, analysis, and strategic planning.",
      tags: ["Finance", "Hybrid"],
      matchReason: "Perfect for your Finance career path in London",
    },
    {
      title: "Finance Intern",
      company: "Morgan Stanley",
      location: "London, UK",
      match: 85,
      isHot: false,
      description: "Morgan Stanley's Finance division offers a 6-month internship for students interested in investment banking. Potential for full-time conversion.",
      tags: ["Finance", "Internship"],
      matchReason: "Great match for Finance development in London",
    },
    {
      title: "Investment Banking Analyst",
      company: "Barclays",
      location: "London, UK",
      match: 87,
      isHot: false,
      description: "Barclays Investment Bank seeks an Analyst to join their M&A team. You'll work on strategic transactions and conduct financial analysis.",
      tags: ["Finance", "Hybrid"],
      matchReason: "Strong alignment with your Finance goals in London",
    },
    {
      title: "Graduate Trainee - Finance",
      company: "Deutsche Bank",
      location: "London, UK",
      match: 89,
      isHot: false,
      description: "Deutsche Bank's Graduate Programme offers a structured 2-year rotation across Finance, Risk, and Treasury functions.",
      tags: ["Finance", "Hybrid"],
      matchReason: "Excellent match for Finance roles in London",
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
