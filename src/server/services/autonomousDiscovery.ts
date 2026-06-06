import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { queryBuildingsInBbox } from "@/lib/osm/client";
import { parseOSMBuildings } from "@/lib/osm/parser";
import { getDubaiAreaName, isWithinUAE } from "./buildingDiscovery";
import { getEmirateConfig } from "@/lib/regulatory/emirates";
import { OpportunityService } from "./opportunity";

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

  /**
   * Splits a bounding box into step-sized grid tiles.
   */
  static splitBoundingBox(
    bounds: {
      minLat?: number;
      maxLat?: number;
      minLng?: number;
      maxLng?: number;
      north?: number;
      south?: number;
      east?: number;
      west?: number;
    },
    step = 0.005
  ) {
    const minLat = bounds.south ?? bounds.minLat;
    const maxLat = bounds.north ?? bounds.maxLat;
    const minLng = bounds.west ?? bounds.minLng;
    const maxLng = bounds.east ?? bounds.maxLng;

    if (
      minLat === undefined ||
      maxLat === undefined ||
      minLng === undefined ||
      maxLng === undefined
    ) {
      throw new Error("Invalid bounds: must specify lat/lng or north/south/east/west bounds");
    }

    if (minLat >= maxLat || minLng >= maxLng) {
      throw new Error("Invalid bounds: min must be less than max");
    }

    const tiles: { south: number; north: number; west: number; east: number }[] = [];

    // Ensure step is positive and reasonable
    const stepVal = Math.abs(step) || 0.005;

    for (let lat = minLat; lat < maxLat; lat += stepVal) {
      const nextLat = Math.min(lat + stepVal, maxLat);
      for (let lng = minLng; lng < maxLng; lng += stepVal) {
        const nextLng = Math.min(lng + stepVal, maxLng);
        tiles.push({
          south: lat,
          north: nextLat,
          west: lng,
          east: nextLng,
        });
      }
    }

    return tiles;
  }

  /**
   * Starts a campaign. If it is in draft status, generates tiles first.
   */
  static async startCampaign(campaignId: string, step = 0.005) {
    const campaign = await db.scanCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    if (campaign.status !== "draft") {
      if (campaign.status === "paused") {
        return db.scanCampaign.update({
          where: { id: campaignId },
          data: { status: "pending" },
        });
      }
      return campaign;
    }

    if (!campaign.boundsJson) {
      throw new Error("Cannot start campaign without boundsJson");
    }

    const bounds = campaign.boundsJson as {
      south?: number;
      north?: number;
      west?: number;
      east?: number;
      minLat?: number;
      maxLat?: number;
      minLng?: number;
      maxLng?: number;
    };
    const tilesBounds = this.splitBoundingBox(bounds, step);

    await this.generateTilesForCampaign(campaignId, tilesBounds);

    return db.scanCampaign.update({
      where: { id: campaignId },
      data: {
        status: "pending",
        startedAt: new Date(),
      },
    });
  }

  /**
   * Pauses a running or pending campaign.
   */
  static async pauseCampaign(campaignId: string) {
    return db.scanCampaign.update({
      where: { id: campaignId },
      data: { status: "paused" },
    });
  }

  /**
   * Resumes a paused campaign.
   */
  static async resumeCampaign(campaignId: string) {
    return db.scanCampaign.update({
      where: { id: campaignId },
      data: { status: "pending" },
    });
  }

  /**
   * Analyzes tile statuses and updates campaign progress/status.
   */
  static async updateCampaignProgress(campaignId: string) {
    const tiles = await db.scanTile.findMany({
      where: { campaignId },
    });

    const total = tiles.length;
    const completed = tiles.filter((t) => t.status === "completed").length;
    const failed = tiles.filter((t) => t.status === "failed").length;

    if (completed + failed === total) {
      const status = failed === total ? "failed" : "completed";
      await db.scanCampaign.update({
        where: { id: campaignId },
        data: {
          status,
          completedAt: new Date(),
        },
      });
    } else {
      const campaign = await db.scanCampaign.findUnique({
        where: { id: campaignId },
      });
      if (campaign && (campaign.status === "pending" || campaign.status === "draft")) {
        await db.scanCampaign.update({
          where: { id: campaignId },
          data: { status: "running" },
        });
      }
    }
  }

  /**
   * Claims and runs a single tile: queries Overpass bbox, registers buildings & opportunities,
   * then records candidates.
   */
  static async executeTile(tileId: string) {
    const tile = await this.claimTile(tileId);

    try {
      const bounds = tile.boundsJson as {
        south?: number;
        north?: number;
        west?: number;
        east?: number;
        minLat?: number;
        maxLat?: number;
        minLng?: number;
        maxLng?: number;
      };
      const south = bounds.south ?? bounds.minLat;
      const north = bounds.north ?? bounds.maxLat;
      const west = bounds.west ?? bounds.minLng;
      const east = bounds.east ?? bounds.maxLng;

      if (south === undefined || north === undefined || west === undefined || east === undefined) {
        throw new Error("Tile boundsJson is missing coordinates");
      }

      // Query OSM Overpass
      const osmData = await queryBuildingsInBbox(south, west, north, east);

      // Parse buildings
      const parsedBuildings = parseOSMBuildings(osmData);

      let buildingsFound = 0;
      for (const b of parsedBuildings) {
        // Enforce UAE checks
        if (!isWithinUAE(b.lat, b.lng)) {
          continue;
        }

        // Check if building already exists by osmId
        let building = await db.building.findFirst({
          where: { osmId: b.osmId },
        });

        if (!building) {
          const typeLabel = b.buildingType && b.buildingType !== "unknown" && b.buildingType !== "roof"
            ? b.buildingType.charAt(0).toUpperCase() + b.buildingType.slice(1)
            : "Commercial";
          const emirate = getEmirateConfig(b.lat, b.lng);
          const address = `${typeLabel} Building in ${getDubaiAreaName(b.lat, b.lng)}, ${emirate.name}`;

          building = await db.building.create({
            data: {
              osmId: b.osmId,
              osmType: b.osmType,
              address,
              lat: b.lat,
              lng: b.lng,
              roofAreaM2: b.roofAreaM2,
              buildingType: b.buildingType,
              heightMeters: b.heightMeters ?? null,
            },
          });

          // Create and score opportunity
          await OpportunityService.ensureOpportunityForBuilding(building.id);
        }

        // Upsert Discovery Candidate
        await this.upsertDiscoveryCandidate({
          campaignId: tile.campaignId,
          scanTileId: tile.id,
          sourceId: "osm",
          sourceKey: b.osmId,
          lat: b.lat,
          lng: b.lng,
          payloadJson: {
            buildingType: b.buildingType,
            roofAreaM2: b.roofAreaM2,
            heightMeters: b.heightMeters,
          },
        });

        buildingsFound++;
      }

      await this.completeTile(tile.id, buildingsFound);
      await this.updateCampaignProgress(tile.campaignId);
      return { success: true, buildingsFound };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await this.failTile(tile.id, errorMsg);
      await this.updateCampaignProgress(tile.campaignId);
      throw err;
    }
  }
}
