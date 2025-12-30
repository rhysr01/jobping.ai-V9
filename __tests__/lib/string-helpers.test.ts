import {
  capitalize,
  normalizeStringToArray,
  toKebabCase,
  truncate,
} from "@/lib/string-helpers";

describe("string-helpers", () => {
  describe("normalizeStringToArray", () => {
    it("should handle arrays", () => {
      expect(normalizeStringToArray(["a", "b", "c"])).toEqual(["a", "b", "c"]);
    });

    it("should handle pipe-separated strings", () => {
      expect(normalizeStringToArray("a|b|c")).toEqual(["a", "b", "c"]);
    });

    it("should handle comma-separated strings", () => {
      expect(normalizeStringToArray("a, b, c")).toEqual(["a", "b", "c"]);
    });

    it("should handle single values", () => {
      expect(normalizeStringToArray("single")).toEqual(["single"]);
    });

    it("should trim whitespace", () => {
      expect(normalizeStringToArray("  a  |  b  ")).toEqual(["a", "b"]);
    });

    it("should filter empty values", () => {
      expect(normalizeStringToArray("a||b")).toEqual(["a", "b"]);
    });

    it("should return empty array for null/undefined", () => {
      expect(normalizeStringToArray(null)).toEqual([]);
      expect(normalizeStringToArray(undefined)).toEqual([]);
    });

    it("should handle empty string", () => {
      expect(normalizeStringToArray("")).toEqual([]);
    });
  });

  describe("truncate", () => {
    it("should truncate long strings", () => {
      const long = "a".repeat(100);
      const truncated = truncate(long, 50);
      expect(truncated.length).toBeLessThanOrEqual(53); // 50 + '...'
      expect(truncated).toContain("...");
    });

    it("should not truncate short strings", () => {
      const short = "Short text";
      const truncated = truncate(short, 50);
      expect(truncated).toBe(short);
    });

    it("should handle exact length", () => {
      const text = "a".repeat(50);
      const truncated = truncate(text, 50);
      expect(truncated).toBe(text);
    });
  });

  describe("capitalize", () => {
    it("should capitalize first letter", () => {
      expect(capitalize("hello")).toBe("Hello");
      expect(capitalize("WORLD")).toBe("WORLD");
    });

    it("should handle empty string", () => {
      expect(capitalize("")).toBe("");
    });

    it("should handle single character", () => {
      expect(capitalize("a")).toBe("A");
    });
  });

  describe("toKebabCase", () => {
    it("should convert to kebab-case", () => {
      expect(toKebabCase("Hello World")).toBe("hello-world");
      expect(toKebabCase("helloWorld")).toBe("hello-world");
      expect(toKebabCase("hello_world")).toBe("hello-world");
    });

    it("should handle camelCase", () => {
      expect(toKebabCase("camelCase")).toBe("camel-case");
    });

    it("should handle multiple spaces", () => {
      expect(toKebabCase("multiple   spaces")).toBe("multiple-spaces");
    });

    it("should handle mixed case", () => {
      expect(toKebabCase("MixedCaseString")).toBe("mixed-case-string");
    });
  });
});
