import { router } from "./trpc";
import { healthRouter } from "./routers/health";
import { buildingRouter } from "./routers/building";
import { assessmentRouter } from "./routers/assessment";
import { proposalRouter } from "./routers/proposal";
import { opportunityRouter } from "./routers/opportunity";
import { campaignRouter } from "./routers/campaign";

export const appRouter = router({
  health: healthRouter,
  building: buildingRouter,
  assessment: assessmentRouter,
  proposal: proposalRouter,
  opportunity: opportunityRouter,
  campaign: campaignRouter,
});


export type AppRouter = typeof appRouter;
