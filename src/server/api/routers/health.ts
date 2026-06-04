import { publicProcedure, router } from "../trpc";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";

export const healthRouter = router({
  /**
   * Basic health check — always returns ok.
   */
  status: publicProcedure.query(() => {
    return { status: "ok" as const };
  }),

  /**
   * Deep health check — verifies database and Redis connectivity.
   */
  deep: publicProcedure.query(async () => {
    const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

    // Database check
    try {
      const start = Date.now();
      await db.$queryRaw`SELECT 1`;
      checks.database = {
        status: "ok",
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      checks.database = {
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }

    // Redis check
    try {
      const start = Date.now();
      await redis.ping();
      checks.redis = {
        status: "ok",
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      checks.redis = {
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }

    const allOk = Object.values(checks).every((c) => c.status === "ok");

    return {
      status: allOk ? "ok" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    };
  }),
});
