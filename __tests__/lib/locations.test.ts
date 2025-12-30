import { resolveLocationId } from "@/lib/locations";
import { mantiks } from "@/lib/mantiks";

// Mock mantiks
jest.mock("@/lib/mantiks", () => ({
  mantiks: {
    get: jest.fn(),
  },
}));

describe("locations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("resolveLocationId", () => {
    it("should return location ID from API", async () => {
      (mantiks.get as jest.Mock).mockResolvedValue({
        data: {
          locations: [{ id: 123 }],
        },
      });

      const id = await resolveLocationId("London");
      expect(id).toBe(123);
      expect(mantiks.get).toHaveBeenCalledWith("/location/search", {
        params: { q: "London" },
      });
    });

    it("should cache location IDs", async () => {
      (mantiks.get as jest.Mock).mockResolvedValue({
        data: {
          locations: [{ id: 456 }],
        },
      });

      const id1 = await resolveLocationId("Berlin");
      const id2 = await resolveLocationId("Berlin");

      expect(id1).toBe(456);
      expect(id2).toBe(456);
      expect(mantiks.get).toHaveBeenCalledTimes(1); // Only called once due to cache
    });

    it("should return undefined for empty results", async () => {
      (mantiks.get as jest.Mock).mockResolvedValue({
        data: {
          locations: [],
        },
      });

      const id = await resolveLocationId("Unknown");
      expect(id).toBeUndefined();
    });

    it("should return undefined on error", async () => {
      (mantiks.get as jest.Mock).mockRejectedValue(new Error("API Error"));

      const id = await resolveLocationId("Error");
      expect(id).toBeUndefined();
    });

    it("should handle missing data", async () => {
      (mantiks.get as jest.Mock).mockResolvedValue({
        data: {},
      });

      const id = await resolveLocationId("Missing");
      expect(id).toBeUndefined();
    });

    it("should handle null location", async () => {
      (mantiks.get as jest.Mock).mockResolvedValue({
        data: {
          locations: [null],
        },
      });

      const id = await resolveLocationId("Null");
      expect(id).toBeUndefined();
    });
  });
});
