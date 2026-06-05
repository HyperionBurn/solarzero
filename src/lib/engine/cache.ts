import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";
import type { OSMResponse } from "@/lib/osm/client";

const TTL_OSM = 7 * 24 * 60 * 60; // 7 days
const TTL_SOLCAST = 30 * 24 * 60 * 60; // 30 days
const TTL_ASSESSMENT = 24 * 60 * 60; // 24 hours

function decodeJsonCache<T>(value: unknown): T | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch (err) {
      logger.warn({ err }, "Failed to parse cached JSON value");
      return null;
    }
  }

  if (typeof value === "object") {
    return value as T;
  }

  return null;
}

function decodeNumberCache(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

// ─── OSM Cache ────────────────────────────────────────────

export async function getCachedOSM(
  lat: number,
  lng: number,
): Promise<OSMResponse | null> {
  try {
    const key = `osm:${lat}:${lng}`;
    const cached = await redis.get(key);
    return decodeJsonCache<OSMResponse>(cached);
  } catch (err) {
    logger.warn({ err }, "Redis getCachedOSM error");
    return null;
  }
}

export async function setCachedOSM(
  lat: number,
  lng: number,
  data: OSMResponse,
): Promise<void> {
  try {
    const key = `osm:${lat}:${lng}`;
    await redis.setex(key, TTL_OSM, JSON.stringify(data));
  } catch (err) {
    logger.warn({ err }, "Redis setCachedOSM error");
  }
}

// ─── Solcast Cache ────────────────────────────────────────

export async function getCachedSolcast(
  lat: number,
  lng: number,
): Promise<number | null> {
  try {
    const key = `solcast:${lat}:${lng}`;
    const cached = await redis.get(key);
    return decodeNumberCache(cached);
  } catch (err) {
    logger.warn({ err }, "Redis getCachedSolcast error");
    return null;
  }
}

export async function setCachedSolcast(
  lat: number,
  lng: number,
  data: number,
): Promise<void> {
  try {
    const key = `solcast:${lat}:${lng}`;
    await redis.setex(key, TTL_SOLCAST, data.toString());
  } catch (err) {
    logger.warn({ err }, "Redis setCachedSolcast error");
  }
}

// ─── Assessment Cache ─────────────────────────────────────

export async function getCachedAssessment<T = Record<string, unknown>>(
  buildingId: string,
): Promise<T | null> {
  try {
    const key = `assessment:${buildingId}`;
    const cached = await redis.get(key);
    return decodeJsonCache<T>(cached);
  } catch (err) {
    logger.warn({ err }, "Redis getCachedAssessment error");
    return null;
  }
}

export async function setCachedAssessment(
  buildingId: string,
  data: unknown,
): Promise<void> {
  try {
    const key = `assessment:${buildingId}`;
    await redis.setex(key, TTL_ASSESSMENT, JSON.stringify(data));
  } catch (err) {
    logger.warn({ err }, "Redis setCachedAssessment error");
  }
}
