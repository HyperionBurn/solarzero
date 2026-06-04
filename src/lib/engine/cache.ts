import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";
import type { OSMResponse } from "@/lib/osm/client";

const TTL_OSM = 7 * 24 * 60 * 60; // 7 days
const TTL_SOLCAST = 30 * 24 * 60 * 60; // 30 days
const TTL_ASSESSMENT = 24 * 60 * 60; // 24 hours

// ─── OSM Cache ────────────────────────────────────────────

export async function getCachedOSM(
  lat: number,
  lng: number,
): Promise<OSMResponse | null> {
  try {
    const key = `osm:${lat}:${lng}`;
    const cached = await redis.get(key);
    if (!cached) return null;
    return JSON.parse(cached) as OSMResponse;
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
    if (!cached) return null;
    return parseFloat(cached);
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

export async function getCachedAssessment(
  buildingId: string,
): Promise<Record<string, unknown> | null> {
  try {
    const key = `assessment:${buildingId}`;
    const cached = await redis.get(key);
    if (!cached) return null;
    return JSON.parse(cached) as Record<string, unknown>;
  } catch (err) {
    logger.warn({ err }, "Redis getCachedAssessment error");
    return null;
  }
}

export async function setCachedAssessment(
  buildingId: string,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const key = `assessment:${buildingId}`;
    await redis.setex(key, TTL_ASSESSMENT, JSON.stringify(data));
  } catch (err) {
    logger.warn({ err }, "Redis setCachedAssessment error");
  }
}
