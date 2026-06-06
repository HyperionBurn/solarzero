import * as z from "zod";
import { publicProcedure, protectedProcedure, router } from "../trpc";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { uploadProposalPdf } from "@/lib/storage/r2";

export const proposalRouter = router({
  /**
   * Generate a proposal PDF for a building's assessment.
   * Generates the PDF inline so production does not depend on BullMQ/Redis.
   */
  generate: protectedProcedure
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

      try {
        await db.proposal.update({
          where: { id: proposal.id },
          data: { status: "processing" },
        });

        const { generateProposalPdf } = await import("@/lib/pdf/generate");
        const pdfBuffer = await generateProposalPdf({
          proposalId: proposal.id,
          buildingName: building.name,
          buildingAddress: building.address,
          buildingType: building.buildingType ?? "commercial",
          roofAreaM2: building.roofAreaM2 ?? 0,
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
        const pdfUrl = await uploadProposalPdf(proposal.id, pdfBuffer);
        return await db.proposal.update({
          where: { id: proposal.id },
          data: {
            status: "ready",
            pdfUrl,
          },
        });
      } catch (err) {
        logger.error({ err, proposalId: proposal.id }, "Failed to generate proposal PDF");
        await db.proposal.update({
          where: { id: proposal.id },
          data: { status: "failed" },
        });
        throw new Error("Failed to generate proposal PDF. Please try again.");
      }
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
            select: { name: true, address: true, buildingType: true },
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
