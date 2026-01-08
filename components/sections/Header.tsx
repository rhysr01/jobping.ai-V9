"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import LogoWordmark from "@/components/LogoWordmark";
import { BrandIcons } from "@/components/ui/BrandIcons";
import Button from "@/components/ui/Button";
import { trackEvent } from "@/lib/analytics";
import { CTA_GET_MY_5_FREE_MATCHES } from "@/lib/copy";

export default function Header() {
	const [scrolled, setScrolled] = useState(false);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [activeSection, setActiveSection] = useState<string>("");
	const pathname = usePathname();

	useEffect(() => {
		const handleScroll = () => {
			setScrolled(window.scrollY > 20);

			// Detect active section based on scroll position
			const howItWorks = document.getElementById("how-it-works");
			const pricing = document.getElementById("pricing");
			const scrollY = window.scrollY + 100; // Offset for header height

			if (pricing && scrollY >= pricing.offsetTop) {
				setActiveSection("#pricing");
			} else if (howItWorks && scrollY >= howItWorks.offsetTop) {
				setActiveSection("#how-it-works");
			} else {
				setActiveSection("");
			}
		};

		window.addEventListener("scroll", handleScroll);
		handleScroll(); // Initial check
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	// Close mobile menu when route changes
	useEffect(() => {
		setMobileMenuOpen(false);
	}, []);

	// Prevent body scroll when mobile menu is open
	useEffect(() => {
		if (mobileMenuOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [mobileMenuOpen]);

	const navLinks = [
		{ label: "How It Works", href: "#how-it-works", scroll: true },
		{ label: "Pricing", href: "#pricing", scroll: true },
	];

	const handleNavClick = (
		e: React.MouseEvent<HTMLAnchorElement>,
		href: string,
		scroll: boolean,
	) => {
		if (scroll && href.startsWith("#")) {
			e.preventDefault();
			const element = document.querySelector(href);
			if (element) {
				element.scrollIntoView({ behavior: "smooth", block: "start" });
				trackEvent("nav_clicked", { link: href });
			}
		}
		setMobileMenuOpen(false);
	};

	return (
		<>
			<header
				className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
					scrolled
						? "bg-black/70 backdrop-blur-xl border-b border-white/10 shadow-lg"
						: "bg-black/50 backdrop-blur-xl border-b border-white/5"
				}`}
				style={{ overflow: "visible" }}
			>
				{/* Glassmorphic background with gradient glow */}
				<div className="absolute inset-0">
					{/* Top gradient glow */}
					<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
				</div>
				
				<div className="container-page relative" style={{ overflow: "visible" }}>
					<div className="h-24 md:h-28 flex items-center justify-between py-2 overflow-visible" style={{ overflow: "visible" }}>
						{/* Logo with graduation cap */}
						<Link
							href="/"
							onClick={() => {
								if (pathname === "/") {
									window.scrollTo({ top: 0, behavior: "smooth" });
								}
								trackEvent("logo_clicked", { location: "header" });
							}}
							className="flex items-center gap-2 group py-1 overflow-visible"
							aria-label="JobPing Home"
							style={{ overflow: "visible", paddingRight: "0.5rem" }}
						>
							<div className="scale-90 md:scale-100 origin-left overflow-visible pr-2 md:pr-3" style={{ overflow: "visible", minWidth: "fit-content" }}>
								<LogoWordmark />
							</div>
						</Link>

						{/* Desktop Navigation */}
						<nav className="hidden md:flex items-center gap-6 lg:gap-8">
							{/* Navigation Links with animated underlines */}
							{navLinks.map((link) => (
								<Link
									key={link.href}
									href={link.href}
									onClick={(e) => handleNavClick(e, link.href, link.scroll)}
									className={`relative text-sm font-medium transition-colors group py-2 whitespace-nowrap ${
										activeSection === link.href
											? "text-white"
											: "text-zinc-300 hover:text-white"
									}`}
									style={{ 
										overflow: "visible", 
										textOverflow: "clip", 
										maxWidth: "none",
										whiteSpace: "nowrap",
										wordBreak: "keep-all"
									}}
								>
									<span className="relative z-10">{link.label}</span>
									
									{/* Animated underline */}
									{activeSection === link.href ? (
										<motion.div
											layoutId="activeNav"
											className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
											initial={false}
											transition={{
												type: "spring",
												stiffness: 380,
												damping: 30,
											}}
										/>
									) : (
										<span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-500 group-hover:w-full transition-all duration-300 ease-out" />
									)}
									
									{/* Subtle glow on hover */}
									<span className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/5 rounded-lg blur-sm transition-all" />
								</Link>
							))}

							{/* Trust badge - desktop only */}
							<div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] backdrop-blur-sm border border-white/10 hover:bg-white/[0.05] hover:border-emerald-500/30 transition-all">
								{/* Pulsing dot */}
								<div className="relative flex h-2 w-2">
									<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
									<span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
								</div>
								<span className="text-xs font-medium text-zinc-300">
									1,000+ students
								</span>
							</div>

							{/* Enhanced CTA Button with shine effect */}
							<Link
								href="/signup/free"
								onClick={() => {
									trackEvent("cta_clicked", {
										type: "free",
										location: "header",
									});
								}}
								className="group relative px-6 py-3 rounded-xl font-semibold text-white overflow-hidden"
							>
								{/* Gradient background */}
								<div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 group-hover:from-emerald-600 group-hover:to-emerald-700 transition-all duration-300" />
								
								{/* Shine effect on hover */}
								<div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
									<div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000" />
								</div>
								
								{/* Shadow that grows on hover */}
								<div className="absolute inset-0 shadow-lg shadow-emerald-500/30 group-hover:shadow-xl group-hover:shadow-emerald-500/40 rounded-xl transition-all" />
								
								{/* Text */}
								<span className="relative z-10 group-hover:-translate-y-0.5 inline-flex items-center gap-2 transition-transform">
									{CTA_GET_MY_5_FREE_MATCHES}
									<BrandIcons.ArrowRight className="h-4 w-4" />
								</span>
								
								{/* Border glow */}
								<div className="absolute inset-0 rounded-xl border border-emerald-400/50 group-hover:border-emerald-300 transition-colors" />
							</Link>
						</nav>

						{/* Mobile Menu Button - Enhanced */}
						<button
							type="button"
							onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
							className="md:hidden p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 text-content-secondary hover:text-white"
							aria-label="Toggle menu"
							aria-expanded={mobileMenuOpen}
						>
							{mobileMenuOpen ? (
								<BrandIcons.X className="h-6 w-6" />
							) : (
								<BrandIcons.Menu className="h-6 w-6" />
							)}
						</button>
					</div>
				</div>
			</header>

			{/* Mobile Menu */}
			<AnimatePresence>
				{mobileMenuOpen && (
					<>
						{/* Backdrop */}
						<motion.button
							type="button"
							aria-label="Close menu"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setMobileMenuOpen(false)}
							className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
						/>
						{/* Menu Panel */}
						<motion.div
							initial={{ x: "100%" }}
							animate={{ x: 0 }}
							exit={{ x: "100%" }}
							transition={{ type: "spring", damping: 25, stiffness: 200 }}
							className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-black/95 backdrop-blur-xl border-l border-white/10 z-50 md:hidden overflow-y-auto"
						>
							<div className="p-6">
								<div className="flex items-center justify-between mb-8">
									<LogoWordmark />
									<button
										type="button"
										onClick={() => setMobileMenuOpen(false)}
										className="p-2 text-content-secondary hover:text-white transition-all duration-200"
										aria-label="Close menu"
									>
										<BrandIcons.X className="h-6 w-6" />
									</button>
								</div>
								<nav className="flex flex-col gap-3" role="navigation" aria-label="Mobile navigation">
									{navLinks.map((link) => (
										<Link
											key={link.href}
											href={link.href}
											onClick={(e) => handleNavClick(e, link.href, link.scroll)}
											className={`text-lg font-medium transition-all duration-200 py-3 px-4 rounded-lg min-h-[48px] flex items-center ${
												activeSection === link.href
													? "text-white bg-white/10"
													: "text-content-disabled hover:text-white hover:bg-white/5"
											}`}
											aria-current={activeSection === link.href ? "page" : undefined}
										>
											{link.label}
										</Link>
									))}
									<Button
										href="/signup/free"
										onClick={() => {
											trackEvent("cta_clicked", {
												type: "free",
												location: "header_mobile",
											});
											setMobileMenuOpen(false);
										}}
										variant="gradient"
										size="lg"
										className="mt-4 w-full"
									>
										<span className="flex items-center justify-center gap-2">
											{CTA_GET_MY_5_FREE_MATCHES}
											<BrandIcons.ArrowRight className="h-5 w-5" />
										</span>
									</Button>
								</nav>
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</>
	);
}
