import type { OSMElement, OSMResponse } from "./client";

export interface ParsedBuilding {
  name: string | null;
  roofAreaM2: number;
  buildingType: string;
  osmId: string;
  osmType: string;
  heightMeters: number | null;
}

export interface ParsedBuildingData {
  name: string | null;
  roofAreaM2: number;
  buildingType: string;
  osmId: string;
  osmType: string;
  lat: number;
  lng: number;
  heightMeters: number | null;
}

/**
 * Calculate polygon area in m² using the Shoelace formula.
 * Accepts coordinates and returns area in square meters.
 * Assumes coordinates are in lat/lng (WGS84) and uses an approximation
 * for area at the given latitude.
 */
function shoelaceArea(coords: { lat: number; lon: number }[]): number {
  const n = coords.length;
  if (n < 3) return 0;

  // Calculate average latitude for meter conversion factor
  const avgLat =
    coords.reduce((sum, c) => sum + c.lat, 0) / n;
  const latRad = (avgLat * Math.PI) / 180;
  // Meters per degree at this latitude
  const mPerDegLat = 111132.92 - 559.82 * Math.cos(2 * latRad)
    + 1.175 * Math.cos(4 * latRad) - 0.0023 * Math.cos(6 * latRad);
  const mPerDegLon =
    (111412.84 * Math.cos(latRad)) -
    (93.5 * Math.cos(3 * latRad)) +
    (0.118 * Math.cos(5 * latRad));

  // Convert to meters and apply Shoelace
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const xi = coords[i]!.lat * mPerDegLat;
    const yi = coords[i]!.lon * mPerDegLon;
    const xj = coords[j]!.lat * mPerDegLat;
    const yj = coords[j]!.lon * mPerDegLon;
    area += xi * yj - xj * yi;
  }

  return Math.abs(area) / 2;
}

/**
 * Collect all node coordinates from OSM elements.
 * For ways, resolves node IDs to lat/lng from the node elements.
 * For relations with simple geometry, uses the first outer way's nodes.
 */
function collectCoordinates(
  element: OSMElement,
  nodes: Map<number, { lat: number; lon: number }>,
): { lat: number; lon: number }[] {
  if (element.type === "way" && element.geometry) {
    return element.geometry.map((g) => ({ lat: g.lat, lon: g.lon }));
  }
  if (element.type === "way" && element.nodes) {
    return element.nodes
      .map((id) => nodes.get(id))
      .filter((n): n is { lat: number; lon: number } => n !== undefined);
  }
  if (element.type === "relation" && element.members) {
    // Find the first outer way member
    const outerWayMember = element.members.find(
      (m) => m.type === "way" && m.role === "outer",
    );
    if (outerWayMember && nodes.has(outerWayMember.ref)) {
      // We only have the ref, not coordinates — handled by the caller collecting way coords
      return [];
    }
    // Fallback: try all way members
    const wayMember = element.members.find((m) => m.type === "way");
    if (wayMember) {
      return [];
    }
  }
  return [];
}

/**
 * Extract a human-readable building type from OSM tags.
 */
function extractBuildingType(tags?: Record<string, string>): string {
  if (!tags) return "unknown";

  const buildingTag = tags["building"];
  if (!buildingTag || buildingTag === "yes") {
    // Try to infer from other tags
    if (tags["amenity"]) return tags["amenity"];
    if (tags["office"]) return "office";
    if (tags["shop"]) return "retail";
    if (tags["industrial"]) return "industrial";
    if (tags["warehouse"]) return "warehouse";
    if (tags["manufacture"]) return "industrial";
    if (tags["commercial"]) return "commercial";
    return "commercial"; // Default for UAE commercial buildings
  }

  // Normalize common OSM building values
  const normalized = buildingTag.toLowerCase();
  if (normalized === "apartments" || normalized === "residential") return "residential";
  if (normalized === "commercial" || normalized === "retail") return "commercial";
  if (normalized === "industrial" || normalized === "warehouse") return "industrial";
  if (normalized === "office") return "office";
  if (normalized === "school" || normalized === "university") return "education";
  if (normalized === "hospital" || normalized === "clinic") return "healthcare";
  if (normalized === "hotel") return "hotel";
  if (normalized === "hangar") return "hangar";
  // Map generic/uncommon OSM building types to more descriptive categories
  if (normalized === "roof") return "commercial";
  if (normalized === "shed") return "industrial";
  if (normalized === "garage" || normalized === "garages") return "commercial";
  if (normalized === "service") return "commercial";
  if (normalized === "construction") return "industrial";
  if (normalized === "static_caravan") return "residential";
  if (normalized === "cabin") return "residential";
  if (normalized === "hut") return "residential";

  return normalized;
}

