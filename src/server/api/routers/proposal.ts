import * as z from "zod";
import { publicProcedure, router } from "../trpc";
import { db } from "@/lib/db";
import { pdfQueue } from "@/lib/queue";

export const proposalRouter = router({
  /**
   * Generate a proposal PDF for a building's assessment.
   * Enqueues a BullMQ job and returns the proposal record.
   */
  generate: publicProcedure
    .input(
      z.object({
        buildingId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const { buildingId } = input;

      // Load building and assessment
      const building = await db.building.findUnique({
        where: { id: buildingId },
        include: { assessment: true },
      });

      if (!building) {
        throw new Error(`Building not found: ${buildingId}`);
      }

      if (!building.assessment) {
        throw new Error(`No assessment exists for building: ${buildingId}`);
      }

      // Check for existing proposal
      const existing = await db.proposal.findFirst({
        where: { buildingId, assessmentId: building.assessment.id },
        orderBy: { createdAt: "desc" },
      });

      if (existing && existing.status === "ready") {
        return existing;
      }

      // Create proposal record
      const proposal = await db.proposal.create({
        data: {
          assessmentId: building.assessment.id,
          buildingId,
          status: "pending",
          generatedBy: "system",
        },
      });

      // Enqueue PDF generation job
      try {
        await pdfQueue.add("generate-pdf", {
          proposalId: proposal.id,
          buildingId,
          assessmentId: building.assessment.id,
          buildingAddress: building.address,
          buildingType: building.buildingType,
          roofAreaM2: building.roofAreaM2,
          systemSizeKwp: building.assessment.systemSizeKwp,
          panelCount: building.assessment.panelCount,
          annualProduction: building.assessment.annualProduction,
          totalCostAed: building.assessment.totalCostAed,
          annualSavingsAed: building.assessment.annualSavingsAed,
          paybackYears: building.assessment.paybackYears,
          npv25yrAed: building.assessment.npv25yrAed,
          co2OffsetTons: building.assessment.co2OffsetTons,
          dewaTariffAed: building.assessment.dewaTariffAed,
          dataSource: building.assessment.dataSource,
          ghiAnnual: building.assessment.ghiAnnual,
        });
      } catch (err) {
        console.warn("Failed to enqueue PDF job, will generate inline:", err);
      }

      return proposal;
    }),

  /**
   * Get proposal by ID.
   */
  getById: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const proposal = await db.proposal.findUnique({
        where: { id: input.id },
        include: {
          building: {
            select: { address: true, buildingType: true },
          },
          assessment: {
            select: {
              systemSizeKwp: true,
              panelCount: true,
              annualProduction: true,
              totalCostAed: true,
            },
          },
        },
      });

      if (!proposal) {
        throw new Error(`Proposal not found: ${input.id}`);
      }

      return proposal;
    }),

  /**
   * Get proposal by building ID.
   */
  getByBuilding: publicProcedure
    .input(
      z.object({
        buildingId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const proposal = await db.proposal.findFirst({
        where: { buildingId: input.buildingId },
        orderBy: { createdAt: "desc" },
      });

      return proposal;
    }),
});