import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";

/**
 * Server-side caller for tRPC procedures.
 * Use this in Server Components, Server Actions, and Route Handlers
 * to call tRPC procedures directly without an HTTP request.
 */
export const serverClient = appRouter.createCaller(
  createTRPCContext().then((ctx) => ctx),
);
