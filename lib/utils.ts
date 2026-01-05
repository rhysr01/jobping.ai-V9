import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility to merge Tailwind classes with conflict resolution
 * twMerge automatically handles custom color classes like text-content-primary
 * If you notice conflicts (e.g., text-white not being overridden by text-content-primary),
 * the classes are being merged correctly - twMerge keeps the last one in the array.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
