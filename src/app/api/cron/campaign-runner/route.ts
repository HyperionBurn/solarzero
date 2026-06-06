import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AutonomousDiscoveryService } from "@/server/services/autonomousDiscovery";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;

  // Enforce CRON_SECRET if configured in env
  if (cronSecret && secret !== cronSecret) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const startTime = Date.now();
  const maxExecutionTimeMs = 8000; // 8 seconds budget (Vercel hobby limit is 10s)
  const limit = 2; // Process up to 2 tiles per invocation

  const results: Array<{
    tileId: string;
    campaignId: string;
    status: "success" | "failed" | "skipped";
    buildingsFound?: number;
    error?: string;
    reason?: string;
  }> = [];

  try {
    // 1. Fetch active campaigns (status pending or running)
    const activeCampaigns = await db.scanCampaign.findMany({
      where: {
        status: { in: ["pending", "running"] },
      },
      select: { id: true },
    });

    if (activeCampaigns.length === 0) {
      return NextResponse.json({
        message: "No active campaigns to process",
        processed: 0,
        results,
      });
    }

    const campaignIds = activeCampaigns.map((c) => c.id);

    // 2. Fetch pending tiles for active campaigns
    const pendingTiles = await db.scanTile.findMany({
      where: {
        campaignId: { in: campaignIds },
        status: "pending",
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    if (pendingTiles.length === 0) {
      // It is possible all campaigns have completed all tiles but their status is not updated.
      // Proactively trigger progress update on active campaigns
      for (const campaignId of campaignIds) {
        await AutonomousDiscoveryService.updateCampaignProgress(campaignId);
      }

      return NextResponse.json({
        message: "No pending tiles found",
        processed: 0,
        results,
      });
    }

    // 3. Process tiles sequentially
    for (const tile of pendingTiles) {
      // Check if we have exceeded our execution budget
      const elapsed = Date.now() - startTime;
      if (elapsed >= maxExecutionTimeMs) {
        results.push({
          tileId: tile.id,
          campaignId: tile.campaignId,
          status: "skipped",
          reason: `Time budget exceeded (${elapsed}ms elapsed)`,
        });
        continue;
      }

      try {
        // Trigger campaign update to running if it was pending
        const campaign = await db.scanCampaign.findUnique({
          where: { id: tile.campaignId },
        });
        if (campaign && campaign.status === "pending") {
          await db.scanCampaign.update({
            where: { id: tile.campaignId },
            data: { status: "running" },
          });
        }

        // Execute tile
        const executionResult = await AutonomousDiscoveryService.executeTile(tile.id);
        
        results.push({
          tileId: tile.id,
          campaignId: tile.campaignId,
          status: "success",
          buildingsFound: executionResult.buildingsFound,
        });

        // Update campaign progress
        await AutonomousDiscoveryService.updateCampaignProgress(tile.campaignId);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        
        results.push({
          tileId: tile.id,
          campaignId: tile.campaignId,
          status: "failed",
          error: errorMsg,
        });

        // Update campaign progress on failure as well
        await AutonomousDiscoveryService.updateCampaignProgress(tile.campaignId);
      }
    }

    const durationMs = Date.now() - startTime;
    return NextResponse.json({
      message: `Processed ${results.filter(r => r.status !== "skipped").length} tiles`,
      processed: results.length,
      results,
      durationMs,
    });

  } catch (globalErr) {
    const errorMsg = globalErr instanceof Error ? globalErr.message : String(globalErr);
    return NextResponse.json(
      {
        message: "Global execution error",
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
