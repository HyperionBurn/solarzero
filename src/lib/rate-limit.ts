import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

/**
 * Rate limiter for login attempts.
 * 5 attempts per 60 seconds per IP.
 */
export const loginRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  analytics: true,
  prefix: "ratelimit:login",
});

/**
 * Rate limiter for registration attempts.
 * 3 attempts per 60 seconds per IP.
 */
export const registerRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "60 s"),
  analytics: true,
  prefix: "ratelimit:register",
});

/**
 * Rate limiter for general API usage.
 * 100 requests per 60 seconds per user/IP.
 */
export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "60 s"),
  analytics: true,
  prefix: "ratelimit:api",
});

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
