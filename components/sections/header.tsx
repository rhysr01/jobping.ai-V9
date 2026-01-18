"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import LogoWordmark from "../logo-wordmark";
import { BrandIcons } from "../ui/BrandIcons";
import CustomButton from "../ui/CustomButton";
import { ThemeToggle } from "../ui/theme-toggle";
import { trackEvent } from "../../lib/analytics";
import { CTA_GET_MY_5_FREE_MATCHES } from "../../lib/copy";

export default function Header() {
	const [scrolled, setScrolled] = useState(false);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [activeSection, setActiveSection] = useState<string>("");
	const [isMobile, setIsMobile] = useState(false);
	const [previouslyFocusedElement, setPreviouslyFocusedElement] = useState<Element | null>(null);
	const pathname = usePathname();

	// Initialize mobile state immediately with SSR safety
	useEffect(() => {
		const checkMobile = () => setIsMobile(window.innerWidth <= 768);
		checkMobile();

		// Also listen for resize events
		const handleResize = () => checkMobile();
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	useEffect(() => {
		// Mobile detection
		const updateMobileState = () => {
			setIsMobile(window.innerWidth <= 768);
		};

		updateMobileState();
		window.addEventListener("resize", updateMobileState);

		// Throttled scroll handler for better mobile performance
		const handleScroll = () => {
			setScrolled(window.scrollY > 20);

			// Skip complex section detection on mobile for better performance
			if (!isMobile) {
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
			} else {
				// On mobile, keep active section as empty for better performance
				setActiveSection("");
			}
		};

		// Throttle scroll events for better mobile performance (60fps = ~16ms)
		let scrollTimeout: NodeJS.Timeout;
		const throttledScroll = () => {
			if (scrollTimeout) clearTimeout(scrollTimeout);
			scrollTimeout = setTimeout(handleScroll, 16);
		};

		window.addEventListener("scroll", throttledScroll, { passive: true });
		handleScroll(); // Initial check

		return () => {
			window.removeEventListener("scroll", throttledScroll);
			window.removeEventListener("resize", updateMobileState);
			if (scrollTimeout) clearTimeout(scrollTimeout);
		};
	}, [isMobile]);

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

	// Focus management for mobile menu
	useEffect(() => {
		if (mobileMenuOpen && isMobile) {
			// Store the currently focused element
			setPreviouslyFocusedElement(document.activeElement);

			// Focus the menu
			const menuElement = document.querySelector('[role="dialog"]') as HTMLElement;
			if (menuElement) {
				menuElement.focus();
			}

			// Add keyboard listener for Escape key
			const handleEscape = (e: KeyboardEvent) => {
				if (e.key === 'Escape') {
					setMobileMenuOpen(false);
				}
			};

			document.addEventListener('keydown', handleEscape);
			return () => document.removeEventListener('keydown', handleEscape);
		} else if (!mobileMenuOpen && previouslyFocusedElement) {
			// Restore focus when menu closes
			(previouslyFocusedElement as HTMLElement).focus();
			setPreviouslyFocusedElement(null);
		}

		// Always return something to satisfy TypeScript
		return undefined;
	}, [mobileMenuOpen, isMobile, previouslyFocusedElement]);

	const navLinks = [
		{ label: "How It Works", href: "#how-it-works", scroll: true },
		{ label: "Pricing", href: "#pricing", scroll: true },
	];

	// Always define the callback, regardless of mobile state
	const toggleMobileMenu = useCallback(() => {
		setMobileMenuOpen(prev => !prev);
	}, []);

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
			>
				{/* Glassmorphic background with gradient glow */}
				<div className="absolute inset-0">
					{/* Top gradient glow */}
					<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
				</div>
				
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative" style={{ overflow: "visible" }}>
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
							className="flex items-center gap-3 group py-1 overflow-visible"
							aria-label="JobPing Home"
							style={{ overflow: "visible", paddingRight: "0.75rem" }}
						>
							<div className="scale-90 md:scale-100 origin-left overflow-visible pr-3 md:pr-4" style={{ overflow: "visible", minWidth: "fit-content" }}>
								<LogoWordmark />
							</div>
						</Link>

						{/* Desktop Navigation */}
						<nav className="hidden md:flex items-center gap-8">
							{/* Navigation Links with animated underlines */}
							{navLinks.map((link) => (
								<Link
									key={link.href}
									href={link.href}
									onClick={(e) => handleNavClick(e, link.href, link.scroll)}
									className={`font-display relative text-sm font-medium transition-colors group py-2 whitespace-nowrap ${
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
											className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-400 to-brand-500 rounded-full"
											initial={false}
											transition={{
												type: "spring",
												stiffness: 380,
												damping: 30,
											}}
										/>
									) : (
										<span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-brand-400 to-brand-500 group-hover:w-full transition-all duration-300 ease-out" />
									)}
									
									{/* Subtle glow on hover */}
									<span className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/5 rounded-lg blur-sm transition-all" />
								</Link>
							))}

							{/* Trust badge - desktop only */}
							<div className="hidden lg:flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.03] backdrop-blur-sm border border-white/10 hover:bg-white/[0.05] hover:border-emerald-500/30 transition-all">
								{/* Pulsing dot */}
								<div className="relative flex h-2 w-2">
									<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
									<span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
								</div>
								<span className="font-display text-xs font-medium text-zinc-300">
									1,000+ students
								</span>
							</div>

							{/* Theme toggle */}
							<div className="hidden lg:flex">
								<ThemeToggle />
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
								className="font-display group relative px-6 py-3 rounded-full font-semibold text-white overflow-hidden"
							>
								{/* Black shiny background */}
								<div className="absolute inset-0 bg-black group-hover:bg-brand-500/10 transition-all duration-300" />

								{/* Shadow that grows on hover */}
								<div className="absolute inset-0 shadow-lg shadow-black/50 group-hover:shadow-xl group-hover:shadow-black/80 rounded-full transition-all" />

								{/* Text */}
								<span className="relative z-10 group-hover:-translate-y-0.5 inline-flex items-center gap-2 transition-transform">
									<span className="hidden sm:inline">{CTA_GET_MY_5_FREE_MATCHES}</span>
									<span className="sm:hidden">Get 5 Free Matches</span>
									<BrandIcons.ArrowRight className="h-4 w-4" />
								</span>

								{/* Border glow */}
								<div className="absolute inset-0 rounded-full border border-white/30 group-hover:border-white/60 transition-colors" />
							</Link>
						</nav>

						{/* Mobile Menu Button - Enhanced */}
						<button
							type="button"
							onClick={toggleMobileMenu}
							className="md:hidden p-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 text-content-secondary hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
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
				{mobileMenuOpen && isMobile && (
					<>
						{/* Backdrop */}
						<motion.button
							type="button"
							aria-label="Close menu"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={toggleMobileMenu}
							className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
						/>
						{/* Menu Panel */}
						<motion.div
							initial={{ x: "100%" }}
							animate={{ x: 0 }}
							exit={{ x: "100%" }}
							transition={isMobile ? { duration: 0.3, ease: "easeOut" } : { type: "spring", damping: 25, stiffness: 200 }}
							className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-black/95 backdrop-blur-xl border-l border-white/10 z-50 overflow-y-auto"
							role="dialog"
							aria-modal="true"
							aria-label="Mobile navigation menu"
							tabIndex={-1}
						>
							<div className="p-6">
								<div className="flex items-center justify-between mb-8">
									<LogoWordmark />
									<button
										type="button"
										onClick={toggleMobileMenu}
										className="p-2 text-content-secondary hover:text-white transition-all duration-200"
										aria-label="Close menu"
									>
										<BrandIcons.X className="h-6 w-6" />
									</button>
								</div>
								<nav className="flex flex-col gap-3" aria-label="Mobile navigation">
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
									<CustomButton
										href="/signup/free"
										onClick={() => {
											trackEvent("cta_clicked", {
												type: "free",
												location: "header_mobile",
											});
											setMobileMenuOpen(false);
										}}
										variant="primary"
										size="lg"
										className="mt-4 w-full"
									>
										<span className="flex items-center justify-center gap-2">
											Get 5 Free Matches
											<BrandIcons.ArrowRight className="h-5 w-5" />
										</span>
									</CustomButton>
								</nav>
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</>
	);
}
