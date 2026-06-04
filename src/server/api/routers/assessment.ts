import * as z from "zod";
import { publicProcedure, router } from "../trpc";
import { db } from "@/lib/db";
import { runAssessment } from "@/lib/engine/assessment";
import {
  getCachedAssessment,
  setCachedAssessment,
} from "@/lib/engine/cache";

export const assessmentRouter = router({
  /**
   * Run the hybrid assessment engine for an existing building.
   */
  run: publicProcedure
    .input(
      z.object({
        buildingId: z.string(),
        dewaTariffAed: z.number().optional().default(0.32),
      }),
    )
    .mutation(async ({ input }) => {
      const { buildingId, dewaTariffAed } = input;

      // Check cache first (cache already returns a parsed object)
      const cached = await getCachedAssessment(buildingId);
      if (cached) {
        return cached;
      }

      // Load the building record
      const building = await db.building.findUnique({
        where: { id: buildingId },
      });

      if (!building) {
        throw new Error(`Building not found: ${buildingId}`);
      }

      // Run assessment engine — pass radius (3rd arg) and dewaTariff (4th arg)
      const result = await runAssessment(
        building.lat,
        building.lng,
        300,
        dewaTariffAed,
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          rawResponseJson: result.rawResponseJson as any,
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          rawResponseJson: result.rawResponseJson as any,
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
