/**
 * Tests for Generate Embeddings API Route
 * Tests job embedding generation with HMAC auth
 */

import type { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/generate-embeddings/route";

jest.mock("@/Utils/databasePool");
jest.mock("@/Utils/matching/embedding.service");
jest.mock("@/Utils/auth/hmac");

describe("Generate Embeddings API Route", () => {
	let mockRequest: NextRequest;
	let mockSupabase: any;

	beforeEach(() => {
		jest.clearAllMocks();

		mockRequest = {
			method: "POST",
			text: jest.fn(),
			headers: new Headers({
				"x-jobping-signature": "test-signature",
				"x-jobping-timestamp": Date.now().toString(),
			}),
		} as any;

		mockSupabase = {
			from: jest.fn().mockReturnThis(),
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			is: jest.fn().mockReturnThis(),
			limit: jest.fn().mockResolvedValue({
				data: [],
				error: null,
			}),
		};

		const { getDatabaseClient } = require("@/Utils/databasePool");
		getDatabaseClient.mockReturnValue(mockSupabase);

		const { verifyHMAC } = require("@/Utils/auth/hmac");
		verifyHMAC.mockReturnValue({ isValid: true });

		const { embeddingService } = require("@/Utils/matching/embedding.service");
		embeddingService.batchGenerateJobEmbeddings.mockResolvedValue(new Map());
		embeddingService.storeJobEmbeddings.mockResolvedValue(undefined);
		embeddingService.checkEmbeddingCoverage.mockResolvedValue({
			total: 1000,
			withEmbeddings: 500,
			coverage: 0.5,
		});
	});

	describe("POST /api/generate-embeddings", () => {
		it("should generate embeddings for jobs", async () => {
			mockRequest.text.mockResolvedValue(
				JSON.stringify({ batchSize: 100, jobLimit: 1000 }),
			);

			mockSupabase.limit.mockResolvedValue({
				data: [
					{ id: 1, title: "Job 1" },
					{ id: 2, title: "Job 2" },
				],
				error: null,
			});

			const {
				embeddingService,
			} = require("@/Utils/matching/embedding.service");
			const mockEmbeddings = new Map([
				["hash1", [0.1, 0.2, 0.3]],
				["hash2", [0.4, 0.5, 0.6]],
			]);
			embeddingService.batchGenerateJobEmbeddings.mockResolvedValue(
				mockEmbeddings,
			);

			const response = await POST(mockRequest);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.message).toContain("successfully");
			expect(data.processed).toBe(2);
			expect(embeddingService.storeJobEmbeddings).toHaveBeenCalled();
		});

		it("should require HMAC signature", async () => {
			mockRequest.headers.delete("x-jobping-signature");

			const response = await POST(mockRequest);

			expect(response.status).toBe(401);
		});

		it("should require timestamp", async () => {
			mockRequest.headers.delete("x-jobping-timestamp");

			const response = await POST(mockRequest);

			expect(response.status).toBe(401);
		});

		it("should validate HMAC signature", async () => {
			mockRequest.text.mockResolvedValue(JSON.stringify({}));

			const { verifyHMAC } = require("@/Utils/auth/hmac");
			verifyHMAC.mockReturnValue({ isValid: false });

			const response = await POST(mockRequest);

			expect(response.status).toBe(401);
		});

		it("should handle no jobs needing embeddings", async () => {
			mockRequest.text.mockResolvedValue(JSON.stringify({}));

			mockSupabase.limit.mockResolvedValue({
				data: [],
				error: null,
			});

			const response = await POST(mockRequest);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.processed).toBe(0);
		});

		it("should use default batchSize and jobLimit", async () => {
			mockRequest.text.mockResolvedValue(JSON.stringify({}));

			await POST(mockRequest);

			const {
				embeddingService,
			} = require("@/Utils/matching/embedding.service");
			expect(embeddingService.batchGenerateJobEmbeddings).toHaveBeenCalled();
		});

		it("should return coverage statistics", async () => {
			mockRequest.text.mockResolvedValue(JSON.stringify({}));

			const response = await POST(mockRequest);
			const data = await response.json();

			expect(data.coverage).toBeDefined();
			expect(data.totalJobs).toBeDefined();
			expect(data.withEmbeddings).toBeDefined();
		});
	});

	describe("GET /api/generate-embeddings", () => {
		beforeEach(() => {
			mockRequest.method = "GET";
		});

		it("should return embedding coverage", async () => {
			const response = await GET(mockRequest);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.total).toBeDefined();
			expect(data.coverage).toBeDefined();
			expect(data.needsEmbeddings).toBeDefined();
		});

		it("should handle coverage check errors", async () => {
			const {
				embeddingService,
			} = require("@/Utils/matching/embedding.service");
			embeddingService.checkEmbeddingCoverage.mockRejectedValue(
				new Error("Database error"),
			);

			const response = await GET(mockRequest);

			expect(response.status).toBeGreaterThanOrEqual(500);
		});
	});
});
