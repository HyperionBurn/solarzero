import { queryBuildingsAround } from "@/lib/osm/client";
import { parseOSMBuilding } from "@/lib/osm/parser";
import { getSolcastGHI } from "@/lib/irradiance/solcast";
import { getUAEIrradiance } from "@/lib/irradiance/uae-model";
import {
  getTemperatureDerating,
  type TemperatureData,
} from "@/lib/irradiance/temperature";
import { calculateCosts } from "@/lib/engine/cost";
import {
  getCachedOSM,
  setCachedOSM,
  getCachedSolcast,
  setCachedSolcast,
  getCachedAssessment,
  setCachedAssessment,
} from "@/lib/engine/cache";

export interface AssessmentResult {
  roofAreaM2: number;
  buildingType: string;
  osmId: string;
  osmType: string;
  heightMeters: number | null;
  ghiAnnual: number;
  dataSource: string;
  systemSizeKwp: number;
  panelCount: number;
  annualProductionKwh: number;
  totalCostAed: number;
  annualSavingsAed: number;
  paybackYears: number;
  npv25yrAed: number;
  co2OffsetTons: number;
  dewaTariffAed: number;
  rawResponseJson: Record<string, unknown>;
  temperatureDerating?: number;
  temperatureDataSource?: string;
}

export interface AssessmentBuildingContext {
  roofAreaM2?: number | null;
  buildingType?: string | null;
  osmId?: string | null;
  osmType?: string | null;
  heightMeters?: number | null;
}

interface SolarResource {
  ghiAnnual: number;
  dataSource: string;
  temperatureData: TemperatureData | null;
}

interface BuildingFootprint {
  roofAreaM2: number;
  buildingType: string;
  osmId: string;
  osmType: string;
  heightMeters: number | null;
}

/**
 * Run the 5-step Hybrid Assessment Engine for a building location.
 *
 * @param lat - Building latitude
 * @param lng - Building longitude
 * @param radius - OSM search radius in meters (default: 100)
 * @param dewaTariffAed - DEWA electricity tariff in AED/kWh (default: 0.32)
 *
 * Algorithm (Section 5.3):
 * STEP 1: OSM Overpass API → building footprint polygon → roofAreaM2, buildingType
 *         or use the stored building record when available
 * STEP 2: Solcast (primary) / Custom model (fallback) → GHI annual kWh/m²/yr
 * STEP 3: USABLE_AREA = roofAreaM2 × 0.85 × 0.82
 *         PANEL_COUNT = floor(USABLE_AREA / 2.58 × 0.70)
 *         SYSTEM_SIZE_KWP = PANEL_COUNT × 0.550
 * STEP 4: ANNUAL_PRODUCTION_KWH = SYSTEM_SIZE_KWP × GHI × 0.78
 * STEP 5: Cost per watt lookup, total cost, savings, payback, NPV, CO2
 */
export async function runAssessment(
  lat: number,
  lng: number,
  radius: number = 100,
  dewaTariffAed: number = 0.32,
  buildingContext?: AssessmentBuildingContext,
): Promise<AssessmentResult> {
  const buildingFootprint = await resolveBuildingFootprint(lat, lng, radius, buildingContext);
  const solarResource = await getSolarResource(lat, lng);

  return buildAssessmentResult({
    lat,
    lng,
    buildingFootprint,
    solarResource,
    dewaTariffAed,
    assessmentSource: buildingContext?.roofAreaM2 && buildingContext.roofAreaM2 > 0 ? "BUILDING_RECORD" : "OSM_QUERY",
  });
}

/**
 * Run assessment and attempt to cache the result.
 */
export async function runAssessmentWithCache(
  lat: number,
  lng: number,
  buildingId: string,
  radius: number = 100,
  dewaTariffAed: number = 0.32,
  buildingContext?: AssessmentBuildingContext,
): Promise<AssessmentResult> {
  const cached = await getCachedAssessment<AssessmentResult>(buildingId);
  if (cached) {
    return cached;
  }

  const result = await runAssessment(lat, lng, radius, dewaTariffAed, buildingContext);

  // Cache the result
  await setCachedAssessment(buildingId, result as unknown as Record<string, unknown>);

  return result;
}

