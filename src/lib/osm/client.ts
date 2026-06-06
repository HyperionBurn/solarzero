const OVERPASS_URL =
  process.env.OVERPASS_API_URL || "https://overpass-api.de/api/interpreter";

const OSM_TIMEOUT_MS = 25_000;
const OSM_MAX_RETRIES = 2;

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

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = OSM_MAX_RETRIES,
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), OSM_TIMEOUT_MS);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        if (response.ok) return response;
        if ((response.status === 429 || response.status >= 500) && attempt < retries) {
          const delay = response.status === 429 ? 1000 : 500;
          await new Promise((r) => setTimeout(r, delay * (attempt + 1)));
          continue;
        }
        throw new Error(`OSM API returned ${response.status}: ${response.statusText}`);
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

export async function queryBuildingsAround(
  lat: number,
  lng: number,
  radius: number = 100,
): Promise<OSMResponse> {
  const query = `[out:json][timeout:15];(way["building"](around:${radius},${lat},${lng});relation["building"](around:${radius},${lat},${lng}););out body;>;out skel qt;`;

  const response = await fetchWithRetry(OVERPASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "SolarZero/1.0 (UAE Solar Assessment Tool; contact@positivezero.com)",
    },
    body: new URLSearchParams({ data: query }),
  });

  return response.json() as Promise<OSMResponse>;
}

export async function queryBuildingsInBbox(
  south: number,
  west: number,
  north: number,
  east: number,
): Promise<OSMResponse> {
  const query = `[out:json][timeout:15];(way["building"](${south},${west},${north},${east});relation["building"](${south},${west},${north},${east}););out body;>;out skel qt;`;

  const response = await fetchWithRetry(OVERPASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "SolarZero/1.0 (UAE Solar Assessment Tool; contact@positivezero.com)",
    },
    body: new URLSearchParams({ data: query }),
  });

  return response.json() as Promise<OSMResponse>;
}

export async function queryBuildingByOsmElement(
  osmType: "way" | "relation",
  osmId: number,
): Promise<OSMResponse> {
  const query = `[out:json][timeout:15];(${osmType}(${osmId}););out body;>;out skel qt;`;

  const response = await fetchWithRetry(OVERPASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "SolarZero/1.0 (UAE Solar Assessment Tool; contact@positivezero.com)",
    },
    body: new URLSearchParams({ data: query }),
  });

  return response.json() as Promise<OSMResponse>;
}
