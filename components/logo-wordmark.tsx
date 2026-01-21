export default function LogoWordmark() {
	return (
		<header
			data-testid="logo"
			className="font-display inline-flex items-center gap-1 sm:gap-2 md:gap-3 font-semibold tracking-tight text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl px-1 pb-2 sm:pb-3 md:pb-4"
			style={{
				overflow: "visible",
				lineHeight: "1.2",
			}}
		>
			<span aria-hidden className="text-white/95 flex items-center shrink-0">
				{/* White graduation cap before the J */}
				<svg
					className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-[57px] lg:w-[57px] xl:h-[73px] xl:w-[73px] flex-shrink-0"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.6"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<path d="M12 3l10 5-10 5L2 8l10-5z" />
					<path d="M22 10v4" />
					<path d="M6 12v4c0 1.6 3 3.2 6 3.2s6-1.6 6-3.2v-4" />
				</svg>
			</span>
			<span
				className="bg-gradient-to-b from-white to-zinc-300 bg-clip-text text-transparent whitespace-nowrap"
				style={{
					display: "inline-block",
					paddingBottom: "8px",
					paddingRight: "4px",
				}}
			>
				JobPing
			</span>
		</header>
	);
}
