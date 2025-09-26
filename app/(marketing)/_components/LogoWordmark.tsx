export default function LogoWordmark() {
  return (
    <h1 className="inline-flex items-baseline gap-3 font-semibold tracking-tight leading-none text-7xl md:text-8xl">
      <span aria-hidden className="text-white/95">
        <svg
          className="h-[42px] w-[42px] md:h-[54px] md:w-[54px] -translate-y-1"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* mortarboard */}
          <path d="M12 3l10 5-10 5L2 8l10-5z" />
          <path d="M22 10v4" />
          <path d="M6 12v4c0 1.6 3 3.2 6 3.2s6-1.6 6-3.2v-4" />
        </svg>
      </span>
      <span className="bg-gradient-to-b from-white to-zinc-300 bg-clip-text text-transparent">JobPing</span>
    </h1>
  );
}
