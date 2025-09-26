export default function NavbarMinimal() {
  return (
    <nav className="mx-auto max-w-[72rem] px-6 md:px-8 h-14 flex items-center justify-end">
      <a
        href="https://tally.so/r/wLqWxQ?utm_source=landing&utm_medium=nav&utm_campaign=start"
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-2xl px-4 py-2 bg-brand-500 text-white font-semibold hover:bg-brand-500/90
                   focus:outline-none focus:ring-2 focus:ring-brand-500
                   transition will-change-transform hover:-translate-y-0.5"
      >
        Start Free
      </a>
    </nav>
  );
}
