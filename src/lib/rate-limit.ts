import { Ratelimit } from "@upstash/ratelimit";
import { redis, redisIsMock } from "./redis";

type RateLimitResponse = {
  success: boolean;
  remaining: number;
};

const noopRateLimit = {
  limit: async (): Promise<RateLimitResponse> => ({
    success: true,
    remaining: Number.POSITIVE_INFINITY,
  }),
};

function createRateLimit(prefix: string, requests: number) {
  if (redisIsMock) return noopRateLimit;

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, "60 s"),
    analytics: true,
    prefix,
  });
}

/**
 * Rate limiter for login attempts.
 * 5 attempts per 60 seconds per IP.
 */
export const loginRateLimit = createRateLimit("ratelimit:login", 5);

/**
 * Rate limiter for registration attempts.
 * 3 attempts per 60 seconds per IP.
 */
export const registerRateLimit = createRateLimit("ratelimit:register", 3);

/**
 * Rate limiter for general API usage.
 * 100 requests per 60 seconds per user/IP.
 */
export const apiRateLimit = createRateLimit("ratelimit:api", 100);

/**
 * Get client identifier from request headers.
 * Falls back to a default if no identifying header is present.
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    headers.get("cf-connecting-ip") ??
    "unknown"
  );
}
