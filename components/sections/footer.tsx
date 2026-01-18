"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import LogoWordmark from "../logo-wordmark";

export default function Footer() {
	const links = [
		{ label: "About", href: "/about" },
		{ label: "Pricing", href: "/pricing" },
		{ label: "Privacy Policy", href: "/legal/privacy" },
		{ label: "Terms", href: "/legal/terms" },
		{ label: "Contact", href: "/contact" },
	];

	return (
		<footer className="relative mt-40 section-padding pb-[max(2rem,env(safe-area-inset-bottom))] border-t border-white/5 bg-black/40 backdrop-blur-sm">
			{/* Enhanced gradient fade at top */}
			<div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

			{/* Subtle background glow */}
			<div className="absolute inset-0 bg-gradient-to-t from-emerald-500/5 via-transparent to-transparent pointer-events-none" />

			<div className="container-page relative">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.6 }}
					className="grid grid-cols-1 md:grid-cols-2 gap-8"
				>
					{/* Left: Logo + Tagline */}
					<div className="flex flex-col gap-6">
						{/* Logo with icon */}
						<div className="flex items-center gap-3">
							<div className="scale-75 origin-left">
								<LogoWordmark />
							</div>
						</div>
						<p className="text-sm text-zinc-400 max-w-md leading-relaxed">
							AI-powered job matching for early-career roles across Europe. Get
							personalized matches delivered to your inbox.
						</p>
					</div>

					{/* Right: System Status + Links */}
					<div className="flex flex-col items-start md:items-end gap-6">
						{/* Enhanced Status Link */}
						<Link
							href="https://status.getjobping.com"
							target="_blank"
							rel="noopener noreferrer"
							className="group inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.03] backdrop-blur-sm border border-white/10 hover:bg-white/[0.05] hover:border-emerald-500/30 transition-all"
						>
							<span className="relative flex h-2 w-2">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
								<span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
							</span>
							<span className="text-xs font-medium text-zinc-300 group-hover:text-emerald-400 transition-colors">
								All Systems Operational
							</span>
							<svg
								className="w-3 h-3 text-zinc-400 group-hover:text-emerald-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								aria-hidden="false"
								role="img"
							>
								<title>External link arrow</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 5l7 7-7 7"
								/>
							</svg>
						</Link>

						{/* Enhanced Navigation Links */}
						<nav className="flex flex-wrap items-center gap-4 md:justify-end">
							{links.map((link) => (
								<Link
									key={link.href}
									href={link.href}
									className="group relative text-xs text-zinc-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-white/5"
								>
									<span>{link.label}</span>
									<svg
										className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										aria-hidden="false"
										role="img"
									>
										<title>Navigate to section</title>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M9 5l7 7-7 7"
										/>
									</svg>
								</Link>
							))}
							<a
								href="mailto:support@jobping.com"
								className="group relative text-xs text-zinc-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/5"
							>
								<span>Support</span>
								<svg
									className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									aria-hidden="false"
									role="img"
								>
									<title>Contact support via email</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
									/>
								</svg>
							</a>
						</nav>
					</div>
				</motion.div>

				{/* Enhanced Copyright Section */}
				<motion.div
					initial={{ opacity: 0 }}
					whileInView={{ opacity: 1 }}
					viewport={{ once: true }}
					transition={{ duration: 0.6, delay: 0.2 }}
					className="mt-10 pt-8 border-t border-white/5"
				>
					<div className="flex flex-col md:flex-row items-center justify-between gap-6">
						<p className="text-xs text-zinc-500">
							© {new Date().getFullYear()} JobPing. All rights reserved.
						</p>
						<div className="flex items-center gap-4">
							<a
								href="https://www.linkedin.com/company/jobping"
								target="_blank"
								rel="noopener noreferrer"
								className="text-zinc-500 hover:text-emerald-400 transition-colors"
							>
								<svg
									className="w-4 h-4"
									fill="currentColor"
									viewBox="0 0 24 24"
									aria-hidden="false"
									role="img"
								>
									<title>Visit JobPing on LinkedIn</title>
									<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
								</svg>
							</a>
						</div>
					</div>
				</motion.div>
			</div>
		</footer>
	);
}
