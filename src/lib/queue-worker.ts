import { Worker, Job } from "bullmq";
import { redis } from "./redis";
import { db } from "./db";
import { generateProposalPdf, type ProposalData } from "./pdf/generate";
import { uploadProposalPdf } from "./storage/r2";
import { logger } from "./logger";

interface PdfJobData extends ProposalData {}

const pdfWorker = new Worker(
  "pdf-generation",
  async (job: Job<PdfJobData>) => {
    const data = job.data;

    try {
      // Update proposal status to processing
      await db.proposal.update({
        where: { id: data.proposalId },
        data: { status: "processing" },
      });

      // Generate PDF
      const pdfBuffer = await generateProposalPdf(data);

      // Upload to R2
      const pdfUrl = await uploadProposalPdf(data.proposalId, pdfBuffer);

      // Update proposal with PDF URL and status
      await db.proposal.update({
        where: { id: data.proposalId },
        data: {
          status: "ready",
          pdfUrl,
        },
      });

      return { success: true, pdfUrl };
    } catch (error) {
      logger.error({ err: error, proposalId: data.proposalId }, "PDF generation failed");

      // Update proposal status to failed
      await db.proposal.update({
        where: { id: data.proposalId },
        data: { status: "failed" },
      });

      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 2,
    limiter: {
      max: 5,
      duration: 60_000,
    },
  }
);

const assessmentWorker = new Worker(
  "assessment",
  async (job: Job) => {
    // Assessment is currently done inline, this worker is a placeholder
    // for future async assessment processing
    return { status: "completed" };
  },
  {
    connection: redis,
    concurrency: 1,
  }
);

// Event handlers
pdfWorker.on("ready", () => {
  logger.info("PDF worker ready");
});

pdfWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "PDF job failed");
});

assessmentWorker.on("ready", () => {
  logger.info("Assessment worker ready");
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await pdfWorker.close();
  await assessmentWorker.close();
});
