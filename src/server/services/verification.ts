import { db } from "@/lib/db";

export class VerificationService {
  /**
   * Schedules a new verification task for an opportunity.
   */
  static async createVerificationTask(opportunityId: string, providerId: string, priority = 50) {
    return db.verificationTask.create({
      data: {
        opportunityId,
        providerId,
        status: "pending",
        priority,
      },
    });
  }

  /**
   * Completes a verification task and appends corresponding solarization evidence.
   */
  static async completeVerificationTask(taskId: string, result: { hasSolar: boolean; confidence: number; notes?: string }) {
    const task = await db.verificationTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new Error(`Verification task not found: ${taskId}`);
    }

    const completedTask = await db.verificationTask.update({
      where: { id: taskId },
      data: {
        status: "completed",
        resultJson: JSON.stringify(result),
        completedAt: new Date(),
      },
    });

    // Write consensus solarization evidence
    await db.solarizationEvidence.create({
      data: {
        opportunityId: task.opportunityId,
        status: result.hasSolar ? "solar_present" : "solar_absent",
        source: "manual",
        confidence: result.confidence,
        notes: `Verification Task ${task.providerId} completed. Notes: ${result.notes ?? "None"}`,
      },
    });

    // Re-score opportunity and re-compute rankings
    const opportunity = await db.opportunity.findUnique({
      where: { id: task.opportunityId },
    });
    if (opportunity) {
      const { OpportunityService } = await import("./opportunity");
      await OpportunityService.ensureOpportunityForBuilding(opportunity.buildingId);
      const { RankingService } = await import("./ranking");
      await RankingService.generateRankSnapshots();
    }

    return completedTask;
  }

  /**
   * Triggers automatic verification for high-priority unknown opportunities.
   */
  static async triggerAutoVerification(opportunityId: string) {
    const opportunity = await db.opportunity.findUnique({
      where: { id: opportunityId },
      include: {
        evidence: true,
        verificationTasks: true,
      },
    });

    if (!opportunity) return;

    const hasActiveTask = opportunity.verificationTasks.some(t => t.status === "pending");
    if (!hasActiveTask && opportunity.scoreBand === "A" && opportunity.evidence.length === 0) {
      await this.createVerificationTask(opportunityId, "osm_tags_audit", 80);
    }
  }
}
