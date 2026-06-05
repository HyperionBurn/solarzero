import * as z from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { db } from "@/lib/db";
import { OpportunityService } from "../../services/opportunity";
import { BuildingDiscoveryService } from "../../services/buildingDiscovery";

export const opportunityRouter = router({
  /**
   * List opportunities with filters and pagination.
   */
  list: publicProcedure
    .input(
      z.object({
        scoreBand: z.array(z.string()).optional(),
        buildingType: z.array(z.string()).optional(),
        status: z.array(z.string()).optional(),
        assessed: z.boolean().optional(),
        minRoofArea: z.number().optional(),
        minNpv: z.number().optional(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }),
    )
    .query(async ({ input }) => {
      const { scoreBand, buildingType, status, assessed, minRoofArea, minNpv, limit, offset } = input;

      const where: any = {};

      if (scoreBand && scoreBand.length > 0) {
        where.scoreBand = { in: scoreBand };
      }

      if (status && status.length > 0) {
        where.status = { in: status };
      }

      // Filters targeting related Building
      const buildingWhere: any = {};
      if (buildingType && buildingType.length > 0) {
        buildingWhere.buildingType = { in: buildingType };
      }
      if (minRoofArea !== undefined) {
        buildingWhere.roofAreaM2 = { gte: minRoofArea };
      }

      // Filters targeting related Assessment
      if (assessed !== undefined) {
        if (assessed) {
          buildingWhere.assessment = { isNot: null };
        } else {
          buildingWhere.assessment = { is: null };
        }
      }

      if (minNpv !== undefined) {
        // If filtering by NPV, must have assessment
        buildingWhere.assessment = {
          isNot: null,
          npv25yrAed: { gte: minNpv },
        };
      }

      if (Object.keys(buildingWhere).length > 0) {
        where.building = buildingWhere;
      }

      const total = await db.opportunity.count({ where });

      const opportunities = await db.opportunity.findMany({
        where,
        include: {
          building: {
            include: {
              assessment: true,
            },
          },
        },
        orderBy: [
          { scoreTotal: "desc" },
          { createdAt: "desc" },
        ],
        take: limit,
        skip: offset,
      });

      return {
        total,
        opportunities,
      };
    }),

  /**
   * Get an opportunity by its ID.
   */
  getById: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const opportunity = await db.opportunity.findUnique({
        where: { id: input.id },
        include: {
          building: {
            include: {
              assessment: true,
            },
          },
          scores: {
            orderBy: { createdAt: "desc" },
          },
          evidence: {
            orderBy: { createdAt: "desc" },
          },
          notes: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!opportunity) {
        throw new Error(`Opportunity not found: ${input.id}`);
      }

      return opportunity;
    }),

  /**
   * Get an opportunity by its associated building ID.
   */
  getByBuildingId: publicProcedure
    .input(
      z.object({
        buildingId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const opportunity = await db.opportunity.findUnique({
        where: { buildingId: input.buildingId },
        include: {
          building: {
            include: {
              assessment: true,
            },
          },
          scores: {
            orderBy: { createdAt: "desc" },
          },
          evidence: {
            orderBy: { createdAt: "desc" },
          },
          notes: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      return opportunity;
    }),

  /**
   * Scans a geographic area for buildings, persists them, and generates scored opportunities.
   */
  scanArea: protectedProcedure
    .input(
      z.object({
        lat: z.number(),
        lng: z.number(),
        radius: z.number().optional().default(500),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { lat, lng, radius } = input;
      const createdBy = (ctx as any).session?.user?.email ?? "system";

      // Enforce bounds: max radius 2000m (2km)
      if (radius > 2000) {
        throw new Error("Maximum interactive scan radius is 2000m (2km).");
      }

      // Create InvestigationRun
      const run = await db.investigationRun.create({
        data: {
          name: `Scan near ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          centerLat: lat,
          centerLng: lng,
          radiusMeters: radius,
          status: "pending",
          createdBy,
        },
      });

      try {
        // Run OSM discovery (max 500 buildings handled by service chunking/Overpass parameters)
        const buildings = await BuildingDiscoveryService.discoverArea(lat, lng, radius);

        // Cap processing to 500 buildings for safety
        const selectedBuildings = buildings.slice(0, 500);

        let opportunitiesCreatedCount = 0;
        for (const building of selectedBuildings) {
          try {
            // Check if opportunity already exists
            const existingOpp = await db.opportunity.findUnique({
              where: { buildingId: building.id },
            });

            // Create or update opportunity
            const opportunity = await OpportunityService.ensureOpportunityForBuilding(building.id);

            // Log details in InvestigationRunBuilding
            await db.investigationRunBuilding.create({
              data: {
                investigationRunId: run.id,
                buildingId: building.id,
                opportunityId: opportunity.id,
                action: existingOpp ? "updated" : "created",
              },
            });

            if (!existingOpp) {
              opportunitiesCreatedCount++;
            }
          } catch (buildingErr) {
            console.error(`Failed to process building ${building.id} during scan run:`, buildingErr);
            await db.investigationRunBuilding.create({
              data: {
                investigationRunId: run.id,
                buildingId: building.id,
                action: "failed",
              },
            });
          }
        }

        // Complete the run successfully
        return await db.investigationRun.update({
          where: { id: run.id },
          data: {
            status: "completed",
            buildingsFound: buildings.length,
            opportunitiesCreated: opportunitiesCreatedCount,
            completedAt: new Date(),
          },
        });
      } catch (err: any) {
        // Complete the run with failure status
        console.error("Scan area failure:", err);
        return await db.investigationRun.update({
          where: { id: run.id },
          data: {
            status: "failed",
            error: err.message || "Unknown discovery failure",
            completedAt: new Date(),
          },
        });
      }
    }),

  /**
   * Rescores an opportunity.
   */
  rescore: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      return OpportunityService.rescoreOpportunity(input.id);
    }),

  /**
   * Adds solarization evidence and recalculates the opportunity score.
   */
  addSolarizationEvidence: protectedProcedure
    .input(
      z.object({
        opportunityId: z.string(),
        status: z.enum(["solar_present", "solar_absent", "unknown"]),
        source: z.enum(["manual", "imported", "osm", "vision"]),
        sourceUrl: z.string().optional(),
        confidence: z.number().min(0).max(1),
        notes: z.string().optional(),
        observedAt: z.date().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { opportunityId, status, source, sourceUrl, confidence, notes, observedAt } = input;
      const createdBy = (ctx as any).session?.user?.email ?? "system";

      // Create evidence
      await db.solarizationEvidence.create({
        data: {
          opportunityId,
          status,
          source,
          sourceUrl,
          confidence,
          notes,
          observedAt: observedAt ?? new Date(),
          createdBy,
        },
      });

      // Recalculate score
      return OpportunityService.rescoreOpportunity(opportunityId);
    }),

  /**
   * Updates status and priority of an opportunity.
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.string(),
        priority: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      return db.opportunity.update({
        where: { id: input.id },
        data: {
          status: input.status,
          priority: input.priority,
        },
      });
    }),

  /**
   * Adds a note to an opportunity.
   */
  addNote: protectedProcedure
    .input(
      z.object({
        opportunityId: z.string(),
        body: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const createdBy = (ctx as any).session?.user?.email ?? "system";
      return db.opportunityNote.create({
        data: {
          opportunityId: input.opportunityId,
          body: input.body,
          createdBy,
        },
      });
    }),

  /**
   * Get KPI stats for the opportunity dashboard.
   */
  getStats: publicProcedure.query(async () => {
    const total = await db.opportunity.count();
    const aGrade = await db.opportunity.count({
      where: { scoreBand: "A" },
    });
    const unassessed = await db.opportunity.count({
      where: {
        building: {
          assessment: null,
        },
      },
    });
    const verifySolar = await db.opportunity.count({
      where: {
        nextAction: "VERIFY_SOLARIZATION",
      },
    });
    const contacted = await db.opportunity.count({
      where: { status: "contacted" },
    });
    const rejected = await db.opportunity.count({
      where: { status: "rejected" },
    });

    return {
      total,
      aGrade,
      unassessed,
      verifySolar,
      contacted,
      rejected,
    };
  }),
});

