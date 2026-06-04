import { router } from "./trpc";
import { healthRouter } from "./routers/health";
import { buildingRouter } from "./routers/building";
import { assessmentRouter } from "./routers/assessment";
import { proposalRouter } from "./routers/proposal";

export const appRouter = router({
  health: healthRouter,
  building: buildingRouter,
  assessment: assessmentRouter,
  proposal: proposalRouter,
});

export type AppRouter = typeof appRouter;
