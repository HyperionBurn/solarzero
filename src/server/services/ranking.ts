import { db } from "@/lib/db";

export class RankingService {
  /**
   * Computes V2 score purely from pre-loaded opportunity and building/enrichment relations.
   */
  static computeV2ScoreFromOpportunity(opportunity: {
    scoreTotal: number;
    status: string;
    assignedTo: string | null;
    building: {
      roofAreaM2: number | null;
      lat: number;
      lng: number;
      hasSolar: boolean;
    };
    companySignals: { id: string }[];
    contactSignals: { id: string }[];
    evidence: { status: string }[];
  }) {
    let score = opportunity.scoreTotal; // Start with V1 base score

    const drivers: string[] = [];
    const blockers: string[] = [];

    // 1. Technical & Econ drivers from V1
    if (opportunity.building.roofAreaM2 && opportunity.building.roofAreaM2 >= 1000) {
      drivers.push("High Roof Area: Spacious roof footprint supports large-scale installation.");
    } else if (opportunity.building.roofAreaM2 && opportunity.building.roofAreaM2 < 500) {
      blockers.push("Low Roof Area: Mid-size roof footprint limits maximum project scale.");
    }

    // 2. Emirate Regulatory Ease
    if (opportunity.building.lat && opportunity.building.lng) {
      const lat = opportunity.building.lat;
      const lng = opportunity.building.lng;
      // Dubai boundaries check
      if (lat >= 24.8 && lat <= 25.4 && lng >= 54.8 && lng <= 55.5) {
        drivers.push("Regulatory Ease: Located in Dubai with simplified net-metering connection.");
      }
    }

    // 3. Solarization Evidence
    const hasSolarEvidence = opportunity.evidence.some(e => e.status === "solar_present");
    const hasNoSolarEvidence = opportunity.evidence.some(e => e.status === "solar_absent");
    if (opportunity.building.hasSolar || hasSolarEvidence) {
      score -= 100; // Penalize heavily
      blockers.push("Solar Already Present: Existing solar arrays detected on roof.");
    } else if (hasNoSolarEvidence) {
      score += 15;
      drivers.push("Verified Unsolarized: Verified absence of solar panels on roof.");
    } else {
      blockers.push("Unverified Solar Presence: Solar presence status is unverified/unknown.");
    }

    // 4. Enrichment Data
    if (opportunity.companySignals.length > 0) {
      score += 5;
      drivers.push("Strong Occupancy Data: Valid occupier signal registered.");
    } else {
      blockers.push("Missing Occupancy Data: No occupant/company details discovered.");
    }

    if (opportunity.contactSignals.length > 0) {
      score += 5;
      drivers.push("Outreach Ready: Contact names and roles enriched.");
    } else {
      blockers.push("Missing Contact Details: No direct contacts mapped to target.");
    }

    // 5. Outreach Status
    if (opportunity.status === "qualified" || opportunity.status === "contacted") {
      score += 10;
      drivers.push("Active Pipeline: Qualified outreach target.");
    }

    if (opportunity.assignedTo) {
      score += 5;
    }

    const finalScore = Math.max(0, Math.min(100, score));

    return {
      score: finalScore,
      drivers,
      blockers,
    };
  }

  /**
   * Computes the V2 score for an opportunity based on physical characteristics,
   * enrichment signal presence, and verification certainty.
   */
  static async calculateV2Score(opportunityId: string) {
    const opportunity = await db.opportunity.findUnique({
      where: { id: opportunityId },
      include: {
        building: true,
        companySignals: true,
        contactSignals: true,
        evidence: true,
      },
    });

    if (!opportunity) return { score: 0, drivers: [], blockers: [] };

    return this.computeV2ScoreFromOpportunity(opportunity);
  }

  /**
   * Generates global and campaign-specific rankings, saving them to OpportunityRankSnapshot.
   */
  static async generateRankSnapshots() {
    // 1. Fetch all opportunities with ALL required relations with retry for concurrency resilience
    type OpportunityWithRelations = Awaited<
      ReturnType<
        typeof db.opportunity.findMany<{
          include: {
            discoveryCandidates: true;
            building: true;
            companySignals: true;
            contactSignals: true;
            evidence: true;
          };
        }>
      >
    >;
    let opportunities: OpportunityWithRelations = [];
    let attempts = 0;
    while (attempts < 3) {
      try {
        opportunities = await db.opportunity.findMany({
          include: {
            discoveryCandidates: true,
            building: true,
            companySignals: true,
            contactSignals: true,
            evidence: true,
          },
        });
        break;
      } catch (err) {
        attempts++;
        if (attempts >= 3) throw err;
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    }

    // 2. Score all opportunities in-memory
    const scoredOpps = opportunities.map((opp) => {
      const v2Data = this.computeV2ScoreFromOpportunity(opp);
      return {
        id: opp.id,
        opportunity: opp,
        v2Score: v2Data.score,
        drivers: v2Data.drivers,
        blockers: v2Data.blockers,
        campaignId: opp.discoveryCandidates[0]?.campaignId ?? null,
      };
    });

    // 3. Sort globally to assign global ranks
    scoredOpps.sort((a, b) => b.v2Score - a.v2Score);

    // 4. Save global rank snapshots and update modified opportunities inside transaction
    await db.$transaction(async (tx) => {
      // Re-fetch existing opportunity IDs inside the transaction to prevent foreign key violations
      const currentOpps = await tx.opportunity.findMany({
        select: { id: true },
      });
      const currentOppIds = new Set(currentOpps.map((o) => o.id));

      const snapshotData = scoredOpps
        .filter((item) => currentOppIds.has(item.id))
        .map((item, idx) => {
          const rankGlobal = idx + 1;
          let rankCampaign: number | null = null;
          if (item.campaignId) {
            const campaignOpps = scoredOpps.filter(o => o.campaignId === item.campaignId);
            const cIdx = campaignOpps.findIndex(o => o.id === item.id);
            rankCampaign = cIdx !== -1 ? cIdx + 1 : null;
          }

          return {
            opportunityId: item.id,
            campaignId: item.campaignId,
            scoringVersion: "v2.0",
            scoreTotal: item.v2Score,
            rankGlobal,
            rankCampaign,
            driversJson: JSON.stringify(item.drivers),
            blockersJson: JSON.stringify(item.blockers),
          };
        });

      if (snapshotData.length > 0) {
        // Insert all snapshots in one bulk query
        await tx.opportunityRankSnapshot.createMany({
          data: snapshotData,
        });
      }

      // Update only opportunities where scoreTotal or scoreBand changed and they still exist
      await Promise.all(
        scoredOpps
          .filter((item) => currentOppIds.has(item.id))
          .map((item) => {
            const newBand =
              item.v2Score >= 80
                ? "A"
                : item.v2Score >= 60
                ? "B"
                : item.v2Score >= 40
                ? "C"
                : item.v2Score > 0
                ? "D"
                : "REJECT";

            if (
              item.v2Score === item.opportunity.scoreTotal &&
              newBand === item.opportunity.scoreBand
            ) {
              return; // Skip no-op writes
            }

            return tx.opportunity.update({
              where: { id: item.id },
              data: {
                scoreTotal: item.v2Score,
                scoreBand: newBand,
              },
            });
          }).filter(Boolean)
      );
    });
  }
}
