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

  // redis is ioredis (TCP), @upstash/ratelimit expects @upstash/redis (HTTP).
  // These are structurally incompatible in TS, but ioredis works at runtime.
  // The redisIsMock guard above ensures mock is never passed here.
  type UpstashRedis = {
    evalsha<TArgs extends unknown[], TData = unknown>(sha1: string, keys: string[], args: TArgs): Promise<TData>;
    get<TData = unknown>(key: string): Promise<TData | null>;
    set<TData>(key: string, value: TData): Promise<"OK" | TData | null>;
  };
  return new Ratelimit({
    redis: redis as unknown as UpstashRedis,
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
