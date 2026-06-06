import * as z from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { db } from "@/lib/db";
import { AutonomousDiscoveryService } from "../../services/autonomousDiscovery";
import { Prisma } from "@prisma/client";

export const campaignRouter = router({
  /**
   * List all campaigns with aggregated progress info.
   */
  list: publicProcedure.query(async () => {
    const campaigns = await db.scanCampaign.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            tiles: true,
            candidates: true,
          },
        },
        tiles: {
          select: {
            status: true,
            buildingsFound: true,
          },
        },
      },
    });

    // Decorate with status breakdowns
    return campaigns.map((c) => {
      const totalTiles = c._count.tiles;
      const completedTiles = c.tiles.filter((t) => t.status === "completed").length;
      const failedTiles = c.tiles.filter((t) => t.status === "failed").length;
      const runningTiles = c.tiles.filter((t) => t.status === "running").length;
      const pendingTiles = c.tiles.filter((t) => t.status === "pending").length;
      
      const totalBuildingsFound = c.tiles.reduce((sum, t) => sum + (t.buildingsFound ?? 0), 0);

      return {
        id: c.id,
        name: c.name,
        emirate: c.emirate,
        status: c.status,
        boundsJson: c.boundsJson,
        filtersJson: c.filtersJson,
        createdBy: c.createdBy,
        createdAt: c.createdAt,
        startedAt: c.startedAt,
        completedAt: c.completedAt,
        stats: {
          totalTiles,
          completedTiles,
          failedTiles,
          runningTiles,
          pendingTiles,
          candidatesCount: c._count.candidates,
          buildingsFound: totalBuildingsFound,
        },
      };
    });
  }),

  /**
   * Get a single campaign by ID.
   */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const campaign = await db.scanCampaign.findUnique({
        where: { id: input.id },
        include: {
          tiles: {
            orderBy: { createdAt: "asc" },
          },
          _count: {
            select: { candidates: true },
          },
        },
      });

      if (!campaign) {
        throw new Error(`Campaign not found: ${input.id}`);
      }

      return campaign;
    }),

  /**
   * Create a new draft campaign.
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        emirate: z.string().optional(),
        bounds: z.object({
          south: z.number(),
          north: z.number(),
          west: z.number(),
          east: z.number(),
        }),
        filters: z.object({
          minRoofArea: z.number().optional(),
        }).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const createdBy = ctx.session?.user?.email ?? "system";
      
      // Check coordinates inside UAE bounds (using bounds centroid)
      const lat = (input.bounds.south + input.bounds.north) / 2;
      const lng = (input.bounds.west + input.bounds.east) / 2;
      
      const UAE_LAT_MIN = 22.5;
      const UAE_LAT_MAX = 26.5;
      const UAE_LNG_MIN = 51.0;
      const UAE_LNG_MAX = 57.0;
      if (lat < UAE_LAT_MIN || lat > UAE_LAT_MAX || lng < UAE_LNG_MIN || lng > UAE_LNG_MAX) {
        throw new Error("Campaign center coordinates are outside UAE bounds.");
      }

      const campaign = await AutonomousDiscoveryService.createCampaign(
        input.name,
        input.emirate,
        input.bounds as Prisma.InputJsonValue,
        input.filters as Prisma.InputJsonValue,
        createdBy
      );

      return campaign;
    }),

  /**
   * Start a campaign (performs bounding box subdivision).
   */
  start: protectedProcedure
    .input(z.object({ id: z.string(), step: z.number().optional().default(0.005) }))
    .mutation(async ({ input }) => {
      return AutonomousDiscoveryService.startCampaign(input.id, input.step);
    }),

  /**
   * Pause a campaign.
   */
  pause: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return AutonomousDiscoveryService.pauseCampaign(input.id);
    }),

  /**
   * Resume a paused campaign.
   */
  resume: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return AutonomousDiscoveryService.resumeCampaign(input.id);
    }),
});
