import { Redis } from "@upstash/redis";
import { logger } from "./logger";
import { optionalEnvValue } from "./env";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let redisInstance: any = null;
let redisUsesMock = true;

function createMockRedis() {
  redisUsesMock = true;
  return {
    get: () => Promise.resolve(null),
    set: () => Promise.resolve("OK"),
    setex: () => Promise.resolve("OK"),
    del: () => Promise.resolve(0),
    ping: () => Promise.resolve("PONG"),
  };
}

function buildRestUrl(): string | undefined {
  const configuredRestUrl = optionalEnvValue(process.env.UPSTASH_REDIS_REST_URL);
  if (configuredRestUrl) return configuredRestUrl;

  const legacyUrl = optionalEnvValue(process.env.UPSTASH_REDIS_URL);
  if (!legacyUrl) return undefined;

  try {
    const parsed = new URL(legacyUrl);
    return `${parsed.protocol === "rediss:" ? "https:" : "http:"}//${parsed.hostname}`;
  } catch (err) {
    logger.warn({ err }, "Invalid Upstash Redis URL");
    return undefined;
  }
}

function buildToken(): string | undefined {
  return (
    optionalEnvValue(process.env.UPSTASH_REDIS_REST_TOKEN) ??
    optionalEnvValue(process.env.UPSTASH_REDIS_TOKEN)
  );
}

function getRedis() {
  if (redisInstance) return redisInstance;

  const url = buildRestUrl();
  const token = buildToken();
  if (!url || !token) {
    redisInstance = createMockRedis();
    return redisInstance;
  }

  try {
    redisInstance = new Redis({
      url,
      token,
      enableTelemetry: false,
    });
    redisUsesMock = false;
  } catch (err) {
    logger.warn({ err }, "Failed to initialize Upstash Redis, using mock");
    redisInstance = createMockRedis();
  }

  return redisInstance;
}

export const redis = getRedis();
export const redisIsMock = redisUsesMock;
