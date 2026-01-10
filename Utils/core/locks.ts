import crypto from "node:crypto";
import { apiLogger } from "@/lib/api-logger";
import { getProductionRateLimiter } from "../production-rate-limiter";

interface RedisLockOptions {
	limiter?: ReturnType<typeof getProductionRateLimiter>;
	logger?: typeof apiLogger;
}

/**
 * Acquire a Redis-backed distributed lock before running the provided async function.
 * Falls back to executing without a lock if Redis is unavailable so critical work still proceeds.
 */
export async function withRedisLock<T>(
	key: string,
	ttlSeconds: number,
	fn: () => Promise<T>,
	options: RedisLockOptions = {},
): Promise<T | null> {
	const limiter = options.limiter ?? getProductionRateLimiter();
	const logger = options.logger ?? apiLogger;

	await limiter.initializeRedis();
	const redis = (limiter as any).redisClient;

	if (!redis) {
		logger.warn("Redis not available, proceeding without lock", { key });
		return fn();
	}

	const token = crypto.randomUUID();
	const lockKey = key;

	try {
		const acquired = await redis.set(lockKey, token, {
			NX: true,
			EX: ttlSeconds,
		});
		if (!acquired) {
			logger.debug(`Lock ${lockKey} already held, skipping operation`, {
				lockKey,
			});
			return null;
		}

		logger.debug(`Acquired lock ${lockKey}`, { lockKey, ttlSeconds });
		return await fn();
	} finally {
		try {
			const currentToken = await redis.get(lockKey);
			if (currentToken === token) {
				await redis.del(lockKey);
				logger.debug(`Released lock ${lockKey}`, { lockKey });
			}
		} catch (error) {
			logger.warn(`Failed to release lock ${lockKey}`, {
				lockKey,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}