async function resolveBuildingFootprint(
  lat: number,
  lng: number,
  radius: number,
  buildingContext?: AssessmentBuildingContext,
): Promise<BuildingFootprint> {
  if (buildingContext?.roofAreaM2 && buildingContext.roofAreaM2 > 0) {
    return {
      roofAreaM2: buildingContext.roofAreaM2,
      buildingType: buildingContext.buildingType ?? "unknown",
      osmId: buildingContext.osmId ?? "building/unknown",
      osmType: buildingContext.osmType ?? "building",
      heightMeters: buildingContext.heightMeters ?? null,
    };
  }

  // === STEP 1: Get building footprint from OSM (cached) ===
  let osmData;
  const cachedOSM = await getCachedOSM(lat, lng);
  if (cachedOSM) {
    osmData = cachedOSM;
  } else {
    osmData = await queryBuildingsAround(lat, lng, radius);
    await setCachedOSM(lat, lng, osmData);
  }

  const parsedBuilding = parseOSMBuilding(osmData);
  if (!parsedBuilding) {
    throw new Error(
      `No building found at lat=${lat}, lng=${lng} within ${radius}m radius`,
    );
  }

  return parsedBuilding;
}

async function getSolarResource(lat: number, lng: number): Promise<SolarResource> {
  // === STEP 2: Get GHI irradiance (Solcast → cache → UAE model fallback) ===
  let ghiAnnual: number;
  let dataSource: string;

  const cachedGHI = await getCachedSolcast(lat, lng);
  if (cachedGHI !== null && cachedGHI > 0) {
    ghiAnnual = cachedGHI;
    dataSource = "SOLCAST_CACHED";
  } else {
    const solcastGHI = await getSolcastGHI(lat, lng);
    if (solcastGHI !== null && solcastGHI > 0) {
      ghiAnnual = solcastGHI;
      dataSource = "SOLCAST";
      await setCachedSolcast(lat, lng, solcastGHI);
    } else {
      ghiAnnual = getUAEIrradiance(lat, lng);
      dataSource = "UAE_MODEL";
    }
  }

  // === STEP 2.5: Get temperature derating for dynamic PR ===
  const temperatureData = await getTemperatureDerating(lat, lng);

  return {
    ghiAnnual,
    dataSource,
    temperatureData,
  };
}

function buildAssessmentResult({
  lat,
  lng,
  buildingFootprint,
  solarResource,
  dewaTariffAed,
  assessmentSource,
}: {
  lat: number;
  lng: number;
  buildingFootprint: BuildingFootprint;
  solarResource: SolarResource;
  dewaTariffAed: number;
  assessmentSource: "OSM_QUERY" | "BUILDING_RECORD";
}): AssessmentResult {
  const costs = calculateCosts(
    buildingFootprint.roofAreaM2,
    solarResource.ghiAnnual,
    dewaTariffAed,
    solarResource.temperatureData,
  );

  return {
    roofAreaM2: Math.round(buildingFootprint.roofAreaM2 * 100) / 100,
    buildingType: buildingFootprint.buildingType,
    osmId: buildingFootprint.osmId,
    osmType: buildingFootprint.osmType,
    heightMeters: buildingFootprint.heightMeters,
    ghiAnnual: Math.round(solarResource.ghiAnnual),
    dataSource: solarResource.dataSource,
    systemSizeKwp: Math.round(costs.systemSizeKwp * 100) / 100,
    panelCount: costs.panelCount,
    annualProductionKwh: Math.round(costs.annualProductionKwh),
    totalCostAed: Math.round(costs.totalCostAed),
    annualSavingsAed: Math.round(costs.annualSavingsAed),
    paybackYears: costs.paybackYears,
    npv25yrAed: costs.npv25yrAed,
    co2OffsetTons: costs.co2OffsetTons,
    dewaTariffAed,
    temperatureDerating: solarResource.temperatureData?.deratingFactor,
    temperatureDataSource: solarResource.temperatureData?.dataSource,
    rawResponseJson: {
      lat,
      lng,
      buildingType: buildingFootprint.buildingType,
      osmId: buildingFootprint.osmId,
      osmType: buildingFootprint.osmType,
      roofAreaM2: Math.round(buildingFootprint.roofAreaM2 * 100) / 100,
      dataSource: solarResource.dataSource,
      assessmentSource,
      computedAt: new Date().toISOString(),
    },
  };
}
