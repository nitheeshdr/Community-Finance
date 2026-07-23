import { RateLimitEntryModel } from '../models/rate-limit-entry.model';
import { RateLimitError } from '../errors/app-error';

/**
 * MongoDB-backed fixed-window rate limiter. Atomic upsert + $inc keeps it
 * correct across concurrent serverless invocations without extra infra.
 * A TTL index on `expiresAt` garbage-collects old windows.
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<void> {
  const now = new Date();
  const windowStart = new Date(
    Math.floor(now.getTime() / (windowSeconds * 1000)) * windowSeconds * 1000
  );
  const expiresAt = new Date(windowStart.getTime() + windowSeconds * 1000 * 2);

  const entry = await RateLimitEntryModel.findOneAndUpdate(
    { key, windowStart },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
    { upsert: true, new: true }
  ).lean();

  if (entry.count > limit) {
    const retryAfter = Math.ceil(
      (windowStart.getTime() + windowSeconds * 1000 - now.getTime()) / 1000
    );
    throw new RateLimitError(undefined, Math.max(retryAfter, 1));
  }
}

/** Clear rate-limit state for a key prefix (used after successful login). */
export async function resetRateLimit(key: string): Promise<void> {
  await RateLimitEntryModel.deleteMany({ key });
}
