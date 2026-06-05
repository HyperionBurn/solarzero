import { db } from "@/lib/db";
import { scoreOpportunity, SCORING_VERSION } from "@/lib/opportunity/scoring";
import type { ScoringInput } from "@/lib/opportunity/types";
import { SignalGraphService } from "./signalGraph";

export class OpportunityService {
  /**
   * Ensures an opportunity record exists for a building, calculates its score,
   * and saves the score to the database.
   */
  static async ensureOpportunityForBuilding(buildingId: string) {
    const building = await db.building.findUnique({
      where: { id: buildingId },
      include: {
        assessment: true,
        opportunity: {
          include: {
            evidence: true,
          },
        },
      },
    });

    if (!building) {
      throw new Error(`Building not found: ${buildingId}`);
    }

    // Run connectors to fetch signals
    await SignalGraphService.runAllConnectorsForBuilding(buildingId);

    // Get consensus data from SignalGraph
    const consensus = await SignalGraphService.getConsensusData(buildingId);

    // Fetch evidence if opportunity exists, or empty array
    const evidenceList = building.opportunity?.evidence.map(e => ({
      status: e.status,
      confidence: e.confidence,
    })) || [];

    const scoringInput: ScoringInput = {
      roofAreaM2: consensus.consensusRoofArea !== null ? consensus.consensusRoofArea : building.roofAreaM2,
      buildingType: building.buildingType,
      lat: building.lat,
      lng: building.lng,
      hasSolar: building.hasSolar,
      existingAssessment: building.assessment
        ? {
            systemSizeKwp: building.assessment.systemSizeKwp,
            paybackYears: building.assessment.paybackYears,
            npv25yrAed: building.assessment.npv25yrAed,
            annualSavingsAed: building.assessment.annualSavingsAed,
          }
        : null,
      evidenceList,
    };

    const scoringOutput = scoreOpportunity(scoringInput);

    // Append SignalGraph consensus reasons/risks
    const mergedReasons = [...scoringOutput.reasons, ...consensus.reasons];
    const mergedRisks = [...scoringOutput.risks, ...consensus.risks];

    // Upsert the Opportunity record
    const opportunity = await db.opportunity.upsert({
      where: { buildingId },
      create: {
        buildingId,
        status: "new",
        priority: "unreviewed",
        scoreTotal: scoringOutput.scoreTotal,
        scoreBand: scoringOutput.scoreBand,
        confidence: Math.round(((scoringOutput.confidence + consensus.areaConfidence + consensus.ghiConfidence) / 3) * 100) / 100,
        nextAction: scoringOutput.nextAction,
        reasonsJson: JSON.stringify(mergedReasons),
        risksJson: JSON.stringify(mergedRisks),
        lastScoredAt: new Date(),
      },
      update: {
        scoreTotal: scoringOutput.scoreTotal,
        scoreBand: scoringOutput.scoreBand,
        confidence: Math.round(((scoringOutput.confidence + consensus.areaConfidence + consensus.ghiConfidence) / 3) * 100) / 100,
        nextAction: scoringOutput.nextAction,
        reasonsJson: JSON.stringify(mergedReasons),
        risksJson: JSON.stringify(mergedRisks),
        lastScoredAt: new Date(),
      },
    });

    // Write a score history record
    await db.opportunityScore.create({
      data: {
        opportunityId: opportunity.id,
        version: SCORING_VERSION,
        roofFitScore: scoringOutput.subScores.roofFitScore,
        economicsScore: scoringOutput.subScores.economicsScore,
        buildingTypeScore: scoringOutput.subScores.buildingTypeScore,
        unsolarizedScore: scoringOutput.subScores.unsolarizedScore,
        dataCompletenessScore: scoringOutput.subScores.dataCompletenessScore,
        regulatoryScore: scoringOutput.subScores.regulatoryScore,
        totalScore: scoringOutput.scoreTotal,
        reasonsJson: JSON.stringify(mergedReasons),
        risksJson: JSON.stringify(mergedRisks),
      },
    });

    return opportunity;
  }

  /**
   * Rescores an existing opportunity.
   */
  static async rescoreOpportunity(opportunityId: string) {
    const opportunity = await db.opportunity.findUnique({
      where: { id: opportunityId },
      include: {
        building: {
          include: {
            assessment: true,
          },
        },
        evidence: true,
      },
    });

    if (!opportunity) {
      throw new Error(`Opportunity not found: ${opportunityId}`);
    }

    // Refresh connectors to fetch signals
    await SignalGraphService.runAllConnectorsForBuilding(opportunity.buildingId);

    // Get consensus data from SignalGraph
    const consensus = await SignalGraphService.getConsensusData(opportunity.buildingId);

    const evidenceList = opportunity.evidence.map(e => ({
      status: e.status,
      confidence: e.confidence,
    }));

    const scoringInput: ScoringInput = {
      roofAreaM2: consensus.consensusRoofArea !== null ? consensus.consensusRoofArea : opportunity.building.roofAreaM2,
      buildingType: opportunity.building.buildingType,
      lat: opportunity.building.lat,
      lng: opportunity.building.lng,
      hasSolar: opportunity.building.hasSolar,
      existingAssessment: opportunity.building.assessment
        ? {
            systemSizeKwp: opportunity.building.assessment.systemSizeKwp,
            paybackYears: opportunity.building.assessment.paybackYears,
            npv25yrAed: opportunity.building.assessment.npv25yrAed,
            annualSavingsAed: opportunity.building.assessment.annualSavingsAed,
          }
        : null,
      evidenceList,
    };

    const scoringOutput = scoreOpportunity(scoringInput);

    // Append SignalGraph consensus reasons/risks
    const mergedReasons = [...scoringOutput.reasons, ...consensus.reasons];
    const mergedRisks = [...scoringOutput.risks, ...consensus.risks];

    // Update the Opportunity record
    const updated = await db.opportunity.update({
      where: { id: opportunityId },
      data: {
        scoreTotal: scoringOutput.scoreTotal,
        scoreBand: scoringOutput.scoreBand,
        confidence: Math.round(((scoringOutput.confidence + consensus.areaConfidence + consensus.ghiConfidence) / 3) * 100) / 100,
        nextAction: scoringOutput.nextAction,
        reasonsJson: JSON.stringify(mergedReasons),
        risksJson: JSON.stringify(mergedRisks),
        lastScoredAt: new Date(),
      },
    });

    // Write a score history record
    await db.opportunityScore.create({
      data: {
        opportunityId,
        version: SCORING_VERSION,
        roofFitScore: scoringOutput.subScores.roofFitScore,
        economicsScore: scoringOutput.subScores.economicsScore,
        buildingTypeScore: scoringOutput.subScores.buildingTypeScore,
        unsolarizedScore: scoringOutput.subScores.unsolarizedScore,
        dataCompletenessScore: scoringOutput.subScores.dataCompletenessScore,
        regulatoryScore: scoringOutput.subScores.regulatoryScore,
        totalScore: scoringOutput.scoreTotal,
        reasonsJson: JSON.stringify(mergedReasons),
        risksJson: JSON.stringify(mergedRisks),
      },
    });

    return updated;
  }

  /**
   * Run backfill for all existing buildings in the database.
   */
  static async backfillAll() {
    const buildings = await db.building.findMany({
      select: { id: true },
    });

    let createdCount = 0;
    for (const building of buildings) {
      try {
        await this.ensureOpportunityForBuilding(building.id);
        createdCount++;
      } catch (err) {
        console.error(`Failed to backfill building ${building.id}:`, err);
      }
    }

    return {
      totalBuildings: buildings.length,
      backfilled: createdCount,
    };
  }
}
