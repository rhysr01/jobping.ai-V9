/**
 * String manipulation helpers
 * Consolidated from duplicate implementations across the codebase
 */

/**
 * Normalizes a value to a string array
 * Handles various input formats: arrays, pipe-separated, comma-separated strings
 */
export function normalizeStringToArray(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    // Handle pipe-separated format
    if (value.includes("|")) {
      return value
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    // Handle comma-separated format
    if (value.includes(",")) {
      return value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    // Single value
    return value.trim() ? [value.trim()] : [];
  }

  return [];
}

/**
 * Truncates a string to a maximum length with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

/**
 * Capitalizes the first letter of a string
 */
export function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Converts a string to kebab-case
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}
