/**
 * Zod Validation Schemas for JobPing
 * Centralized validation for type safety and better error messages
 */

import { z } from "zod";

// ============================================
// USER SCHEMAS
// ============================================

export const subscribeSchema = z.object({
	email: z.string().email("Invalid email address"),
	name: z.string().min(2, "Name must be at least 2 characters").max(100),
	plan: z.enum(["free", "premium"]).optional().default("free"),
});

export type SubscribeInput = z.infer<typeof subscribeSchema>;
