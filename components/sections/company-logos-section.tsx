"use client";

import Autoplay from "embla-carousel-autoplay";
import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@/components/ui/carousel";
import { apiCallJson } from "../../lib/api-client";
import { BrandIcons } from "../ui/BrandIcons";

interface Company {
	name: string;
	logoPath: string;
}

export default function CompanyLogos() {
	const [companies, setCompanies] = useState<Company[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(false);
	const sectionRef = useRef<HTMLElement>(null);
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
					// Debug: Companies API response received
				}
				setCompanies(data.companies || []);
			} catch (error) {
				if (process.env.NODE_ENV === "development") {
					console.error("Failed to fetch companies:", error);
				}
				setError(true);
				// Silently fail - this is not critical for page functionality
			} finally {
				setIsLoading(false);
			}
		}
		fetchCompanies();
	}, []);

	if (isLoading) {
		return (
			<section className="py-24 md:py-32 bg-gradient-to-b from-zinc-950/50 via-black to-zinc-950/50 scroll-snap-section relative">
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

	const displayCompanies =
		validCompanies.length > 0 ? validCompanies : fallbackCompanies;

	// Hide section if no companies to display
	if (displayCompanies.length === 0 && !isLoading) {
		return null;
	}

	return (
		<section
			ref={sectionRef}
			className="section-mobile-spacing bg-gradient-to-b from-zinc-950/50 via-black to-zinc-950/50 scroll-snap-section relative"
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
						className="inline-flex items-center gap-2 rounded-full border border-brand-500/40 bg-brand-500/10 px-4 py-1.5 text-xs font-medium tracking-[0.16em] uppercase text-brand-200 shadow-lg shadow-brand-500/20 backdrop-blur-sm"
					>
						<BrandIcons.Briefcase className="h-4 w-4 text-brand-300" />
						Featured Companies
					</motion.span>
					<h2 className="section-title mt-4 mb-3 text-content-heading">
						Jobs from companies like:
					</h2>
					<p className="text-xl text-content-heading md:text-2xl leading-relaxed">
						We've matched roles from these companies (and 400+ more)
					</p>
				</motion.div>

				<div className="relative">
					{/* Subtle spotlight effect */}
					<div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent z-0" />

					{/* Carousel with autoplay */}
					<Carousel
						opts={{
							align: "start",
							loop: true,
						}}
						plugins={[
							Autoplay({
								delay: 3000,
								stopOnInteraction: true,
								stopOnMouseEnter: true,
							}),
						]}
						className="w-full max-w-6xl mx-auto"
					>
						<CarouselContent className="-ml-4">
							{displayCompanies.map((company, index) => (
								<CarouselItem
									key={`${company.name}-${index}`}
									className="pl-4 basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5"
								>
									<motion.div
										initial={{ opacity: 0, scale: 0.9, y: 20 }}
										whileInView={{ opacity: 1, scale: 1, y: 0 }}
										viewport={{ once: true }}
										transition={{
											duration: 0.5,
											delay: index * 0.05,
											ease: [0.23, 1, 0.32, 1],
										}}
										whileHover={{
											y: -6,
											scale: 1.02,
											transition: {
												type: "spring",
												stiffness: 400,
												damping: 25,
											},
										}}
										className="h-full"
									>
										<div className="relative h-[180px] w-full flex items-center justify-center rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-6 transition-all duration-500 ease-out hover:bg-white/[0.06] hover:border-brand-500/30 hover:-translate-y-1 group overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_20px_48px_rgba(20,184,166,0.15)]">
											{/* Glow effect on hover */}
											<div className="absolute -inset-0.5 bg-gradient-to-r from-brand-500/20 to-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100 blur-lg transition-opacity duration-500" />

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
											<div className="absolute inset-[1px] bg-gradient-to-br from-brand-500/[0.08] via-transparent to-white/[0.04] rounded-2xl pointer-events-none" />

											{/* Logo with improved error handling and grayscale effect */}
											<div className="relative z-10 flex items-center justify-center w-full h-full">
												<Image
													src={company.logoPath}
													alt={`${company.name} company logo`}
													width={140}
													height={140}
													className="grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500 ease-out object-contain h-[140px] w-auto max-w-[160px] filter drop-shadow-[0_4px_12px_rgba(16,185,129,0.3)]"
													onError={() => {
														if (process.env.NODE_ENV === "development") {
															console.error(
																`Failed to load logo: ${company.logoPath} for ${company.name}`,
															);
														}
														setFailedLogos((prev) =>
															new Set(prev).add(company.logoPath),
														);
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
													priority={index < 6}
												/>
											</div>
										</div>
									</motion.div>
								</CarouselItem>
							))}
						</CarouselContent>
						<CarouselPrevious className="hidden md:flex" />
						<CarouselNext className="hidden md:flex" />
					</Carousel>
				</div>

				{/* Disclaimer */}
			</div>
		</section>
	);
}
