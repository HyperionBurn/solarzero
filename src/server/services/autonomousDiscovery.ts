import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export class AutonomousDiscoveryService {
  /**
   * Creates a new scan campaign in draft status.
   */
  static async createCampaign(
    name: string,
    emirate?: string,
    boundsJson?: Prisma.InputJsonValue,
    filtersJson?: Prisma.InputJsonValue,
    createdBy?: string
  ) {
    return db.scanCampaign.create({
      data: {
        name,
        emirate: emirate ?? null,
        boundsJson: boundsJson ?? Prisma.DbNull,
        filtersJson: filtersJson ?? Prisma.DbNull,
        status: "draft",
        createdBy: createdBy ?? null,
      },
    });
  }

  /**
   * Generates pending ScanTile records for a campaign.
   */
  static async generateTilesForCampaign(
    campaignId: string,
    tilesBounds: Prisma.InputJsonValue[]
  ) {
    const tilesData = tilesBounds.map((bounds) => ({
      campaignId,
      boundsJson: bounds,
      status: "pending",
    }));

    // Perform a transaction to insert tiles and update campaign status if it was draft
    return db.$transaction(async (tx) => {
      await tx.scanTile.createMany({
        data: tilesData,
      });

      const campaign = await tx.scanCampaign.findUnique({
        where: { id: campaignId },
      });

      if (campaign && campaign.status === "draft") {
        await tx.scanCampaign.update({
          where: { id: campaignId },
          data: { status: "pending" },
        });
      }

      return tx.scanTile.findMany({
        where: { campaignId },
      });
    });
  }

  /**
   * Atomically claims a pending or failed tile, locking it for processing.
   */
  static async claimTile(tileId: string) {
    return db.$transaction(async (tx) => {
      const tile = await tx.scanTile.findUnique({
        where: { id: tileId },
      });

      if (!tile) {
        throw new Error(`Tile not found: ${tileId}`);
      }

      if (tile.status === "running") {
        // Double locking prevention
        throw new Error(`Tile ${tileId} is already being processed`);
      }

      return tx.scanTile.update({
        where: { id: tileId },
        data: {
          status: "running",
          attemptCount: { increment: 1 },
          lockedAt: new Date(),
        },
      });
    });
  }

  /**
   * Marks a tile as successfully completed.
   */
  static async completeTile(tileId: string, buildingsFound: number) {
    return db.scanTile.update({
      where: { id: tileId },
      data: {
        status: "completed",
        buildingsFound,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Marks a tile as failed with error details.
   */
  static async failTile(tileId: string, errorMsg: string) {
    return db.scanTile.update({
      where: { id: tileId },
      data: {
        status: "failed",
        error: errorMsg,
        lockedAt: null,
      },
    });
  }

  /**
   * Upserts a discovered candidate building. Deduplicates by sourceId and sourceKey.
   * Auto-associates with an existing Building and Opportunity if found.
   */
  static async upsertDiscoveryCandidate(data: {
    campaignId?: string;
    scanTileId?: string;
    sourceId: string;
    sourceKey: string;
    lat: number;
    lng: number;
    geometryJson?: Prisma.InputJsonValue;
    payloadJson?: Prisma.InputJsonValue;
  }) {
    let buildingId: string | null = null;
    let opportunityId: string | null = null;

    // Auto-associate with existing OSM building if possible
    if (data.sourceId === "osm" && data.sourceKey) {
      const building = await db.building.findFirst({
        where: { osmId: data.sourceKey },
        include: { opportunity: true },
      });
      if (building) {
        buildingId = building.id;
        opportunityId = building.opportunity?.id ?? null;
      }
    }

    return db.discoveryCandidate.upsert({
      where: {
        sourceId_sourceKey: {
          sourceId: data.sourceId,
          sourceKey: data.sourceKey,
        },
      },
      create: {
        campaignId: data.campaignId ?? null,
        scanTileId: data.scanTileId ?? null,
        buildingId,
        opportunityId,
        sourceId: data.sourceId,
        sourceKey: data.sourceKey,
        lat: data.lat,
        lng: data.lng,
        geometryJson: data.geometryJson ?? Prisma.DbNull,
        payloadJson: data.payloadJson ?? Prisma.DbNull,
        status: "new",
        confidence: 0.5,
      },
      update: {
        campaignId: data.campaignId ?? undefined,
        scanTileId: data.scanTileId ?? undefined,
        buildingId: buildingId ?? undefined,
        opportunityId: opportunityId ?? undefined,
        lat: data.lat,
        lng: data.lng,
        geometryJson: data.geometryJson ?? undefined,
        payloadJson: data.payloadJson ?? undefined,
      },
    });
  }
}
