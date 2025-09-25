export default function NavbarMinimal() {
  return (
    <nav className="mx-auto max-w-[72rem] px-6 md:px-8 h-14 flex items-center justify-between">
      <div className="text-white font-semibold">JobPing</div>
      <a 
        href="#cta" 
        className="rounded-2xl px-4 py-2 bg-indigo-500 text-white font-semibold hover:-translate-y-0.5 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        Start Free
      </a>
    </nav>
  );
}
