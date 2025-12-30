import { type NextRequest, NextResponse } from "next/server";
import { withAxiom } from "next-axiom";
import { asyncHandler } from "@/lib/errors";

// Simple scrape endpoint for production
export const POST = withAxiom(
	asyncHandler(async (req: NextRequest) => {
		const { platforms = ["all"] } = await req.json();

		console.log(` Scrape request for platforms: ${platforms.join(", ")}`);

		// For production, this endpoint is handled by the automation system
		// Users don't need to manually trigger scraping

		return NextResponse.json({
			success: true,
			message: "Scraping is automated and runs every hour",
			platforms: platforms,
			note: "Jobs are automatically scraped and delivered to your email every 48 hours",
		});
	}),
);

export const GET = withAxiom(
	asyncHandler(async () => {
		return NextResponse.json({
			message: "Scrape endpoint active",
			note: "Use POST to trigger scraping (though it's automated)",
			automation: "Jobs are scraped automatically every hour",
		});
	}),
);
