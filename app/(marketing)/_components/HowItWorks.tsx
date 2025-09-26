export default function HowItWorks() {
  return (
    <section className="mx-auto max-w-[80rem] px-6 md:px-8 py-20 md:py-24">
      <h2 className="font-semibold text-3xl md:text-4xl tracking-tight leading-[1.05] text-center">How it works</h2>
      <div className="mt-8 grid md:grid-cols-3 gap-8 md:gap-12 text-center">
        {[
          ['Sign up','Create your account.'],
          ['Get matched','We find relevant roles.'],
          ['Stay updated','Weekly email delivery.'],
        ].map(([t,s],i)=>(
          <div key={t}>
            <div className="mx-auto h-8 w-8 rounded-full bg-brand-500/15 text-brand-300 grid place-items-center text-sm font-medium">{i+1}</div>
            <h3 className="mt-3 font-semibold">{t}</h3>
            <p className="mt-1 text-zinc-300">{s}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
