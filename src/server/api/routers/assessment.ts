import * as z from "zod";
import { publicProcedure, protectedProcedure, router } from "../trpc";
import { db } from "@/lib/db";
import { runAssessment } from "@/lib/engine/assessment";
import { getEmirateConfig } from "@/lib/regulatory/emirates";
import {
  getCachedAssessment,
  setCachedAssessment,
} from "@/lib/engine/cache";
import type { Prisma } from "@prisma/client";

export const assessmentRouter = router({
  /**
   * Run the hybrid assessment engine for an existing building.
   */
  run: protectedProcedure
    .input(
      z.object({
        buildingId: z.string(),
        dewaTariffAed: z.number().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { buildingId, dewaTariffAed } = input;

      // Load the building record
      const building = await db.building.findUnique({
        where: { id: buildingId },
      });

      if (!building) {
        throw new Error(`Building not found: ${buildingId}`);
      }

      const emirate = getEmirateConfig(building.lat, building.lng);
      const effectiveTariffAed = dewaTariffAed ?? emirate.tariffSlabs[0]?.rate ?? 0.32;

      // Check cache after loading the building so we can verify it still matches
      // the stored footprint instead of returning a stale OSM-derived result.
      const cached = await getCachedAssessment(buildingId);
      if (cached && isAssessmentCacheCurrent(cached, building)) {
        return cached;
      }

      // Run assessment engine using the stored building footprint as the source of truth.
      const result = await runAssessment(
        building.lat,
        building.lng,
        300,
        effectiveTariffAed,
        {
          roofAreaM2: building.roofAreaM2,
          buildingType: building.buildingType,
          osmId: building.osmId,
          osmType: building.osmType,
          heightMeters: building.heightMeters,
        },
      );

      if (!result) {
        throw new Error(
          `Assessment failed for building ${buildingId}`,
        );
      }

      // Persist assessment to DB
      const assessment = await db.assessment.upsert({
        where: { buildingId },
        create: {
          buildingId,
          dataSource: result.dataSource,
          ghiAnnual: result.ghiAnnual,
          systemSizeKwp: result.systemSizeKwp,
          panelCount: result.panelCount,
          annualProduction: result.annualProductionKwh,
          totalCostAed: result.totalCostAed,
          annualSavingsAed: result.annualSavingsAed,
          paybackYears: result.paybackYears,
          npv25yrAed: result.npv25yrAed,
          co2OffsetTons: result.co2OffsetTons,
          dewaTariffAed: result.dewaTariffAed,
          rawResponseJson: result.rawResponseJson as Prisma.InputJsonValue,
        },
        update: {
          dataSource: result.dataSource,
          ghiAnnual: result.ghiAnnual,
          systemSizeKwp: result.systemSizeKwp,
          panelCount: result.panelCount,
          annualProduction: result.annualProductionKwh,
          totalCostAed: result.totalCostAed,
          annualSavingsAed: result.annualSavingsAed,
          paybackYears: result.paybackYears,
          npv25yrAed: result.npv25yrAed,
          co2OffsetTons: result.co2OffsetTons,
          dewaTariffAed: result.dewaTariffAed,
          rawResponseJson: result.rawResponseJson as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });

      // Cache the result (pass as object, cache will stringify)
      await setCachedAssessment(buildingId, assessment as unknown as Record<string, unknown>);

      return assessment;
    }),

  /**
   * Get the assessment for a specific building.
   */
  getByBuilding: publicProcedure
    .input(
      z.object({
        buildingId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const assessment = await db.assessment.findUnique({
        where: { buildingId: input.buildingId },
      });

      return assessment;
    }),

  /**
   * Get recent assessment history.
   */
  getHistory: publicProcedure
    .input(
      z.object({
        limit: z.number().optional().default(10),
      }),
    )
    .query(async ({ input }) => {
      const assessments = await db.assessment.findMany({
        orderBy: { createdAt: "desc" },
        take: input.limit,
        include: {
          building: {
            select: {
              address: true,
              lat: true,
              lng: true,
              buildingType: true,
            },
          },
        },
      });

      return assessments;
  }),
});

function isAssessmentCacheCurrent(
  cached: Record<string, unknown>,
  building: {
    roofAreaM2: number | null;
    osmId: string | null;
    osmType: string | null;
    buildingType: string | null;
  },
): boolean {
  const cachedRoofArea = typeof cached.roofAreaM2 === "number" ? cached.roofAreaM2 : null;
  const buildingRoofArea = typeof building.roofAreaM2 === "number" ? building.roofAreaM2 : null;

  if (cachedRoofArea === null || buildingRoofArea === null) {
    return false;
  }

  if (Math.abs(cachedRoofArea - buildingRoofArea) > 0.5) {
    return false;
  }

  if (building.osmId) {
    if (typeof cached.osmId !== "string" || cached.osmId !== building.osmId) {
      return false;
    }
  }

  if (building.osmType) {
    if (typeof cached.osmType !== "string" || cached.osmType !== building.osmType) {
      return false;
    }
  }

  if (building.buildingType) {
    if (typeof cached.buildingType !== "string" || cached.buildingType !== building.buildingType) {
      return false;
    }
  }

  return true;
}
