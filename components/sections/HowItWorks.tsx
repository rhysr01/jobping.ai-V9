export default function HowItWorks() {
  const items = [
    {
      num: 1,
      title: "Set your profile",
      body: "City, work rights, languages, interests.",
    },
    {
      num: 2,
      title: "We cut the noise",
      body: "New listings are screened and de-duped.",
    },
    {
      num: 3,
      title: "You get five",
      body: "A one-minute email with only the best fits.",
    },
  ];

  return (
    <section className="section-pad">
      <div className="container-page">
        <h2 className="h2-section text-center">How it works</h2>

        <div className="mt-10 grid gap-8 md:gap-12 md:grid-cols-3 text-center">
          {items.map((x) => (
            <div key={x.num}>
              <div className="mx-auto h-10 w-10 rounded-full border border-brand-500/45
                              bg-brand-500/15 text-brand-300 grid place-items-center
                              text-sm font-medium">
                {x.num}
              </div>
              <h3 className="mt-3 font-semibold">{x.title}</h3>
              <p className="mt-1 p-muted">{x.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
