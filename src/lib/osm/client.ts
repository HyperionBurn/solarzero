import { cleanEnvValue } from "../env";

const OVERPASS_URL =
  cleanEnvValue(process.env.OVERPASS_API_URL) ||
  "https://overpass-api.de/api/interpreter";

const OSM_TIMEOUT_MS = 25_000;

export interface OSMResponse {
  version: number;
  generator: string;
  osm3s: {
    timestamp_osm_base: string;
    copyright: string;
  };
  elements: OSMElement[];
}

export interface OSMElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  nodes?: number[];
  members?: {
    type: "node" | "way" | "relation";
    ref: number;
    role: string;
  }[];
  tags?: Record<string, string>;
  geometry?: { lat: number; lon: number }[];
}

export async function queryBuildingsAround(
  lat: number,
  lng: number,
  radius: number = 100,
): Promise<OSMResponse> {
  const query = `[out:json][timeout:15];(way["building"](around:${radius},${lat},${lng});relation["building"](around:${radius},${lat},${lng}););out body;>;out skel qt;`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OSM_TIMEOUT_MS);

  try {
    const response = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "SolarZero/1.0 (UAE Solar Assessment Tool; contact@positivezero.com)",
      },
      body: new URLSearchParams({ data: query }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `OSM API returned ${response.status}: ${response.statusText}`,
      );
    }

    return response.json() as Promise<OSMResponse>;
  } finally {
    clearTimeout(timeout);
  }
}
