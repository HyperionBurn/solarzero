import { logger } from "./logger";
import { optionalEnvValue } from "./env";

interface RedisLike {
  get<TData = string>(key: string): Promise<TData | null>;
  set(key: string, value: string | number | Buffer): Promise<"OK">;
  setex(key: string, seconds: number, value: string | number | Buffer): Promise<"OK">;
  del(...keys: string[]): Promise<number>;
  evalsha<TArgs extends unknown[], TData = unknown>(sha1: string, keys: string[], args: TArgs): Promise<TData | null>;
  ping(): Promise<string>;
  on(event: string, handler: (...args: unknown[]) => void): void;
  quit(): Promise<"OK">;
  disconnect(): void;
  status: string;
}

let redisInstance: RedisLike;

function createMockRedis(): RedisLike {
  return {
    get: () => Promise.resolve(null),
    set: () => Promise.resolve("OK" as const),
    setex: () => Promise.resolve("OK" as const),
    del: () => Promise.resolve(0),
    evalsha: () => Promise.resolve(null),
    ping: () => Promise.resolve("PONG"),
    on: () => {},
    quit: () => Promise.resolve("OK" as const),
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
    // Dynamic require is safe here: server-side runtime, ioredis lacks proper ESM.
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
