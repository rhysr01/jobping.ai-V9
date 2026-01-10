/**
 * Database Query Type Definitions
 * Types related to database operations and responses
 */

// ================================
// Database Query Types
// ================================

export interface DatabaseResponse<T> {
	data: T | null;
	error: any;
	success: boolean;
}