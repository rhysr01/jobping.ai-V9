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

export const userSchema = z.object({
	id: z.string().uuid(),
	email: z.string().email(),
	full_name: z.string(),
	subscription_active: z.boolean(),
	active: z.boolean(),
	email_verified: z.boolean(),
	target_cities: z.array(z.string()).optional(),
	roles_selected: z.array(z.string()).optional(),
	created_at: z.string().datetime(),
});

export type User = z.infer<typeof userSchema>;

// ============================================
// JOB SCHEMAS
// ============================================

export const jobSchema = z.object({
	id: z.number(),
	job_hash: z.string(),
	title: z.string(),
	company: z.string(),
	location: z.string(),
	description: z.string().optional(),
	job_url: z.string().url(),
	source: z.string(),
	active: z.boolean(),
	created_at: z.string().datetime(),
});

export type Job = z.infer<typeof jobSchema>;

// ============================================
// MATCH SCHEMAS
// ============================================

export const matchSchema = z.object({
	id: z.number(),
	user_email: z.string().email(),
	job_hash: z.string(),
	match_score: z.number().min(0).max(1), // Database stores 0-1
	match_reason: z.string().optional(),
	created_at: z.string().datetime(),
});

export type Match = z.infer<typeof matchSchema>;

// ============================================
// API REQUEST/RESPONSE SCHEMAS
// ============================================

export const feedbackSchema = z.object({
	action: z.enum(["positive", "negative", "neutral"]),
	score: z.number().min(1).max(5).optional(),
	job: z.string(), // job_hash
	email: z.string().email(),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;

export const promoCodeSchema = z.object({
	email: z.string().email(),
	code: z.string().min(3).max(50),
});

export type PromoCodeInput = z.infer<typeof promoCodeSchema>;
