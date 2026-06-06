import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { AutonomousDiscoveryService } from "@/server/services/autonomousDiscovery";

describe("AutonomousDiscoveryService Integration Tests", () => {
  let campaignId: string;
  let tileId: string;
  let testBuildingId: string;
  let testOpportunityId: string;

  beforeAll(async () => {
    // Set up a test building and opportunity to test auto-association
    const building = await db.building.create({
      data: {
        osmId: "test-osm-9999",
        osmType: "way",
        address: "Test Auto-Association Building",
        lat: 25.076,
        lng: 55.154,
        roofAreaM2: 500,
        buildingType: "commercial",
      },
    });
    testBuildingId = building.id;

    const opportunity = await db.opportunity.create({
      data: {
        buildingId: building.id,
        status: "new",
        scoreTotal: 80,
        scoreBand: "A",
        confidence: 0.8,
      },
    });
    testOpportunityId = opportunity.id;
  });

  afterAll(async () => {
    // Cleanup the database records
    await db.discoveryCandidate.deleteMany({
      where: { sourceKey: { in: ["test-osm-9999", "candidate-1", "candidate-2"] } },
    });
    await db.scanTile.deleteMany({
      where: { campaignId },
    });
    await db.scanCampaign.deleteMany({
      where: { id: campaignId },
    });
    await db.opportunity.delete({
      where: { id: testOpportunityId },
    });
    await db.building.delete({
      where: { id: testBuildingId },
    });
  });

  it("creates a campaign in draft status", async () => {
    const campaign = await AutonomousDiscoveryService.createCampaign(
      "Marina Scan Campaign",
      "Dubai",
      { north: 25.08, south: 25.07, east: 55.16, west: 55.15 },
      { minRoofArea: 200 },
      "test-agent"
    );

    expect(campaign.id).toBeDefined();
    expect(campaign.name).toBe("Marina Scan Campaign");
    expect(campaign.emirate).toBe("Dubai");
    expect(campaign.status).toBe("draft");
    expect(campaign.createdBy).toBe("test-agent");
    campaignId = campaign.id;
  });

  it("generates tiles and transitions campaign status to pending", async () => {
    const tilesBounds = [
      { north: 25.08, south: 25.075, east: 55.16, west: 55.15 },
      { north: 25.075, south: 25.07, east: 55.16, west: 55.15 },
    ];

    const tiles = await AutonomousDiscoveryService.generateTilesForCampaign(
      campaignId,
      tilesBounds
    );

    expect(tiles.length).toBe(2);
    expect(tiles[0].status).toBe("pending");
    expect(tiles[1].status).toBe("pending");
    tileId = tiles[0].id;

    // Verify campaign status changed to pending
    const campaign = await db.scanCampaign.findUnique({
      where: { id: campaignId },
    });
    expect(campaign?.status).toBe("pending");
  });

  it("claims and locks a tile atomically", async () => {
    const claimedTile = await AutonomousDiscoveryService.claimTile(tileId);

    expect(claimedTile.status).toBe("running");
    expect(claimedTile.attemptCount).toBe(1);
    expect(claimedTile.lockedAt).not.toBeNull();

    // Verify that claiming again throws a double-locking prevention error
    await expect(AutonomousDiscoveryService.claimTile(tileId)).rejects.toThrow(
      "is already being processed"
    );
  });

  it("marks a tile as completed or failed", async () => {
    // 1. Complete first tile
    const completedTile = await AutonomousDiscoveryService.completeTile(tileId, 15);
    expect(completedTile.status).toBe("completed");
    expect(completedTile.buildingsFound).toBe(15);
    expect(completedTile.completedAt).not.toBeNull();

    // 2. Fail second tile
    const otherTile = await db.scanTile.findFirst({
      where: { campaignId, status: "pending" },
    });
    expect(otherTile).not.toBeNull();

    const failedTile = await AutonomousDiscoveryService.failTile(
      otherTile!.id,
      "OSM network timeout"
    );
    expect(failedTile.status).toBe("failed");
    expect(failedTile.error).toBe("OSM network timeout");
    expect(failedTile.lockedAt).toBeNull();
  });

  it("upserts discovery candidates and prevents duplicates", async () => {
    // 1. Insert candidate 1
    const cand1 = await AutonomousDiscoveryService.upsertDiscoveryCandidate({
      campaignId,
      scanTileId: tileId,
      sourceId: "osm",
      sourceKey: "candidate-1",
      lat: 25.076,
      lng: 55.154,
      payloadJson: { name: "Footprint A" },
    });

    expect(cand1.id).toBeDefined();
    expect(cand1.sourceKey).toBe("candidate-1");
    expect(cand1.status).toBe("new");

    // 2. Update candidate 1 (idempotency check)
    const updatedCand = await AutonomousDiscoveryService.upsertDiscoveryCandidate({
      campaignId,
      scanTileId: tileId,
      sourceId: "osm",
      sourceKey: "candidate-1",
      lat: 25.077,
      lng: 55.155,
      payloadJson: { name: "Footprint A Updated" },
    });

    expect(updatedCand.id).toBe(cand1.id);
    expect(updatedCand.lat).toBe(25.077);
    expect(updatedCand.lng).toBe(55.155);

    // Verify database count of candidate-1 is exactly 1
    const count = await db.discoveryCandidate.count({
      where: { sourceKey: "candidate-1" },
    });
    expect(count).toBe(1);
  });

  it("auto-associates candidate to existing building and opportunity", async () => {
    // Upsert candidate using the sourceKey corresponding to the pre-existing building
    const candidate = await AutonomousDiscoveryService.upsertDiscoveryCandidate({
      campaignId,
      scanTileId: tileId,
      sourceId: "osm",
      sourceKey: "test-osm-9999",
      lat: 25.076,
      lng: 55.154,
    });

    expect(candidate.buildingId).toBe(testBuildingId);
    expect(candidate.opportunityId).toBe(testOpportunityId);
  });
});
