import { OpportunityService } from "../src/server/services/opportunity";
import { db } from "../src/lib/db";

async function main() {
  console.log("Starting backfill for existing buildings into opportunities...");
  const start = Date.now();
  const results = await OpportunityService.backfillAll();
  const duration = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`Backfill complete in ${duration}s.`);
  console.log(`Total buildings scanned: ${results.totalBuildings}`);
  console.log(`Successfully backfilled: ${results.backfilled}`);
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
