"use client";

interface HeroBackgroundAuraProps {
	offset?: number;
	enableMotion?: boolean;
}

export default function HeroBackgroundAura({
	offset: _offset = 0,
	enableMotion: _enableMotion = true,
}: HeroBackgroundAuraProps) {
	// Static aura - no animations, no mouse tracking
	return (
		<div
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
		>
			{/* Single static radial gradient aura - provides premium dark feel */}
			<div
				className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(139,92,246,0.2),transparent_50%)] opacity-20"
				style={{
					willChange: "auto",
				}}
			/>

			{/* Optional: Very subtle mesh grid (keep if very faint) */}
			<div
				className="absolute inset-0 opacity-[0.02]"
				style={{
					backgroundImage: `
            linear-gradient(rgba(255,255,255,0.25) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.25) 1px, transparent 1px)
          `,
					backgroundSize: "60px 60px",
					willChange: "auto",
				}}
				aria-hidden="true"
			/>
		</div>
	);
}
