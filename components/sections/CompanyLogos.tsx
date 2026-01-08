"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { BrandIcons } from "@/components/ui/BrandIcons";
import { apiCallJson } from "@/lib/api-client";

interface Company {
	name: string;
	logoPath: string;
}

export default function CompanyLogos() {
	const [companies, setCompanies] = useState<Company[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(false);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const sectionRef = useRef<HTMLElement>(null);
	const [isHovered, setIsHovered] = useState(false);
	const [isVisible, setIsVisible] = useState(false);
	const [failedLogos, setFailedLogos] = useState<Set<string>>(new Set());

	useEffect(() => {
		async function fetchCompanies() {
			try {
				setIsLoading(true);
				setError(false);
				const data = await apiCallJson<{ companies?: Company[] }>(
					"/api/companies",
				);
				if (process.env.NODE_ENV === "development") {
					console.log("Companies API response:", data);
				}
				setCompanies(data.companies || []);
			} catch (error) {
				console.error("Failed to fetch companies:", error);
				setError(true);
				// Silently fail - this is not critical for page functionality
			} finally {
				setIsLoading(false);
			}
		}
		fetchCompanies();
	}, []);

	// IntersectionObserver to detect when section comes into view
	useEffect(() => {
		if (!sectionRef.current) return;

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						setIsVisible(true);
					}
				});
			},
			{
				threshold: 0.1, // Start when 10% of section is visible
				rootMargin: "100px", // Start slightly before section enters viewport
			},
		);

		observer.observe(sectionRef.current);

		return () => {
			observer.disconnect();
		};
	}, []);

	// Auto-scroll logos slowly to the right with infinite loop
	// Only starts when section is visible and images are loaded
	useEffect(() => {
		if (!scrollContainerRef.current || displayCompanies.length === 0 || !isVisible) {
			return;
		}

		if (displayCompanies.length === 0) {
			return;
		}

		let startDelay: NodeJS.Timeout;
		let animationFrameId: number | null = null;

		const startAutoScroll = () => {
			if (!scrollContainerRef.current || isHovered) return;

			const container = scrollContainerRef.current;
			const containerWidth = container.clientWidth;
			const contentWidth = container.scrollWidth;
			const maxScroll = contentWidth - containerWidth;

			// Only start auto-scroll if there's actually scrollable content
			if (maxScroll <= 0) {
				if (process.env.NODE_ENV === "development") {
					console.log("[CompanyLogos] No scrollable content", {
						containerWidth,
						contentWidth,
						maxScroll,
					});
				}
				return;
			}

			// Calculate the width of one full set of companies (half of total since we duplicated)
			const singleSetWidth = contentWidth / 2;

			let lastTimestamp: number | null = null;
			const scrollSpeed = 0.5; // Increased from 0.3 for better visibility

			const animate = (timestamp: number) => {
				if (!scrollContainerRef.current || isHovered || !isVisible) {
					animationFrameId = null;
					return;
				}

				if (lastTimestamp === null) {
					lastTimestamp = timestamp;
				}

				const deltaTime = timestamp - lastTimestamp;
				lastTimestamp = timestamp;

				const currentContainer = scrollContainerRef.current;
				const currentScroll = currentContainer.scrollLeft;

				// If we've scrolled past the first set of logos, reset to start for seamless loop
				if (currentScroll >= singleSetWidth - 10) {
					currentContainer.scrollLeft = 0;
					lastTimestamp = null;
					animationFrameId = requestAnimationFrame(animate);
					return;
				}

				// Scroll slowly to the right
				const newScroll = currentScroll + scrollSpeed * deltaTime;
				currentContainer.scrollLeft = newScroll;

				animationFrameId = requestAnimationFrame(animate);
			};

			// Start the animation
			animationFrameId = requestAnimationFrame(animate);
		};

		// Wait for images to load and DOM to be ready, then start auto-scroll
		// Increased delay to ensure images are rendered
		startDelay = setTimeout(() => {
			// Force a layout recalculation
			if (scrollContainerRef.current) {
				scrollContainerRef.current.offsetHeight; // Trigger reflow
			}
			startAutoScroll();
		}, 500); // Increased from 300ms

		return () => {
			clearTimeout(startDelay);
			if (animationFrameId !== null) {
				cancelAnimationFrame(animationFrameId);
				animationFrameId = null;
			}
		};
	}, [companies, isHovered, isVisible, failedLogos]);

	if (isLoading) {
		return (
			<section className="py-24 md:py-32 bg-black scroll-snap-section relative">
				<div className="container-page">
					<div className="h-[200px] flex items-center justify-center">
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: 0.3 }}
							className="space-y-3"
						>
							<motion.div
								initial={{ opacity: 0, x: -10 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ duration: 0.4, delay: 0.1 }}
								className="h-6 w-64 bg-white/10 rounded animate-pulse mx-auto"
							/>
							<motion.div
								initial={{ opacity: 0, x: -10 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ duration: 0.4, delay: 0.2 }}
								className="h-4 w-48 bg-white/5 rounded animate-pulse mx-auto"
							/>
						</motion.div>
					</div>
				</div>
			</section>
		);
	}

	// If error, silently hide - not critical for conversion
	if (error) {
		return null;
	}

	// Filter out companies with failed logos
	const validCompanies = companies.filter(
		(company) => !failedLogos.has(company.logoPath),
	);

	// Show premium fallback companies if no database companies are available
	// Only include companies whose logo files actually exist to avoid 404 errors
	const fallbackCompanies = [
		{ name: "Google", logoPath: "/logos/companies/google.svg" },
		{ name: "Apple", logoPath: "/logos/companies/apple.svg" },
		{ name: "Meta", logoPath: "/logos/companies/meta.svg" },
		{ name: "Netflix", logoPath: "/logos/companies/netflix.svg" },
		{ name: "Spotify", logoPath: "/logos/companies/spotify.svg" },
		{ name: "Stripe", logoPath: "/logos/companies/stripe.svg" },
		{ name: "Tesla", logoPath: "/logos/companies/tesla.svg" },
		{ name: "Uber", logoPath: "/logos/companies/uber.svg" },
		{ name: "Shopify", logoPath: "/logos/companies/shopify.svg" },
		{ name: "Notion", logoPath: "/logos/companies/notion.svg" },
		{ name: "Vercel", logoPath: "/logos/companies/vercel.svg" },
		{ name: "GitHub", logoPath: "/logos/companies/github.svg" },
		{ name: "Salesforce", logoPath: "/logos/companies/salesforce.svg" },
		{ name: "Oracle", logoPath: "/logos/companies/oracle.svg" },
		{ name: "SAP", logoPath: "/logos/companies/sap.svg" },
		{ name: "Adobe", logoPath: "/logos/companies/adobe.svg" },
		{ name: "IBM", logoPath: "/logos/companies/ibm.svg" },
		{ name: "Siemens", logoPath: "/logos/companies/siemens.svg" },
	];

	const displayCompanies = validCompanies.length > 0 ? validCompanies : fallbackCompanies;

	// Hide section if no companies to display
	if (displayCompanies.length === 0 && !isLoading) {
		return null;
	}

	return (
		<section
			ref={sectionRef}
			className="py-32 md:py-40 bg-gradient-to-b from-zinc-950/50 via-black to-zinc-950/50 scroll-snap-section relative"
		>
			{/* Scroll momentum fade */}
			<div className="absolute left-0 right-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-0" />
			{/* Soft section band */}
			<div className="pointer-events-none absolute inset-x-0 -top-10 h-40 bg-gradient-to-b from-zinc-900/40 to-transparent" />

			<div className="container-page relative z-10">
				<motion.div
					initial={{ opacity: 0, y: 16 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5 }}
					className="mx-auto max-w-3xl text-left sm:text-center mb-12"
				>
					<motion.span
						initial={{ opacity: 0, scale: 0.9 }}
						whileInView={{ opacity: 1, scale: 1 }}
						viewport={{ once: true }}
						transition={{ duration: 0.4, delay: 0.1 }}
						className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1.5 text-[11px] font-medium tracking-[0.16em] uppercase text-emerald-200 shadow-lg shadow-emerald-500/20 backdrop-blur-sm"
					>
						<BrandIcons.Briefcase className="h-4 w-4 text-emerald-300" />
						Featured Companies
					</motion.span>
					<h2 className="section-title mt-4 mb-3 text-content-heading">
						Jobs from companies like:
					</h2>
					<p className="text-xl text-content-heading md:text-2xl leading-relaxed">
						We've matched roles from these companies (and 400+ more)
					</p>
				</motion.div>

				<div className="relative after:absolute after:inset-y-0 after:right-0 after:w-12 after:bg-gradient-to-l after:from-zinc-950 after:to-transparent before:absolute before:inset-y-0 before:left-0 before:z-10 before:w-12 before:bg-gradient-to-r before:from-zinc-950 before:to-transparent">
					{/* Subtle spotlight effect */}
					<div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent z-0" />

					{/* Horizontal scroll container with auto-scroll */}
					<div
						ref={scrollContainerRef}
						onMouseEnter={() => setIsHovered(true)}
						onMouseLeave={() => setIsHovered(false)}
						role="presentation"
						className="flex gap-8 overflow-x-auto scrollbar-hide py-8 px-8 [mask-image:linear-gradient(to_right,transparent_0%,white_10%,white_90%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_right,transparent_0%,white_10%,white_90%,transparent_100%)]"
						style={{
							scrollbarWidth: "none",
							msOverflowStyle: "none",
							WebkitOverflowScrolling: "touch",
							scrollBehavior: "auto", // Disable smooth scroll for programmatic scrolling
							overflowY: "hidden", // Ensure only horizontal scroll
							// Ensure container can scroll
							minWidth: "100%",
						}}
					>
						{/* Duplicate logos for seamless infinite scroll */}
						{[...displayCompanies, ...displayCompanies].map((company, index) => (
							<motion.div
								key={`${company.name}-${index}`}
								initial={{ opacity: 0, scale: 0.9, y: 20 }}
								whileInView={{ opacity: 1, scale: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{
									duration: 0.5,
									delay: index * 0.05, // Staggered entrance
									ease: [0.23, 1, 0.32, 1],
								}}
								whileHover={{
									y: -6,
									scale: 1.02,
									transition: { type: "spring", stiffness: 400, damping: 25 },
								}}
								className="flex-shrink-0 snap-start"
							>
								<div className="relative h-[180px] w-[200px] flex items-center justify-center rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-6 transition-all duration-500 ease-out hover:bg-white/[0.06] hover:border-emerald-500/30 hover:-translate-y-1 group overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_20px_48px_rgba(16,185,129,0.15)]">
									{/* Glow effect on hover */}
									<div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl opacity-0 group-hover:opacity-100 blur-lg transition-opacity duration-500" />
									
									{/* Animated shimmer sweep */}
									<motion.div
										initial={{ x: "-100%" }}
										animate={{ x: "200%" }}
										transition={{
											duration: 2,
											repeat: Infinity,
											repeatDelay: 3,
											ease: "easeInOut",
										}}
										className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"
									/>

									{/* Inner glow with light source */}
									<div className="absolute inset-[1px] bg-gradient-to-br from-emerald-500/[0.08] via-transparent to-white/[0.04] rounded-2xl pointer-events-none" />

									{/* Logo with improved error handling */}
									<div className="relative z-10 flex items-center justify-center w-full h-full">
										<Image
											src={company.logoPath}
											alt={`${company.name} company logo`}
											width={140}
											height={140}
											className="object-contain h-[140px] w-auto max-w-[160px] opacity-90 transition-all duration-500 ease-out group-hover:opacity-100 group-hover:scale-125 filter drop-shadow-[0_4px_12px_rgba(16,185,129,0.3)]"
											onError={(e) => {
												console.error(
													`Failed to load logo: ${company.logoPath} for ${company.name}`,
													e,
												);
												setFailedLogos((prev) =>
													new Set(prev).add(company.logoPath),
												);
												// Hide the card immediately using closest for better DOM selection
												const target = e.target as HTMLElement;
												const card = target.closest('.flex-shrink-0');
												if (card) {
													(card as HTMLElement).style.display = "none";
												}
										}}
										onLoad={() => {
											if (process.env.NODE_ENV === "development") {
												console.log(
													`Successfully loaded logo: ${company.logoPath}`,
												);
											}
										}}
										loading={index < 6 ? "eager" : "lazy"}
											unoptimized={false}
											priority={index < 6} // Prioritize first 6 logos
										/>
									</div>
								</div>
							</motion.div>
						))}
					</div>
				</div>

				{/* Disclaimer */}
				<motion.div
					initial={{ opacity: 0 }}
					whileInView={{ opacity: 1 }}
					viewport={{ once: true }}
					transition={{ delay: 0.3 }}
					className="text-center mt-8"
				>
					<p className="text-xs text-content-muted">
						JobPing aggregates jobs from public sources including Indeed, Glassdoor, Adzuna, Jooble, Reed, Arbeitnow, and company pages.
						We are not affiliated with these companies and match you with available listings.
					</p>
				</motion.div>
			</div>
		</section>
	);
}
