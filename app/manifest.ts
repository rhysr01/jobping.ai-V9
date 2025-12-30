import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "JobPing - EU Early-Career Job Matches",
		short_name: "JobPing",
		description:
			"Get matched with early-career jobs in Europe. Free instant matches, Premium weekly emails.",
		start_url: "/",
		display: "standalone",
		background_color: "#000000",
		theme_color: "#09090b", // zinc-950
		icons: [
			{
				src: "/favicon.ico",
				sizes: "any",
				type: "image/x-icon",
			},
			{
				src: "/icon-192.png",
				sizes: "192x192",
				type: "image/png",
			},
			{
				src: "/icon-512.png",
				sizes: "512x512",
				type: "image/png",
			},
		],
	};
}
