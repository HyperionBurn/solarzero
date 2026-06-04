let redisInstance: any = null;

function getRedis() {
  if (redisInstance) return redisInstance;

  const url = process.env.UPSTASH_REDIS_URL;
  if (!url) {
    redisInstance = {
      get: () => Promise.resolve(null),
      set: () => Promise.resolve("OK"),
      del: () => Promise.resolve(0),
      on: () => {},
      quit: () => Promise.resolve("OK"),
      disconnect: () => {},
      status: "end",
    };
    return redisInstance;
  }

  try {
    const Redis = require("ioredis");
    redisInstance = new Redis(url, {
      password: process.env.UPSTASH_REDIS_TOKEN,
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      retryStrategy: (times: number) => times > 2 ? null : Math.min(times * 200, 1000),
      lazyConnect: true,
    });
    redisInstance.on("error", () => {});
  } catch {
    redisInstance = {
      get: () => Promise.resolve(null), set: () => Promise.resolve("OK"),
      del: () => Promise.resolve(0), on: () => {}, quit: () => Promise.resolve("OK"),
      disconnect: () => {}, status: "end",
    };
  }

  return redisInstance;
}

export const redis = getRedis();
