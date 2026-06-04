import { redis } from "@/lib/redis";
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
    console.warn("Redis getCachedOSM error:", err);
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
    console.warn("Redis setCachedOSM error:", err);
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
    console.warn("Redis getCachedSolcast error:", err);
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
    console.warn("Redis setCachedSolcast error:", err);
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
    console.warn("Redis getCachedAssessment error:", err);
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
    console.warn("Redis setCachedAssessment error:", err);
  }
}
