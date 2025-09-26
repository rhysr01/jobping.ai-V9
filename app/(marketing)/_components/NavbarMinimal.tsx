export default function NavbarMinimal() {
  return (
    <nav className="mx-auto max-w-[80rem] px-6 md:px-8 h-14 flex items-center justify-center">
      {/* Optional: simple anchors. Otherwise an empty bar to keep vertical rhythm */}
      {/* <div className="hidden md:flex items-center gap-6 text-sm text-zinc-300">
        <a href="#how" className="hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 rounded">How it works</a>
        <a href="#pricing" className="hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 rounded">Pricing</a>
      </div> */}
    </nav>
  );
}
