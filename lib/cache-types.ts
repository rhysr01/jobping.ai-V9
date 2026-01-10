/**
 * Cache Type Definitions
 * Types related to caching functionality
 */

// ================================
// Utility Types
// ================================

export interface CacheEntry<T> {
	data: T;
	timestamp: number;
	ttl: number;
	accessCount: number;
}