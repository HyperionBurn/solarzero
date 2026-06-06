import { Redis } from "@upstash/redis";
import { cleanEnvValue } from "./env";
import { logger } from "./logger";

type RedisLike = Redis;

let redisInstance: RedisLike;
let _isMock = false;

function createMockRedis(): RedisLike {
  return {
    get: () => Promise.resolve(null),
    set: () => Promise.resolve("OK"),
    setex: () => Promise.resolve("OK"),
    del: () => Promise.resolve(0),
    evalsha: () => Promise.resolve(null as never),
    ping: () => Promise.resolve("PONG"),
  } as unknown as RedisLike;
}

export function parseRedisSocketUrl(url: string, defaultToken?: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const restUrl = `https://${host}`;

    let token = defaultToken || "";
    if (parsed.password) {
      token = parsed.password;
    } else if (parsed.username && parsed.username !== "default") {
      token = parsed.username;
    }

    return { url: restUrl, token };
  } catch (err) {
    logger.warn({ err, url }, "Failed to parse legacy Redis socket URL");
    return { url: null, token: null };
  }
}

function getRedisConfig() {
  let url =
    cleanEnvValue(process.env.UPSTASH_REDIS_REST_URL) ||
    cleanEnvValue(process.env.KV_REST_API_URL);
  let token =
    cleanEnvValue(process.env.UPSTASH_REDIS_REST_TOKEN) ||
    cleanEnvValue(process.env.KV_REST_API_TOKEN);

  if (!url) {
    const legacyUrl = cleanEnvValue(process.env.UPSTASH_REDIS_URL);
    const legacyToken = cleanEnvValue(process.env.UPSTASH_REDIS_TOKEN);

    if (legacyUrl) {
      if (legacyUrl.startsWith("redis://") || legacyUrl.startsWith("rediss://")) {
        const parsed = parseRedisSocketUrl(legacyUrl, legacyToken);
        if (parsed.url && parsed.token) {
          url = parsed.url;
          token = parsed.token;
        }
      } else if (legacyUrl.startsWith("https://") || legacyUrl.startsWith("http://")) {
        url = legacyUrl;
        token = legacyToken || token;
      }
    }
  }

  return { url, token };
}

function getRedis() {
  if (redisInstance) return redisInstance;

  const { url, token } = getRedisConfig();
  if (!url || !token) {
    redisInstance = createMockRedis();
    _isMock = true;
    return redisInstance;
  }

  try {
    redisInstance = new Redis({
      url,
      token,
    });
  } catch (err) {
    logger.warn({ err }, "Failed to initialize Redis, using mock");
    redisInstance = createMockRedis();
    _isMock = true;
  }

  return redisInstance;
}

export const redis = getRedis();
export const redisIsMock = _isMock;
