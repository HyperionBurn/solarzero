import { publicProcedure, router } from "../trpc";

export const healthRouter = router({
  status: publicProcedure.query(() => {
    return { status: "ok" as const };
  }),
});
