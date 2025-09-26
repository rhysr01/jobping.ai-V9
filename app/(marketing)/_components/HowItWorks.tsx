export default function HowItWorks() {
  const items = [
    { t: "Sign up", s: "Create your account." },
    { t: "Get matched", s: "We find relevant roles." },
    { t: "Stay updated", s: "Weekly email delivery." },
  ];
  return (
    <section id="how" className="mx-auto max-w-[80rem] px-6 md:px-8 py-20 md:py-24">
      <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center">How it works</h2>
      <div className="mt-10 grid md:grid-cols-3 gap-10 text-center">
        {items.map((x, i) => (
          <div key={x.t}>
            <div className="mx-auto h-10 w-10 rounded-full border border-brand-500/40 bg-brand-500/12 text-brand-200 grid place-items-center text-sm font-medium">
              {i + 1}
            </div>
            <h3 className="mt-3 font-semibold">{x.t}</h3>
            <p className="mt-1 text-zinc-300">{x.s}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
