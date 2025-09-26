export default function HowItWorks() {
  return (
    <section className="mx-auto max-w-[72rem] px-6 md:px-8 py-24 md:py-28">
      <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight leading-[1.05] text-center">
        How it works
      </h2>
      <p className="mt-4 text-[15px] md:text-base leading-7 md:leading-8 text-zinc-300 max-w-[65ch] mx-auto text-center">
        Get personalized job matches delivered to your inbox in three simple steps.
      </p>
      
      <div className="grid md:grid-cols-3 gap-8 mt-16">
        {/* Step 1 */}
        <div className="text-center">
          <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-lg mx-auto mb-4">
            1
          </div>
          <h3 className="font-display text-xl font-semibold mb-2">Sign up</h3>
          <p className="text-zinc-300 text-sm">
            Create your account and get 5 instant job matches delivered immediately.
          </p>
        </div>
        
        {/* Step 2 */}
        <div className="text-center">
          <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-lg mx-auto mb-4">
            2
          </div>
          <h3 className="font-display text-xl font-semibold mb-2">Get matched</h3>
          <p className="text-zinc-300 text-sm">
            Our AI analyzes your preferences and finds relevant early-career roles.
          </p>
        </div>
        
        {/* Step 3 */}
        <div className="text-center">
          <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-lg mx-auto mb-4">
            3
          </div>
          <h3 className="font-display text-xl font-semibold mb-2">Stay updated</h3>
          <p className="text-zinc-300 text-sm">
            Receive weekly email updates with new job matches tailored to you.
          </p>
        </div>
      </div>
    </section>
  );
}
