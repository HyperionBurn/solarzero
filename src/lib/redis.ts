import { logger } from "./logger";
import { cleanEnvValue } from "./env";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let redisInstance: any = null;
let _isMock = false;

function createMockRedis() {
  return {
    get: () => Promise.resolve(null),
    set: () => Promise.resolve("OK"),
    setex: () => Promise.resolve("OK"),
    del: () => Promise.resolve(0),
    ping: () => Promise.resolve("PONG"),
    on: () => {},
    quit: () => Promise.resolve("OK"),
    disconnect: () => {},
    status: "end",
  };
}

function getRedis() {
  if (redisInstance) return redisInstance;

  const url = cleanEnvValue(process.env.UPSTASH_REDIS_URL);
  const token = cleanEnvValue(process.env.UPSTASH_REDIS_TOKEN);

  if (!url) {
    redisInstance = createMockRedis();
    _isMock = true;
    return redisInstance;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Redis = require("ioredis");
    redisInstance = new Redis(url, {
      password: token || undefined,
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      retryStrategy: (times: number) => (times > 2 ? null : Math.min(times * 200, 1000)),
      lazyConnect: true,
    });
    redisInstance.on("error", (err: unknown) => {
      logger.warn({ err }, "Redis connection error");
    });
  } catch {
    logger.warn("Failed to initialize Redis, using mock");
    redisInstance = createMockRedis();
    _isMock = true;
  }

  return redisInstance;
}

export const redis = getRedis();
export const redisIsMock = _isMock;
