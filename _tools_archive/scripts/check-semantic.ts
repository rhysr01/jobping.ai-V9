import "dotenv/config";
import { embeddingService } from "@/Utils/matching/embedding.service";
import { semanticRetrievalService } from "@/Utils/matching/semanticRetrieval";

async function main() {
	const prefs = {
		email: "semantic-test@example.com",
		target_cities: ["London"],
		career_path: ["strategy"],
		work_environment: "hybrid" as const,
	};

	const available = await semanticRetrievalService.isSemanticSearchAvailable();
	console.log(`Semantic search available: ${available}`);

	console.log("Generating or retrieving cached embedding...");
	await embeddingService.getUserEmbeddingWithCache(prefs.email, prefs);

	console.log("Fetching semantic candidates...");
	const matches = await semanticRetrievalService.getSemanticCandidates(
		prefs,
		10,
	);

	console.log(`Semantic matches returned: ${matches.length}`);
	matches.forEach((job, index) => {
		console.log(
			`${index + 1}. ${job.title} (${job.semantic_score?.toFixed(3) ?? "n/a"})`,
		);
	});
}

main().catch((err) => {
	console.error("Semantic check failed:", err);
	process.exit(1);
});
