"use client";

export default function SampleJobMatches() {
  const sampleJobs = [
    {
      title: "Graduate Software Engineer",
      company: "Spotify",
      location: "Stockholm, Sweden",
      match: 92,
      tags: ["Tech", "Remote-friendly"],
    },
    {
      title: "Junior Marketing Associate",
      company: "Shopify",
      location: "Dublin, Ireland",
      match: 88,
      tags: ["Marketing", "English"],
    },
    {
      title: "Data Analyst Intern",
      company: "Stripe",
      location: "London, UK",
      match: 85,
      tags: ["Data", "Internship"],
    },
  ];

  return (
    <div className="bg-black text-white p-4 space-y-3 h-full">
      {/* Header */}
      <div className="mb-4 pb-3 border-b border-zinc-800">
        <h2 className="text-lg font-bold text-white mb-1">Your Matches</h2>
        <p className="text-xs text-zinc-400">5 new matches today</p>
      </div>

      {/* Job Cards */}
      {sampleJobs.map((job, i) => (
        <div
          key={i}
          className="bg-zinc-900 rounded-lg p-3 border border-zinc-800 hover:border-brand-500/30 transition-colors"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 pr-2">
              <h3 className="text-sm font-semibold text-white mb-1 leading-tight">
                {job.title}
              </h3>
              <p className="text-xs text-zinc-400">
                {job.company} · {job.location}
              </p>
            </div>
            <div className="bg-brand-500/20 text-brand-300 text-xs font-bold px-2 py-1 rounded flex-shrink-0">
              {job.match}%
            </div>
          </div>
          <div className="flex gap-1 flex-wrap mt-2">
            {job.tags.map((tag, j) => (
              <span
                key={j}
                className="text-xs text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      ))}

      {/* Footer hint */}
      <div className="pt-2 text-center">
        <p className="text-xs text-zinc-500">Scroll for more matches</p>
      </div>
    </div>
  );
}

// Build fix
