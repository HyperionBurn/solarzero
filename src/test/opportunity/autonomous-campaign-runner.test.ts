import { vi, describe, it, expect, afterAll } from "vitest";
import { AutonomousDiscoveryService } from "@/server/services/autonomousDiscovery";
import { db } from "@/lib/db";

// Mock the OSM client to return a mocked building footprint within UAE
vi.mock("@/lib/osm/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/osm/client")>();
  return {
    ...original,
    queryBuildingsInBbox: vi.fn().mockResolvedValue({
      version: 0.6,
      generator: "Overpass API",
      osm3s: { timestamp_osm_base: "2026-06-06", copyright: "ODbL" },
      elements: [
        {
          type: "way",
          id: 77777,
          tags: {
            building: "warehouse",
            height: "15",
          },
          geometry: [
            { lat: 25.076, lon: 55.154 },
            { lat: 25.077, lon: 55.154 },
            { lat: 25.077, lon: 55.155 },
            { lat: 25.076, lon: 55.154 },
          ],
        },
      ],
    }),
  };
});

describe("Autonomous Campaign Runner Integration Tests", () => {
  let campaignId: string;
  let tileId: string;

  afterAll(async () => {
    // Clean up created entities
    await db.discoveryCandidate.deleteMany({
      where: { campaignId },
    });
    await db.scanTile.deleteMany({
      where: { campaignId },
    });
    await db.scanCampaign.deleteMany({
      where: { id: campaignId },
    });
    await db.opportunity.deleteMany({
      where: { building: { osmId: "way/77777" } },
    });
    await db.building.deleteMany({
      where: { osmId: "way/77777" },
    });
  });

  it("splits a bounding box correctly into steps", () => {
    const bounds = {
      south: 25.07,
      north: 25.08,
      west: 55.15,
      east: 55.16,
    };
    
    // With step 0.005, splitting a 0.01 x 0.01 grid should yield exactly 4 tiles (2 x 2)
    const tiles = AutonomousDiscoveryService.splitBoundingBox(bounds, 0.005);
    expect(tiles.length).toBe(4);
    
    expect(tiles[0]).toEqual({
      south: 25.07,
      north: 25.075,
      west: 55.15,
      east: 55.155,
    });
  });

  it("starts a draft campaign, generating tiles and transitioning status", async () => {
    // 1. Create a draft campaign
    const campaign = await AutonomousDiscoveryService.createCampaign(
      "Test Campaign Jebel Ali",
      "Dubai",
      { south: 25.07, north: 25.08, west: 55.15, east: 55.16 },
      { minRoofArea: 200 },
      "test-runner-agent"
    );
    campaignId = campaign.id;
    expect(campaign.status).toBe("draft");

    // 2. Start the campaign (triggers splitBoundingBox and generateTiles)
    const startedCampaign = await AutonomousDiscoveryService.startCampaign(campaignId, 0.01); // 0.01 step yields 1 tile
    expect(startedCampaign.status).toBe("pending");
    expect(startedCampaign.startedAt).not.toBeNull();

    const tiles = await db.scanTile.findMany({
      where: { campaignId },
    });
    expect(tiles.length).toBe(1);
    expect(tiles[0].status).toBe("pending");
    tileId = tiles[0].id;
  });

  it("pauses and resumes campaign status correctly", async () => {
    const paused = await AutonomousDiscoveryService.pauseCampaign(campaignId);
    expect(paused.status).toBe("paused");

    const resumed = await AutonomousDiscoveryService.resumeCampaign(campaignId);
    expect(resumed.status).toBe("pending");
  });

  it("executes a tile, discovering buildings, scoring opportunities, and upserting candidates", async () => {
    // Execute the tile
    const result = await AutonomousDiscoveryService.executeTile(tileId);
    expect(result.success).toBe(true);
    expect(result.buildingsFound).toBe(1);

    // Verify tile status is updated
    const tile = await db.scanTile.findUnique({
      where: { id: tileId },
    });
    expect(tile?.status).toBe("completed");
    expect(tile?.buildingsFound).toBe(1);

    // Verify building is created in DB
    const building = await db.building.findFirst({
      where: { osmId: "way/77777" },
      include: { opportunity: true },
    });
    expect(building).not.toBeNull();
    expect(building?.buildingType).toBe("industrial");
    
    // Verify opportunity is created and scored
    expect(building?.opportunity).toBeDefined();
    expect(building?.opportunity?.scoreBand).toBeDefined();

    // Verify discovery candidate is saved and associated
    const candidate = await db.discoveryCandidate.findFirst({
      where: { sourceKey: "way/77777" },
    });
    expect(candidate).not.toBeNull();
    expect(candidate?.buildingId).toBe(building?.id);
    expect(candidate?.opportunityId).toBe(building?.opportunity?.id);
    expect(candidate?.campaignId).toBe(campaignId);
    expect(candidate?.scanTileId).toBe(tileId);

    // Verify campaign is completed since the only tile succeeded
    const campaign = await db.scanCampaign.findUnique({
      where: { id: campaignId },
    });
    expect(campaign?.status).toBe("completed");
  });
});
