import { db } from "../src/lib/db";
import { queryBuildingByOsmElement } from "../src/lib/osm/client";
import { parseOSMBuilding } from "../src/lib/osm/parser";

type OsmIdParts = {
  osmType: "way" | "relation";
  osmId: number;
};

function parseOsmId(osmId: string | null): OsmIdParts | null {
  if (!osmId) return null;
  const [osmType, rawId] = osmId.split("/");
  if ((osmType !== "way" && osmType !== "relation") || !rawId) return null;
  const osmIdNumber = Number(rawId);
  if (!Number.isFinite(osmIdNumber)) return null;
  return { osmType, osmId: osmIdNumber };
}

async function backfillBuildingName(building: {
  id: string;
  osmId: string | null;
  name: string | null;
  address: string;
}) {
  if (building.name) return { updated: false, found: false };

  const parts = parseOsmId(building.osmId);
  if (!parts) return { updated: false, found: false };

  try {
    const osmData = await queryBuildingByOsmElement(parts.osmType, parts.osmId);
    const parsed = parseOSMBuilding(osmData);
    const name = parsed?.name?.trim() || null;

    if (!name) {
      return { updated: false, found: false };
    }

    await db.building.update({
      where: { id: building.id },
      data: { name },
    });

    return { updated: true, found: true };
  } catch (error) {
    console.error(`Failed to backfill building ${building.id}:`, error);
    return { updated: false, found: false };
  }
}

async function main() {
  const buildings = await db.building.findMany({
    where: {
      name: null,
      osmId: { not: null },
    },
    select: {
      id: true,
      osmId: true,
      name: true,
      address: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${buildings.length} buildings missing real names.`);

  let updated = 0;
  let found = 0;

  const concurrency = 4;
  for (let i = 0; i < buildings.length; i += concurrency) {
    const batch = buildings.slice(i, i + concurrency);
    const results = await Promise.all(batch.map((building) => backfillBuildingName(building)));
    for (const result of results) {
      if (result.found) found++;
      if (result.updated) updated++;
    }
    console.log(`Processed ${Math.min(i + concurrency, buildings.length)}/${buildings.length} ... updated=${updated}, found=${found}`);
  }

  console.log(`Backfill finished. Updated ${updated} buildings with real OSM names.`);
}

main()
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
