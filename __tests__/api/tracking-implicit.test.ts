import { GET } from "@/app/api/tracking/implicit/route";

describe("GET /api/tracking/implicit", () => {
	const mockRequest = {
		url: "http://localhost/api/tracking/implicit?email=test@example.com",
		headers: new Headers(),
	} as any;

	it("should return tracking response", async () => {
		const response = await GET(mockRequest);
		expect(response.status).toBe(200);
	});

	it("should return valid response format", async () => {
		const response = await GET(mockRequest);
		expect(response).toBeDefined();
		expect(response.status).toBe(200);
	});
});
