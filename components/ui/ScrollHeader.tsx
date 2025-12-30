"use client";

import { useEffect, useState } from "react";

export default function ScrollHeader() {
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		const handleScroll = () => {
			setScrolled(window.scrollY > 200);
		};

		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	if (!scrolled) return null;

	return (
		<div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
			<div className="container-page h-14 flex items-center justify-between">
				<div className="inline-flex items-center gap-2">
					<svg
						className="h-6 w-6 text-white"
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
					<div className="flex flex-col">
						<span className="text-2xl font-semibold text-white">JobPing</span>
						<span className="text-[10px] tracking-[0.2em] uppercase text-zinc-500">
							Future-first job discovery
						</span>
					</div>
				</div>
				<span className="text-sm text-zinc-300 leading-none hidden sm:block">
					Early-career roles delivered weekly
				</span>
			</div>
		</div>
	);
}
