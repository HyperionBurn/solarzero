import { db } from "@/lib/db";
import { queryBuildingsAround } from "@/lib/osm/client";
import type { OSMResponse } from "@/lib/osm/client";
import { parseOSMBuildings } from "@/lib/osm/parser";
import { getEmirateConfig } from "@/lib/regulatory/emirates";

const UAE_LAT_MIN = 22.5;
const UAE_LAT_MAX = 26.5;
const UAE_LNG_MIN = 51.0;
const UAE_LNG_MAX = 57.0;

export function isWithinUAE(lat: number, lng: number): boolean {
  return lat >= UAE_LAT_MIN && lat <= UAE_LAT_MAX && lng >= UAE_LNG_MIN && lng <= UAE_LNG_MAX;
}

/** Map Dubai area codes to human-readable names using lat/lng zone boundaries */
export function getDubaiAreaName(lat: number, lng: number): string {
  if (lat >= 24.97 && lat <= 25.05 && lng >= 55.04 && lng <= 55.15) return "Jebel Ali";
  if (lat >= 25.18 && lat <= 25.25 && lng >= 55.27 && lng <= 55.33) return "Dubai Mall";
  if (lat >= 25.03 && lat <= 25.09 && lng >= 55.15 && lng <= 55.21) return "Dubai Investments Park";
  if (lat >= 25.20 && lat <= 25.28 && lng >= 55.32 && lng <= 55.42) return "Al Quoz";
  if (lat >= 25.10 && lat <= 25.18 && lng >= 55.33 && lng <= 55.45) return "Al Barsha";
  if (lat >= 25.08 && lat <= 25.16 && lng >= 55.15 && lng <= 55.27) return "Dubai Silicon Oasis";
  return "Dubai";
}

export class BuildingDiscoveryService {
  /**
   * Discovers buildings from OSM for an area and persists them.
   * Returns all buildings found (both newly created and existing).
   */
  static async discoverArea(lat: number, lng: number, radius = 200) {
    if (!isWithinUAE(lat, lng)) {
      throw new Error(
        `Coordinates (${lat}, ${lng}) are outside UAE bounds. SolarZero supports UAE locations only.`,
      );
    }

    const osmData: OSMResponse = await queryBuildingsAround(lat, lng, radius);
    const parsed = parseOSMBuildings(osmData);

    if (parsed.length === 0) return [];

    // Batch fetch existing buildings by osmId to avoid N+1
    const osmIds = parsed.map((b) => b.osmId);
    const existingBuildings = await db.building.findMany({
      where: { osmId: { in: osmIds } },
    });
    const existingByOsmId = new Map(existingBuildings.map((b) => [b.osmId, b]));

    const results = [];
    const toCreate: typeof parsed = [];
    for (const b of parsed) {
      const existing = existingByOsmId.get(b.osmId);
      if (existing) {
        results.push(existing);
      } else {
        toCreate.push(b);
      }
    }

    for (const b of toCreate) {
      const typeLabel = b.buildingType && b.buildingType !== "unknown" && b.buildingType !== "roof"
        ? b.buildingType.charAt(0).toUpperCase() + b.buildingType.slice(1)
        : "Commercial";
      const emirate = getEmirateConfig(b.lat, b.lng);
      const address = `${typeLabel} Building in ${getDubaiAreaName(b.lat, b.lng)}, ${emirate.name}`;
      const created = await db.building.create({
        data: {
          osmId: b.osmId,
          osmType: b.osmType,
          address,
          lat: b.lat,
          lng: b.lng,
          roofAreaM2: b.roofAreaM2,
          buildingType: b.buildingType,
          heightMeters: b.heightMeters ?? null,
        },
      });
      results.push(created);
    }
    return results;
  }
}
