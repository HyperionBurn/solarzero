/* eslint-disable @typescript-eslint/no-explicit-any */
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

function getRedis() {
  if (redisInstance) return redisInstance;

  const url = process.env.UPSTASH_REDIS_URL;
  if (!url) {
    redisInstance = createMockRedis();
    return redisInstance;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Redis = require("ioredis");
    redisInstance = new Redis(url, {
      password: process.env.UPSTASH_REDIS_TOKEN,
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      retryStrategy: (times: number) => (times > 2 ? null : Math.min(times * 200, 1000)),
      lazyConnect: true,
    });
    redisInstance.on("error", (err: unknown) => {
      console.warn("Redis connection error:", err);
    });
  } catch {
    console.warn("Failed to initialize Redis, using mock");
    redisInstance = createMockRedis();
  }

  return redisInstance;
}

export const redis = getRedis();
