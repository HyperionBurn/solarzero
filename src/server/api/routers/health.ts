import { protectedProcedure, publicProcedure, router } from "../trpc";
import { db } from "@/lib/db";
import { redis, redisIsMock } from "@/lib/redis";

export const healthRouter = router({
  /**
   * Basic health check — always returns ok.
   */
  status: publicProcedure.query(() => {
    return { status: "ok" as const };
  }),

  /**
   * Authenticated smoke check for production verification.
   */
  authenticated: protectedProcedure.query(({ ctx }) => {
    const user = ctx.session.user;

    return {
      status: "ok" as const,
      authenticated: true,
      user: {
        hasId: Boolean(user?.id),
        email: user?.email ?? null,
      },
      timestamp: new Date().toISOString(),
    };
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
        status: redisIsMock ? "degraded" : "ok",
        latencyMs: Date.now() - start,
        error: redisIsMock ? "Redis not configured; using in-memory fallback" : undefined,
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