function extractBuildingName(tags?: Record<string, string>): string | null {
  if (!tags) return null;

  const rawName =
    tags["name"] ||
    tags["official_name"] ||
    tags["short_name"] ||
    tags["name:en"] ||
    null;

  if (!rawName) return null;

  const name = rawName.trim().replace(/\s+/g, " ");
  if (!name) return null;

  const normalized = name.toLowerCase();
  const genericNames = new Set([
    "building",
    "commercial building",
    "office building",
    "residential building",
    "warehouse building",
    "retail building",
    "industrial building",
  ]);

  if (genericNames.has(normalized)) {
    return null;
  }

  return name;
}

/**
 * Parse OSM response to extract building footprint information.
 */
export function parseOSMBuilding(osmData: OSMResponse): ParsedBuilding | null {
  const elements = osmData.elements;
  if (!elements || elements.length === 0) return null;

  // Build a map of node IDs to coordinates
  const nodes = new Map<number, { lat: number; lon: number }>();
  for (const el of elements) {
    if (el.type === "node" && el.lat !== undefined && el.lon !== undefined) {
      nodes.set(el.id, { lat: el.lat, lon: el.lon });
    }
  }

  // Find the building element (way or relation)
  const buildingElements = elements.filter(
    (el) =>
      (el.type === "way" || el.type === "relation") && el.tags?.building,
  );

  if (buildingElements.length === 0) return null;

  // Prefer the largest building by footprint area
  let bestBuilding: OSMElement | null = null;
  let bestArea = 0;

  for (const el of buildingElements) {
    // For relations, also look at ways that are part of the relation
    let coords: { lat: number; lon: number }[] = [];

    if (el.type === "way") {
      coords = collectCoordinates(el, nodes);
    } else if (el.type === "relation") {
      // Find way members and aggregate their coordinates
      if (el.members) {
        for (const member of el.members) {
          if (member.type === "way") {
            const wayEl = elements.find(
              (e) => e.type === "way" && e.id === member.ref,
            );
            if (wayEl) {
              const wayCoords = collectCoordinates(wayEl, nodes);
              coords = coords.concat(wayCoords);
            }
          }
        }
      }
    }

    const area = shoelaceArea(coords);
    if (area > bestArea) {
      bestArea = area;
      bestBuilding = el;
    }
  }

  if (!bestBuilding) return null;

  const buildingType = extractBuildingType(bestBuilding.tags);
  const name = extractBuildingName(bestBuilding.tags);
  const heightStr = bestBuilding.tags?.["height"] || bestBuilding.tags?.["building:height"];
  const heightMeters = heightStr ? parseFloat(heightStr) : null;

  return {
    name,
    roofAreaM2: bestArea,
    buildingType,
    osmId: `${bestBuilding.type}/${bestBuilding.id}`,
    osmType: bestBuilding.type,
    heightMeters: heightMeters && !isNaN(heightMeters) ? heightMeters : null,
  };
}

/**
 * Parse all buildings from an OSM response, returning an array with centroids.
 * Unlike parseOSMBuilding which returns only the largest building,
 * this function returns every building element found.
 */
export function parseOSMBuildings(osmData: OSMResponse): ParsedBuildingData[] {
  const elements = osmData.elements;
  if (!elements || elements.length === 0) return [];

  // Build a map of node IDs to coordinates
  const nodes = new Map<number, { lat: number; lon: number }>();
  for (const el of elements) {
    if (el.type === "node" && el.lat !== undefined && el.lon !== undefined) {
      nodes.set(el.id, { lat: el.lat, lon: el.lon });
    }
  }

  // Find all building elements (ways and relations with building tags)
  const buildingElements = elements.filter(
    (el) =>
      (el.type === "way" || el.type === "relation") && el.tags?.building,
  );

  const results: ParsedBuildingData[] = [];

  for (const el of buildingElements) {
    let coords: { lat: number; lon: number }[] = [];

    if (el.type === "way") {
      coords = collectCoordinates(el, nodes);
    } else if (el.type === "relation") {
      if (el.members) {
        for (const member of el.members) {
          if (member.type === "way") {
            const wayEl = elements.find(
              (e) => e.type === "way" && e.id === member.ref,
            );
            if (wayEl) {
              const wayCoords = collectCoordinates(wayEl, nodes);
              coords = coords.concat(wayCoords);
            }
          }
        }
      }
    }

    if (coords.length < 3) continue;

    const area = shoelaceArea(coords);
    if (area < 1) continue; // skip tiny buildings / artifacts

    // Compute centroid as simple average of coordinates
    const centroidLat = coords.reduce((s, c) => s + c.lat, 0) / coords.length;
    const centroidLng = coords.reduce((s, c) => s + c.lon, 0) / coords.length;

    const buildingType = extractBuildingType(el.tags);
    const name = extractBuildingName(el.tags);
    const heightStr = el.tags?.["height"] || el.tags?.["building:height"];
    const heightMeters = heightStr ? parseFloat(heightStr) : null;

    results.push({
      name,
      roofAreaM2: area,
      buildingType,
      osmId: `${el.type}/${el.id}`,
      osmType: el.type,
      lat: centroidLat,
      lng: centroidLng,
      heightMeters: heightMeters && !isNaN(heightMeters) ? heightMeters : null,
    });
  }

  return results;
}
