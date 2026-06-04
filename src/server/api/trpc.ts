import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { auth } from "@/lib/auth";
import type { Session } from "next-auth";

/**
 * Context type for tRPC - includes session for auth checks.
 */
interface CreateContextOptions {
  session: Session | null;
}

/**
 * Creates the tRPC context for each request.
 * Extracts the session from NextAuth for use in protected procedures.
 */
export const createTRPCContext = async (_opts?: CreateContextOptions) => {
  const session = _opts?.session ?? null;
  return { session };
};

/**
 * tRPC instance with context and transformer configured.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

/**
 * Create a tRPC router.
 */
export const router = t.router;

/**
 * Public (unauthenticated) procedure.
 */
export const publicProcedure = t.procedure;

/**
 * Enforce that the user is authenticated.
 * Throws UNAUTHORIZED if no session exists.
 */
const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: { session: ctx.session },
  });
});

/**
 * Protected (authenticated) procedure.
 * Requires a valid session - throws UNAUTHORIZED otherwise.
 */
export const protectedProcedure = t.procedure.use(enforceAuth);
