export default function BuiltForStudents() {
  const items = [
    {
      num: 1,
      title: "AI-Powered Matching",
      body: "Our algorithms understand your career goals and find roles that actually fit."
    },
    {
      num: 2,
      title: "Europe-Wide Coverage",
      body: "We scan job boards across Europe to find opportunities you'd never discover."
    },
    {
      num: 3,
      title: "Student-First Design",
      body: "Built to conquer the early-career job search struggle."
    }
  ];

  return (
    <section
      id="built"
      className="mx-auto max-w-[80rem] px-6 md:px-8 py-20 md:py-24"
    >
      <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center">
        Built for students, by a student
      </h2>

      <p className="mt-3 text-center text-zinc-300 max-w-[75ch] mx-auto">
        We find the best early-career roles across Europe's job boards, then use AI to match them to your goals.
      </p>

      <div className="mt-10 grid md:grid-cols-3 gap-8 md:gap-12">
        {items.map((x) => (
          <div
            key={x.num}
            className="rounded-2xl border border-white/10 bg-zinc-900/30 p-6"
          >
            <div className="h-10 w-10 rounded-full border border-brand-500/45 bg-brand-500/15 text-brand-100 grid place-items-center text-sm font-medium shadow-[0_0_40px_rgba(99,102,241,0.20)]">
              {x.num}
            </div>
            <h3 className="mt-4 font-semibold">{x.title}</h3>
            <p className="mt-2 text-zinc-300">{x.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
