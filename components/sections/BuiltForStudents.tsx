export default function BuiltForStudents() {
  const features = [
    {
      title: "Profile-based results",
      body: "Your city, work rights and interests drive the list.",
    },
    {
      title: "Europe-wide sources",
      body: "Major boards and direct company pages across the EU/UK.",
    },
    {
      title: "Built for students",
      body: "Short, scannable emails on a predictable schedule.",
    },
  ];

  return (
    <section className="section-pad">
      <div className="container-page">
        <h2 className="h2-section text-center">Built for students, by a student</h2>
        <p className="mt-3 text-center p-muted max-w-[75ch] mx-auto">
          We track Europe's boards and company pages, then match roles to what you want.
        </p>

        <div className="mt-10 grid gap-8 md:gap-12 md:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-white/10 bg-zinc-900/30 p-6"
            >
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 p-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
