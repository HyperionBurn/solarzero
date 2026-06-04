import { logger } from "./logger";
import { optionalEnvValue } from "./env";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let redisInstance: any = null;

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

function getQueueRedis() {
  if (redisInstance) return redisInstance;

  const url = optionalEnvValue(process.env.UPSTASH_REDIS_URL);
  if (!url) {
    redisInstance = createMockRedis();
    return redisInstance;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Redis = require("ioredis");
    redisInstance = new Redis(url, {
      password: optionalEnvValue(process.env.UPSTASH_REDIS_TOKEN),
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      connectTimeout: 2_000,
      retryStrategy: (times: number) =>
        times > 2 ? null : Math.min(times * 200, 1000),
      lazyConnect: true,
    });
    redisInstance.on("error", (err: unknown) => {
      logger.warn({ err }, "Queue Redis connection error");
    });
  } catch (err) {
    logger.warn({ err }, "Failed to initialize queue Redis, using mock");
    redisInstance = createMockRedis();
  }

  return redisInstance;
}

export const queueRedis = getQueueRedis();
