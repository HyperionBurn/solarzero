import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../../lib/db";
import { OpportunityService } from "../../server/services/opportunity";

describe("OpportunityService Integration", () => {
  let tempBuildingId: string;

  beforeAll(async () => {
    // Create a temporary building for testing
    const building = await db.building.create({
      data: {
        address: "Test Integration Building, Dubai",
        lat: 25.105,
        lng: 55.165,
        roofAreaM2: 800,
        buildingType: "warehouse",
        hasSolar: false,
      },
    });
    tempBuildingId = building.id;
  });

  afterAll(async () => {
    // Cleanup the building (will cascade delete opportunity, scores, etc.)
    if (tempBuildingId) {
      await db.building.delete({
        where: { id: tempBuildingId },
      });
    }
  });

  it("creates and scores opportunity for a new building", async () => {
    const opportunity = await OpportunityService.ensureOpportunityForBuilding(tempBuildingId);
    expect(opportunity).toBeDefined();
    expect(opportunity.buildingId).toBe(tempBuildingId);
    expect(opportunity.scoreTotal).toBeGreaterThan(0);
    expect(opportunity.scoreBand).toBe("B"); // 800m2 warehouse should be B or C

    // Verify it exists in db
    const saved = await db.opportunity.findUnique({
      where: { id: opportunity.id },
      include: {
        scores: true,
      },
    });
    expect(saved).not.toBeNull();
    expect(saved!.scores.length).toBe(1);
  }, 30000);

  it("updates opportunity score when solarization evidence is added", async () => {
    const opportunity = await db.opportunity.findUnique({
      where: { buildingId: tempBuildingId },
    });
    expect(opportunity).not.toBeNull();

    // Add high-confidence solar present evidence
    await db.solarizationEvidence.create({
      data: {
        opportunityId: opportunity!.id,
        status: "solar_present",
        source: "manual",
        confidence: 0.95,
        notes: "Solar clearly visible on satellite imagery",
      },
    });

    // Rescore
    const rescored = await OpportunityService.rescoreOpportunity(opportunity!.id);
    expect(rescored.scoreTotal).toBeLessThan(opportunity!.scoreTotal); // score should drop
    expect(rescored.nextAction).toBe("VERIFY_SOLARIZATION");
  }, 30000);
});
