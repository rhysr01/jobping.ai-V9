/**
 * Enhanced Debug Logger for Development
 * Provides structured, color-coded logging for easier debugging
 * Use this in console to follow signup flow step-by-step
 */

type LogLevel = "info" | "success" | "warning" | "error" | "debug" | "step";

interface LogEntry {
	timestamp: string;
	level: LogLevel;
	stage: string;
	message: string;
	data?: Record<string, any>;
	duration?: number;
}

// Store logs for inspection via console
const logHistory: LogEntry[] = [];
const MAX_HISTORY = 500;

// Color codes for console
const COLORS = {
	info: "color: #3B82F6; font-weight: bold;", // Blue
	success: "color: #10B981; font-weight: bold;", // Green
	warning: "color: #F59E0B; font-weight: bold;", // Amber
	error: "color: #EF4444; font-weight: bold;", // Red
	debug: "color: #8B5CF6; font-weight: bold;", // Purple
	step: "color: #06B6D4; font-weight: bold;", // Cyan
	reset: "color: inherit;",
};

const EMOJIS = {
	info: "ℹ️",
	success: "✅",
	warning: "⚠️",
	error: "❌",
	debug: "🐛",
	step: "📍",
};

/**
 * Format data for console display
 */
function formatData(data?: Record<string, any>): string {
	if (!data || Object.keys(data).length === 0) return "";
	try {
		return JSON.stringify(data, null, 2);
	} catch {
		return String(data);
	}
}

/**
 * Main logging function
 */
function log(
	level: LogLevel,
	stage: string,
	message: string,
	data?: Record<string, any>,
	duration?: number,
): void {
	const timestamp = new Date().toISOString();
	const logEntry: LogEntry = {
		timestamp,
		level,
		stage,
		message,
		data,
		duration,
	};

	// Store in history
	logHistory.push(logEntry);
	if (logHistory.length > MAX_HISTORY) {
		logHistory.shift();
	}

	// Skip logging in production (unless explicitly needed)
	if (typeof window === "undefined" || process.env.NODE_ENV === "production") {
		return;
	}

	// Console output
	const emoji = EMOJIS[level];
	const color = COLORS[level];
	const prefix = `${emoji} [${timestamp}] [${stage}]`;
	const suffix = duration ? ` (${duration}ms)` : "";

	console.log(
		`%c${prefix}%c ${message}${suffix}`,
		color,
		COLORS.reset,
	);

	if (data && Object.keys(data).length > 0) {
		console.table(data);
	}
}

/**
 * Create a stage tracker for measuring performance
 */
class StageTracker {
	private stage: string;
	private startTime: number;

	constructor(stage: string) {
		this.stage = stage;
		this.startTime = performance.now();
		debugLogger.step(this.stage, "Starting...");
	}

	complete(message: string = "Complete", data?: Record<string, any>) {
		const duration = Math.round(performance.now() - this.startTime);
		debugLogger.success(this.stage, message, { ...data, duration_ms: duration }, duration);
	}

	error(message: string, error?: Error | Record<string, any>) {
		const duration = Math.round(performance.now() - this.startTime);
		const errorData = error instanceof Error
			? { message: error.message, stack: error.stack }
			: error;
		debugLogger.error(this.stage, message, { ...errorData, duration_ms: duration });
	}

	checkpoint(checkpointName: string, data?: Record<string, any>) {
		const duration = Math.round(performance.now() - this.startTime);
		debugLogger.debug(this.stage, `Checkpoint: ${checkpointName}`, { ...data, elapsed_ms: duration });
	}
}

/**
 * Public debug logger API
 */
export const debugLogger = {
	/**
	 * Info level - general information
	 */
	info(stage: string, message: string, data?: Record<string, any>) {
		log("info", stage, message, data);
	},

	/**
	 * Success level - successful operations
	 */
	success(
		stage: string,
		message: string,
		data?: Record<string, any>,
		duration?: number,
	) {
		log("success", stage, message, data, duration);
	},

	/**
	 * Warning level - potential issues
	 */
	warning(stage: string, message: string, data?: Record<string, any>) {
		log("warning", stage, message, data);
	},

	/**
	 * Error level - failures
	 */
	error(stage: string, message: string, data?: Record<string, any>) {
		log("error", stage, message, data);
	},

	/**
	 * Debug level - detailed debugging info
	 */
	debug(stage: string, message: string, data?: Record<string, any>) {
		log("debug", stage, message, data);
	},

	/**
	 * Step level - process steps (steps to follow)
	 */
	step(stage: string, message: string, data?: Record<string, any>) {
		log("step", stage, message, data);
	},

	/**
	 * Create a tracker for monitoring a multi-step process
	 */
	createTracker(stage: string): StageTracker {
		return new StageTracker(stage);
	},

	/**
	 * Get all logs for inspection
	 */
	getHistory(): LogEntry[] {
		return [...logHistory];
	},

	/**
	 * Get logs for a specific stage
	 */
	getStageHistory(stage: string): LogEntry[] {
		return logHistory.filter((log) => log.stage === stage);
	},

	/**
	 * Get logs for a specific level
	 */
	getLevelHistory(level: LogLevel): LogEntry[] {
		return logHistory.filter((log) => log.level === level);
	},

	/**
	 * Clear history
	 */
	clearHistory() {
		logHistory.length = 0;
	},

	/**
	 * Export history as JSON
	 */
	exportHistory(): string {
		return JSON.stringify(logHistory, null, 2);
	},

	/**
	 * Helper to log form validation
	 */
	logValidation(
		fieldName: string,
		isValid: boolean,
		value?: any,
		error?: string,
	) {
		const stage = "FORM_VALIDATION";
		if (isValid) {
			this.success(stage, `✓ ${fieldName} validated`, { value });
		} else {
			this.error(stage, `✗ ${fieldName} invalid`, { value, error });
		}
	},

	/**
	 * Helper to log API call
	 */
	logApiCall(
		endpoint: string,
		method: string = "GET",
		data?: Record<string, any>,
	) {
		const stage = "API_CALL";
		this.debug(stage, `${method} ${endpoint}`, data);
	},

	/**
	 * Helper to log API response
	 */
	logApiResponse(
		endpoint: string,
		status: number,
		data?: Record<string, any>,
		duration?: number,
	) {
		const stage = "API_RESPONSE";
		const level = status >= 200 && status < 300 ? "success" : "error";
		log(level, stage, `${endpoint} [${status}]`, data, duration);
	},

	/**
	 * Helper to log user action
	 */
	logUserAction(action: string, data?: Record<string, any>) {
		const stage = "USER_ACTION";
		this.info(stage, action, data);
	},
};

// Make available globally in development
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
	(window as any).debugLogger = debugLogger;
	console.log(
		"%c🔧 Debug Logger Loaded%c - Use window.debugLogger to access logs",
		"color: #10B981; font-weight: bold;",
		"color: inherit;",
	);
	console.log(
		"%cAvailable commands:%c",
		"color: #3B82F6; font-weight: bold;",
		"color: inherit;",
	);
	console.log("  • window.debugLogger.getHistory() - View all logs");
	console.log("  • window.debugLogger.getStageHistory('STAGE_NAME') - Filter by stage");
	console.log("  • window.debugLogger.getLevelHistory('error') - Filter by level");
	console.log("  • window.debugLogger.exportHistory() - Export as JSON");
	console.log("  • window.debugLogger.clearHistory() - Clear logs");
}

