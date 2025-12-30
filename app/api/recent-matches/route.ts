import { type NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/Utils/databasePool";
import { getProductionRateLimiter } from "@/Utils/productionRateLimiter";

export const dynamic = "force-dynamic";

// Timeout wrapper helper
async function withTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number = 8000,
): Promise<T> {
	const timeoutPromise = new Promise<never>((_, reject) =>
		setTimeout(
			() => reject(new Error(`Request timeout after ${timeoutMs}ms`)),
			timeoutMs,
		),
	);
	return Promise.race([promise, timeoutPromise]);
}

export async function GET(req: NextRequest) {
	try {
		// Rate limiting - lenient for public display
		const rateLimitResult = await getProductionRateLimiter().middleware(
			req,
			"recent-matches",
			{
				windowMs: 60 * 1000,
				maxRequests: 30,
			},
		);

		if (rateLimitResult) {
			return rateLimitResult;
		}

		// Wrap database query in timeout
		const result = await withTimeout(
			(async () => {
				const supabase = getDatabaseClient();

				// Get recent matches from the last hour, grouped by city
				const oneHourAgo = new Date();
				oneHourAgo.setHours(oneHourAgo.getHours() - 1);

				// Get recent matches with job city info via join
				const { data: recentMatches, error: matchesError } = await supabase
					.from("matches")
					.select(`
            created_at,
            job_hash,
            jobs!inner(city)
          `)
					.gte("created_at", oneHourAgo.toISOString())
					.order("created_at", { ascending: false })
					.limit(1000);

				if (matchesError) {
					throw matchesError;
				}

				if (!recentMatches || recentMatches.length === 0) {
					return {
						city: null,
						count: 0,
						minutesAgo: 0,
						scanning: true,
					};
				}

				// Group by city and count matches
				const cityCounts: Record<string, number> = {};
				const cityTimestamps: Record<string, Date> = {};

				recentMatches.forEach((match: any) => {
					const city = match.jobs?.city;
					if (city) {
						cityCounts[city] = (cityCounts[city] || 0) + 1;
						const matchTime = new Date(match.created_at);
						if (!cityTimestamps[city] || matchTime > cityTimestamps[city]) {
							cityTimestamps[city] = matchTime;
						}
					}
				});

				// Convert to array and format
				const cityData = Object.entries(cityCounts)
					.map(([city, count]) => {
						const timestamp = cityTimestamps[city];
						const minutesAgo = Math.floor(
							(Date.now() - timestamp.getTime()) / (1000 * 60),
						);
						return {
							city,
							count,
							minutesAgo,
						};
					})
					.filter((item) => item.count >= 3) // Only show cities with at least 3 matches
					.sort((a, b) => b.count - a.count)
					.slice(0, 10); // Top 10 cities

				if (cityData.length === 0) {
					return {
						city: null,
						count: 0,
						minutesAgo: 0,
						scanning: true,
					};
				}

				// Deterministic selection (no Math.random on server)
				// Use first city from sorted list (most matches) for consistency
				const selectedCity = cityData[0];

				return {
					city: selectedCity.city,
					count: selectedCity.count,
					minutesAgo: selectedCity.minutesAgo,
				};
			})(),
			8000, // 8 second timeout
		);

		return NextResponse.json(result);
	} catch (error) {
		console.error("Error in recent-matches API:", error);
		// Return graceful fallback on timeout or error
		return NextResponse.json({
			city: null,
			count: 0,
			minutesAgo: 0,
			scanning: true,
		});
	}
}
