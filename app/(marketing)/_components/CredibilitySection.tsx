export default function CredibilitySection() {
  return (
    <section className="mx-auto max-w-[80rem] px-6 md:px-8 py-20 md:py-24">
      <div className="text-center">
        <h2 className="font-semibold text-3xl md:text-4xl tracking-tight leading-[1.05] mb-6">
          Built for students, by a student
        </h2>
        <p className="text-lg text-zinc-300 max-w-[70ch] mx-auto leading-7">
          We find the best early-career roles across Europe's job boards, then we use AI to match them to your personalised goals and location. Stop searching, start applying.
        </p>
        
        <div className="mt-12 grid md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="mx-auto h-12 w-12 rounded-full bg-brand-500/15 text-brand-300 grid place-items-center text-lg font-medium mb-4">
              1
            </div>
            <h3 className="font-semibold text-lg mb-2">AI-Powered Matching</h3>
            <p className="text-zinc-400 text-sm">
              Our algorithms understand your career goals and find roles that actually fit.
            </p>
          </div>
          
          <div>
            <div className="mx-auto h-12 w-12 rounded-full bg-brand-500/15 text-brand-300 grid place-items-center text-lg font-medium mb-4">
              2
            </div>
            <h3 className="font-semibold text-lg mb-2">Europe-Wide Coverage</h3>
            <p className="text-zinc-400 text-sm">
              We scan job boards across Europe to find opportunities you'd never discover.
            </p>
          </div>
          
          <div>
            <div className="mx-auto h-12 w-12 rounded-full bg-brand-500/15 text-brand-300 grid place-items-center text-lg font-medium mb-4">
              3
            </div>
            <h3 className="font-semibold text-lg mb-2">Student-First Design</h3>
            <p className="text-zinc-400 text-sm">
              Built by someone who understands the early-career job search struggle.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
