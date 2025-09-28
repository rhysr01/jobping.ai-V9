export default function BuiltForStudents() {
  const features = [
    { num: 1, title: "Profile-based results", body: "Your city, work rights and interests drive the list. No generic spam." },
    { num: 2, title: "Europe-wide sources", body: "Major boards and direct company pages across the EU/UK. Comprehensive coverage." },
    { num: 3, title: "Student-first design", body: "Short, scannable emails on a predictable schedule. Respect for your time." },
  ];

  return (
    <section className="section-pad">
      <div className="container-page">
        <h2 className="h2-section text-center">By a student, for students</h2>
        <p className="mt-3 text-center p-muted max-w-[65ch] mx-auto">
          We track Europe's boards and company pages, then match roles to what you actually want.
        </p>

        <div className="mt-10 grid md:grid-cols-3 gap-8 md:gap-12">
          {features.map((feature) => (
            <div key={feature.num} className="glass-card rounded-2xl p-8 md:p-10 interactive-hover relative overflow-hidden">
              <div className="number-chip">{feature.num}</div>
              <h3 className="mt-4 font-semibold">{feature.title}</h3>
              <p className="mt-2 p-muted">{feature.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
