import { describe, expect, it } from "vitest";
import { parseOSMBuildings } from "@/lib/osm/parser";
import type { OSMResponse } from "@/lib/osm/client";
import { getBuildingDisplayName } from "@/lib/building-display";

const osmFixture: OSMResponse = {
  version: 0.6,
  generator: "test",
  osm3s: {
    timestamp_osm_base: "2026-06-06T00:00:00Z",
    copyright: "OpenStreetMap contributors",
  },
  elements: [
    {
      type: "way",
      id: 1,
      tags: {
        building: "commercial",
        name: "Burj Alpha",
      },
      geometry: [
        { lat: 25.1, lon: 55.1 },
        { lat: 25.1, lon: 55.1005 },
        { lat: 25.1005, lon: 55.1005 },
        { lat: 25.1005, lon: 55.1 },
      ],
    },
    {
      type: "way",
      id: 2,
      tags: {
        building: "commercial",
        name: "Commercial Building",
      },
      geometry: [
        { lat: 25.2, lon: 55.2 },
        { lat: 25.2, lon: 55.2005 },
        { lat: 25.2005, lon: 55.2005 },
        { lat: 25.2005, lon: 55.2 },
      ],
    },
  ],
};

describe("OSM building parsing", () => {
  it("extracts real OSM names and ignores generic placeholders", () => {
    const buildings = parseOSMBuildings(osmFixture);

    expect(buildings).toHaveLength(2);
    expect(buildings[0]?.name).toBe("Burj Alpha");
    expect(buildings[1]?.name).toBeNull();
  });

  it("prefers a real building name over the address fallback", () => {
    expect(
      getBuildingDisplayName({
        name: "Burj Alpha",
        address: "Commercial Building in Dubai Mall, Dubai",
      }),
    ).toBe("Burj Alpha");
  });

  it("falls back to a neutral placeholder when the real name is missing", () => {
    expect(
      getBuildingDisplayName({
        name: null,
        address: "Commercial Building in Dubai Mall, Dubai",
      }),
    ).toBe("Unnamed building");
  });
});
