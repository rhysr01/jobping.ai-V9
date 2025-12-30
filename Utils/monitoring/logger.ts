/**
 * Structured Logging System
 * Provides consistent, structured logging across the application
 */

export interface LogEntry {
	timestamp: string;
	level: "debug" | "info" | "warn" | "error";
	message: string;
	component?: string;
	userId?: string;
	requestId?: string;
	metadata?: any;
	error?: {
		name: string;
		message: string;
		stack?: string;
	};
}

export class Logger {
	private component: string;
	private minLevel: "debug" | "info" | "warn" | "error";
	private userId?: string;
	private requestId?: string;

	constructor(component: string) {
		this.component = component;
		this.minLevel = (process.env.LOG_LEVEL as any) || "info";
	}

	setUserId(userId: string): void {
		this.userId = userId;
	}

	setRequestId(requestId: string): void {
		this.requestId = requestId;
	}

	public shouldLog(level: LogEntry["level"]): boolean {
		const levels = ["debug", "info", "warn", "error"];
		const currentLevelIndex = levels.indexOf(this.minLevel);
		const logLevelIndex = levels.indexOf(level);
		return logLevelIndex >= currentLevelIndex;
	}

	public formatLogEntry(entry: LogEntry): string {
		const {
			timestamp,
			level,
			message,
			component,
			userId,
			requestId,
			metadata,
			error,
		} = entry;

		let logLine = `[${timestamp}] ${level.toUpperCase()} ${component}: ${message}`;

		if (userId) logLine += ` user=${userId}`;
		if (requestId) logLine += ` req=${requestId}`;

		if (metadata) {
			try {
				logLine += ` metadata=${JSON.stringify(metadata)}`;
			} catch (_error) {
				logLine += ` metadata=[Circular Reference]`;
			}
		}

		if (error) {
			logLine += ` error=${error.name}: ${error.message}`;
			if (error.stack && this.minLevel === "debug") {
				logLine += `\n${error.stack}`;
			}
		}

		return logLine;
	}

	public log(
		level: LogEntry["level"],
		message: string,
		metadata?: any,
		error?: Error,
	): void {
		if (!this.shouldLog(level)) return;

		const entry: LogEntry = {
			timestamp: new Date().toISOString(),
			level,
			message,
			component: this.component,
			userId: this.userId,
			requestId: this.requestId,
			metadata,
			error: error
				? {
						name: error.name,
						message: error.message,
						stack: error.stack,
					}
				: undefined,
		};

		const formattedLog = this.formatLogEntry(entry);

		// Use appropriate console method
		switch (level) {
			case "debug":
				console.debug(formattedLog);
				break;
			case "info":
				console.info(formattedLog);
				break;
			case "warn":
				console.warn(formattedLog);
				break;
			case "error":
				console.error(formattedLog);
				break;
		}

		// In production, you might want to send logs to a logging service
		if (process.env.NODE_ENV === "production") {
			// NOTE: Production logging service integration not yet implemented
		}
	}

	debug(message: string, metadata?: any): void {
		this.log("debug", message, metadata);
	}

	info(message: string, metadata?: any): void {
		this.log("info", message, metadata);
	}

	warn(message: string, metadata?: any): void {
		this.log("warn", message, metadata);
	}

	error(message: string, error?: Error, metadata?: any): void {
		this.log("error", message, metadata, error);
	}

	// Convenience methods for common scenarios
	apiRequest(
		method: string,
		path: string,
		statusCode: number,
		duration: number,
		requestId?: string,
	): void {
		this.info(`${method} ${path}`, {
			type: "api_request",
			method,
			path,
			status_code: statusCode,
			duration_ms: duration,
			request_id: requestId,
		});
	}

	apiError(
		method: string,
		path: string,
		error: Error,
		requestId?: string,
	): void {
		this.error(`${method} ${path} failed`, error, {
			type: "api_error",
			method,
			path,
			request_id: requestId,
		});
	}

	databaseQuery(query: string, duration: number, rowCount?: number): void {
		this.debug(`Database query executed`, {
			type: "database_query",
			query: query.substring(0, 100) + (query.length > 100 ? "..." : ""),
			duration_ms: duration,
			row_count: rowCount,
		});
	}

	databaseError(query: string, error: Error): void {
		this.error(`Database query failed`, error, {
			type: "database_error",
			query: query.substring(0, 100) + (query.length > 100 ? "..." : ""),
		});
	}

	emailSent(
		to: string,
		subject: string,
		success: boolean,
		duration?: number,
	): void {
		const level = success ? "info" : "error";
		this.log(level, `Email ${success ? "sent" : "failed"}`, {
			type: "email",
			to,
			subject,
			success,
			duration_ms: duration,
		});
	}

	queueJob(
		jobType: string,
		jobId: string,
		status: string,
		duration?: number,
	): void {
		this.info(`Queue job ${status}`, {
			type: "queue_job",
			job_type: jobType,
			job_id: jobId,
			status,
			duration_ms: duration,
		});
	}

	userAction(userId: string, action: string, metadata?: any): void {
		this.info(`User action: ${action}`, {
			type: "user_action",
			user_id: userId,
			action,
			...metadata,
		});
	}

	performance(operation: string, duration: number, metadata?: any): void {
		this.info(`Performance: ${operation}`, {
			type: "performance",
			operation,
			duration_ms: duration,
			...metadata,
		});
	}

	security(
		event: string,
		severity: "low" | "medium" | "high" | "critical",
		metadata?: any,
	): void {
		const level =
			severity === "critical" ? "error" : severity === "high" ? "warn" : "info";
		this.log(level, `Security event: ${event}`, {
			type: "security",
			event,
			severity,
			...metadata,
		});
	}
}

// Create logger instances for different components
export const logger = new Logger("app");
export const apiLogger = new Logger("api");
export const dbLogger = new Logger("database");
export const emailLogger = new Logger("email");
export const queueLogger = new Logger("queue");
export const authLogger = new Logger("auth");
export const monitoringLogger = new Logger("monitoring");

// Utility function to create request-scoped logger
export function createRequestLogger(
	component: string,
	requestId: string,
): Logger {
	const requestLogger = new Logger(component);

	// Override the log method to include requestId
	requestLogger.log = (
		level: LogEntry["level"],
		message: string,
		metadata?: any,
		error?: Error,
	) => {
		const entry: LogEntry = {
			timestamp: new Date().toISOString(),
			level,
			message,
			component,
			requestId,
			metadata,
			error: error
				? {
						name: error.name,
						message: error.message,
						stack: error.stack,
					}
				: undefined,
		};

		if (!requestLogger.shouldLog(level)) return;

		const formattedLog = requestLogger.formatLogEntry(entry);

		switch (level) {
			case "debug":
				console.debug(formattedLog);
				break;
			case "info":
				console.info(formattedLog);
				break;
			case "warn":
				console.warn(formattedLog);
				break;
			case "error":
				console.error(formattedLog);
				break;
		}
	};

	return requestLogger;
}
