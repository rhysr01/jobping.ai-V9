export default function BuiltForStudents() {
  const features = [
    { num: 1, title: "Profile based results", body: "Your city, work rights, and interests shape the list. No generic blasts." },
    { num: 2, title: "Europe wide sources", body: "Major boards plus direct company pages across the EU and the UK." },
    { num: 3, title: "Student first design", body: "Short and scannable emails on a predictable schedule." },
  ];

  return (
    <section className="section-pad">
      <div className="container-page">
        <h2 className="h2-section text-center">Built by students for students</h2>
        <p className="mt-3 text-center p-muted max-w-[65ch] mx-auto">
          We track boards and company pages across the EU and the UK, then match roles to your profile.
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
