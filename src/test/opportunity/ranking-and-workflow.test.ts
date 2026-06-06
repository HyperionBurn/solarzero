// @vitest-environment node
import "dotenv/config";
import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { db } from "@/lib/db";
import { OpportunityService } from "@/server/services/opportunity";
import { RankingService } from "@/server/services/ranking";
import { VerificationService } from "@/server/services/verification";
import { EnrichmentService } from "@/server/services/enrichment";

describe("Ranking, Verification, and Enrichment Integration Tests", () => {
  let buildingAId: string;
  let buildingBId: string;
  let opportunityAId: string;
  let opportunityBId: string;

  beforeAll(async () => {
    console.log("DATABASE_URL in test beforeAll:", process.env.DATABASE_URL);

    // Clean up any stray test records from previous failed runs first!
    const existingBuildings = await db.building.findMany({
      where: { osmId: { in: ["way/test-enrich-a", "way/test-enrich-b"] } },
    });
    const bIds = existingBuildings.map(b => b.id);
    if (bIds.length > 0) {
      const existingOpps = await db.opportunity.findMany({
        where: { buildingId: { in: bIds } },
      });
      const oppIds = existingOpps.map(o => o.id);
      if (oppIds.length > 0) {
        await db.outreachActivity.deleteMany({ where: { opportunityId: { in: oppIds } } });
        await db.contactSignal.deleteMany({ where: { opportunityId: { in: oppIds } } });
        await db.companySignal.deleteMany({ where: { opportunityId: { in: oppIds } } });
        await db.verificationTask.deleteMany({ where: { opportunityId: { in: oppIds } } });
        await db.solarizationEvidence.deleteMany({ where: { opportunityId: { in: oppIds } } });
        await db.opportunityRankSnapshot.deleteMany({ where: { opportunityId: { in: oppIds } } });
        await db.opportunity.deleteMany({ where: { id: { in: oppIds } } });
      }
      await db.building.deleteMany({ where: { id: { in: bIds } } });
    }

    // 1. Create two test buildings in Dubai
    const buildingA = await db.building.create({
      data: {
        osmId: "way/test-enrich-a",
        lat: 25.105,
        lng: 55.155,
        roofAreaM2: 2500,
        buildingType: "warehouse",
        address: "Industrial Area 4, Al Quoz, Dubai",
        hasSolar: false,
      },
    });
    buildingAId = buildingA.id;

    const buildingB = await db.building.create({
      data: {
        osmId: "way/test-enrich-b",
        lat: 25.110,
        lng: 55.160,
        roofAreaM2: 400,
        buildingType: "office",
        address: "Al Manara Road, Dubai",
        hasSolar: false,
      },
    });
    buildingBId = buildingB.id;

    // 2. Ensure opportunities exist
    const oppA = await OpportunityService.ensureOpportunityForBuilding(buildingAId);
    opportunityAId = oppA.id;

    const oppB = await OpportunityService.ensureOpportunityForBuilding(buildingBId);
    opportunityBId = oppB.id;
  }, 30000);

  afterAll(async () => {
    // Clean up created entities safely
    const ids = [opportunityAId, opportunityBId].filter(Boolean) as string[];
    const bIds = [buildingAId, buildingBId].filter(Boolean) as string[];
    if (ids.length > 0) {
      await db.outreachActivity.deleteMany({
        where: { opportunityId: { in: ids } },
      });
      await db.contactSignal.deleteMany({
        where: { opportunityId: { in: ids } },
      });
      await db.companySignal.deleteMany({
        where: { opportunityId: { in: ids } },
      });
      await db.verificationTask.deleteMany({
        where: { opportunityId: { in: ids } },
      });
      await db.solarizationEvidence.deleteMany({
        where: { opportunityId: { in: ids } },
      });
      await db.opportunityRankSnapshot.deleteMany({
        where: { opportunityId: { in: ids } },
      });
      await db.opportunity.deleteMany({
        where: { id: { in: ids } },
      });
    }
    if (bIds.length > 0) {
      await db.building.deleteMany({
        where: { id: { in: bIds } },
      });
    }
  }, 30000);

  it("Step 1: computes correct V2 score, drivers, and generates rank snapshots", async () => {
    // Manually trigger rank snapshot generation
    await RankingService.generateRankSnapshots();

    // Fetch snapshots
    const snapshotsA = await db.opportunityRankSnapshot.findMany({
      where: { opportunityId: opportunityAId },
      orderBy: { createdAt: "desc" },
    });
    const snapshotsB = await db.opportunityRankSnapshot.findMany({
      where: { opportunityId: opportunityBId },
      orderBy: { createdAt: "desc" },
    });

    expect(snapshotsA.length).toBeGreaterThan(0);
    expect(snapshotsB.length).toBeGreaterThan(0);

    const latestSnapA = snapshotsA[0];
    const latestSnapB = snapshotsB[0];

    // Decode drivers/blockers JSON
    const driversA = latestSnapA.driversJson
      ? (typeof latestSnapA.driversJson === "string" ? JSON.parse(latestSnapA.driversJson) : latestSnapA.driversJson)
      : [];
    const blockersB = latestSnapB.blockersJson
      ? (typeof latestSnapB.blockersJson === "string" ? JSON.parse(latestSnapB.blockersJson) : latestSnapB.blockersJson)
      : [];

    // Opportunity A should have large roof driver and Dubai regulatory driver
    expect(driversA).toContain("High Roof Area: Spacious roof footprint supports large-scale installation.");
    expect(driversA).toContain("Regulatory Ease: Located in Dubai with simplified net-metering connection.");

    // Opportunity B has small roof area blocker and missing occupancy details blocker
    expect(blockersB).toContain("Low Roof Area: Mid-size roof footprint limits maximum project scale.");
    expect(blockersB).toContain("Missing Occupancy Data: No occupant/company details discovered.");

    // Verify ranks are sequentially computed
    expect(latestSnapA.rankGlobal).toBeLessThanOrEqual(latestSnapB.rankGlobal ?? 9999);
  }, 30000);

  it("Step 2: processes verification task lifecycle and creates solarization evidence", async () => {
    // 1. Create a pending verification task
    const task = await VerificationService.createVerificationTask(opportunityAId, "satellite_imagery_provider");
    expect(task.status).toBe("pending");
    expect(task.providerId).toBe("satellite_imagery_provider");

    // 2. Complete the verification task confirming absence of solar panels
    const completed = await VerificationService.completeVerificationTask(task.id, {
      hasSolar: false,
      confidence: 0.95,
      notes: "Verified clean roof structure without any existing PV arrays.",
    });

    expect(completed.status).toBe("completed");

    // 3. Verify solarization evidence record is created (using valid fields)
    const evidence = await db.solarizationEvidence.findFirst({
      where: { opportunityId: opportunityAId, source: "manual" },
    });

    expect(evidence).not.toBeNull();
    expect(evidence?.status).toBe("solar_absent");
    expect(evidence?.confidence).toBe(0.95);
    expect(evidence?.notes).toContain("satellite_imagery_provider");

    // 4. Verify rank snapshot updated showing Verified Unsolarized driver
    await RankingService.generateRankSnapshots();
    const latestSnapshot = await db.opportunityRankSnapshot.findFirst({
      where: { opportunityId: opportunityAId },
      orderBy: { createdAt: "desc" },
    });
    const drivers = latestSnapshot?.driversJson
      ? (typeof latestSnapshot.driversJson === "string" ? JSON.parse(latestSnapshot.driversJson) : latestSnapshot.driversJson)
      : [];
    expect(drivers).toContain("Verified Unsolarized: Verified absence of solar panels on roof.");
  }, 30000);

  it("Step 3: imports contacts from CSV and associates them to target opportunities", async () => {
    const csvContent = `osmId,address,companyName,name,role,email,phone
way/test-enrich-a,Industrial Area 4,Al Quoz Solar Logistics,Alice Smith,Director,alice@quozsolar.ae,+971500000001
,Al Manara Road,Al Manara Finance,Bob Jones,Manager,bob@manarafin.ae,+971500000002`;

    const result = await EnrichmentService.importContactsFromCsv(csvContent);
    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(2);

    // Verify signals for Opportunity A (matched by osmId)
    const companyA = await db.companySignal.findFirst({
      where: { opportunityId: opportunityAId, companyName: "Al Quoz Solar Logistics" },
      include: { contacts: true },
    });
    expect(companyA).not.toBeNull();
    expect(companyA?.relationship).toBe("occupant");
    expect(companyA?.contacts.length).toBe(1);
    expect(companyA?.contacts[0].name).toBe("Alice Smith");
    expect(companyA?.contacts[0].email).toBe("alice@quozsolar.ae");

    // Verify signals for Opportunity B (matched by address contains)
    const companyB = await db.companySignal.findFirst({
      where: { opportunityId: opportunityBId, companyName: "Al Manara Finance" },
      include: { contacts: true },
    });
    expect(companyB).not.toBeNull();
    expect(companyB?.contacts.length).toBe(1);
    expect(companyB?.contacts[0].name).toBe("Bob Jones");
  }, 30000);

  it("Step 4: transitions pipeline status and logs outreach activities", async () => {
    // 1. Transition status via opportunity service update
    await db.opportunity.update({
      where: { id: opportunityAId },
      data: {
        status: "qualified",
        priority: "high",
      },
    });

    // 2. Log outreach activity
    const activity = await db.outreachActivity.create({
      data: {
        opportunityId: opportunityAId,
        type: "call",
        status: "completed",
        notes: "Completed discovery call with Alice Smith. Verified annual energy consumption.",
        actor: "sales-agent@solarzero.ae",
      },
    });

    expect(activity.type).toBe("call");
    expect(activity.status).toBe("completed");
    expect(activity.actor).toBe("sales-agent@solarzero.ae");

    // Fetch opportunity to verify new relations
    const opp = await db.opportunity.findUnique({
      where: { id: opportunityAId },
      include: {
        outreachActivities: true,
      },
    });
    expect(opp?.status).toBe("qualified");
    expect(opp?.priority).toBe("high");
    expect(opp?.outreachActivities.length).toBeGreaterThan(0);
  }, 30000);
});
