import * as z from "zod";
import { publicProcedure, protectedProcedure, router } from "../trpc";
import { db } from "@/lib/db";
import { queryBuildingsAround } from "@/lib/osm/client";
import type { OSMResponse } from "@/lib/osm/client";
import { parseOSMBuilding } from "@/lib/osm/parser";
import { getEmirateConfig } from "@/lib/regulatory/emirates";
import { BuildingDiscoveryService } from "../../services/buildingDiscovery";


const UAE_LAT_MIN = 22.5;
const UAE_LAT_MAX = 26.5;
const UAE_LNG_MIN = 51.0;
const UAE_LNG_MAX = 57.0;

function isWithinUAE(lat: number, lng: number): boolean {
  return lat >= UAE_LAT_MIN && lat <= UAE_LAT_MAX && lng >= UAE_LNG_MIN && lng <= UAE_LNG_MAX;
}

/** Map Dubai area codes to human-readable names using lat/lng zone boundaries */
function getDubaiAreaName(lat: number, lng: number): string {
  if (lat >= 24.97 && lat <= 25.05 && lng >= 55.04 && lng <= 55.15) return "Jebel Ali";
  if (lat >= 25.18 && lat <= 25.25 && lng >= 55.27 && lng <= 55.33) return "Dubai Mall";
  if (lat >= 25.03 && lat <= 25.09 && lng >= 55.15 && lng <= 55.21) return "Dubai Investments Park";
  if (lat >= 25.20 && lat <= 25.28 && lng >= 55.32 && lng <= 55.42) return "Al Quoz";
  if (lat >= 25.10 && lat <= 25.18 && lng >= 55.33 && lng <= 55.45) return "Al Barsha";
  if (lat >= 25.08 && lat <= 25.16 && lng >= 55.15 && lng <= 55.27) return "Dubai Silicon Oasis";
  return "Dubai";
}

export const buildingRouter = router({
  /**
   * Query OSM for a building at the given coordinates and persist it.
   */
  createFromOSM: protectedProcedure
    .input(
      z.object({
        lat: z.number(),
        lng: z.number(),
        radius: z.number().optional().default(300),
      }),
    )
    .mutation(async ({ input }) => {
      const { lat, lng, radius } = input;

      if (!isWithinUAE(lat, lng)) {
        throw new Error(
          `Coordinates (${lat}, ${lng}) are outside UAE bounds. SolarZero supports UAE locations only.`,
        );
      }

      // Query OSM
      const osmData: OSMResponse = await queryBuildingsAround(lat, lng, radius);
      const parsed = parseOSMBuilding(osmData);

      if (!parsed) {
        throw new Error(
          `No building found at lat=${lat}, lng=${lng} within ${radius}m radius`,
        );
      }

      const existingBuilding = await db.building.findFirst({
        where: { osmId: parsed.osmId },
      });
      if (existingBuilding) {
        return existingBuilding;
      }

      const emirate = getEmirateConfig(lat, lng);
      const address = `${emirate.name}, UAE (${lat.toFixed(5)}, ${lng.toFixed(5)})`;

      // Persist to database
      const building = await db.building.create({
        data: {
          osmId: parsed.osmId,
          osmType: parsed.osmType,
          address,
          lat,
          lng,
          roofAreaM2: parsed.roofAreaM2,
          buildingType: parsed.buildingType,
          heightMeters: parsed.heightMeters ?? null,
        },
      });

      return building;
    }),

  /**
   * Find an existing building by coordinates (approx match).
   */
  getByCoords: publicProcedure
    .input(
      z.object({
        lat: z.number(),
        lng: z.number(),
      }),
    )
    .query(async ({ input }) => {
      const { lat, lng } = input;

      const buildings = await db.building.findMany({
        where: {
          lat: { gte: lat - 0.001, lte: lat + 0.001 },
          lng: { gte: lng - 0.001, lte: lng + 0.001 },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      });

      return buildings[0] ?? null;
    }),

  /**
   * Search buildings by address.
   */
  search: publicProcedure
    .input(
      z.object({
        query: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const buildings = await db.building.findMany({
        where: {
          address: { contains: input.query, mode: "insensitive" },
        },
        take: 10,
        orderBy: { createdAt: "desc" },
      });

      return buildings;
    }),

  /**
   * Get a single building by ID.
   */
  getById: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const building = await db.building.findUnique({
        where: { id: input.id },
      });

      if (!building) {
        throw new Error(`Building not found: ${input.id}`);
      }

      return building;
    }),

  /**
   * Discover buildings from OSM for an area and persist them.
   * Returns all buildings found (both newly created and existing).
   */
  discoverArea: protectedProcedure
    .input(
      z.object({
        lat: z.number(),
        lng: z.number(),
        radius: z.number().optional().default(200),
      }),
    )
    .mutation(async ({ input }) => {
      const { lat, lng, radius } = input;
      return BuildingDiscoveryService.discoverArea(lat, lng, radius);
    }),


  /**
   * List buildings within a geographic bounding box.
   */
  list: publicProcedure
    .input(
      z.object({
        minLat: z.number(),
        maxLat: z.number(),
        minLng: z.number(),
        maxLng: z.number(),
        limit: z.number().optional().default(100),
      }),
    )
    .query(async ({ input }) => {
      const buildings = await db.building.findMany({
        where: {
          lat: { gte: input.minLat, lte: input.maxLat },
          lng: { gte: input.minLng, lte: input.maxLng },
        },
        take: input.limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          address: true,
          lat: true,
          lng: true,
          buildingType: true,
          roofAreaM2: true,
          assessment: {
            select: {
              id: true,
              systemSizeKwp: true,
              panelCount: true,
            },
          },
        },
      });

      return buildings;
    }),

  /**
   * Get emirate regulatory config for given coordinates.
   */
  getEmirateInfo: publicProcedure
    .input(
      z.object({
        lat: z.number(),
        lng: z.number(),
      }),
    )
    .query(({ input }) => {
      return getEmirateConfig(input.lat, input.lng);
    }),
});
