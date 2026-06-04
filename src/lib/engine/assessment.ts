import { queryBuildingsAround } from "@/lib/osm/client";
import { parseOSMBuilding } from "@/lib/osm/parser";
import { getSolcastGHI } from "@/lib/irradiance/solcast";
import { getUAEIrradiance } from "@/lib/irradiance/uae-model";
import { getTemperatureDerating } from "@/lib/irradiance/temperature";
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
): Promise<AssessmentResult> {
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

  // === STEPS 3-5: System sizing and cost ===
  const costs = calculateCosts(parsedBuilding.roofAreaM2, ghiAnnual, dewaTariffAed, temperatureData);

  const result: AssessmentResult = {
    roofAreaM2: Math.round(parsedBuilding.roofAreaM2 * 100) / 100,
    buildingType: parsedBuilding.buildingType,
    osmId: parsedBuilding.osmId,
    osmType: parsedBuilding.osmType,
    heightMeters: parsedBuilding.heightMeters,
    ghiAnnual: Math.round(ghiAnnual),
    dataSource,
    systemSizeKwp: Math.round(costs.systemSizeKwp * 100) / 100,
    panelCount: costs.panelCount,
    annualProductionKwh: Math.round(costs.annualProductionKwh),
    totalCostAed: Math.round(costs.totalCostAed),
    annualSavingsAed: Math.round(costs.annualSavingsAed),
    paybackYears: costs.paybackYears,
    npv25yrAed: costs.npv25yrAed,
    co2OffsetTons: costs.co2OffsetTons,
    dewaTariffAed,
    temperatureDerating: temperatureData?.deratingFactor,
    temperatureDataSource: temperatureData?.dataSource,
    rawResponseJson: {
      lat,
      lng,
      buildingType: parsedBuilding.buildingType,
      osmId: parsedBuilding.osmId,
      dataSource,
      computedAt: new Date().toISOString(),
    },
  };

  return result;
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
): Promise<AssessmentResult> {
  const cached = await getCachedAssessment(buildingId);
  if (cached) {
    return cached as unknown as AssessmentResult;
  }

  const result = await runAssessment(lat, lng, radius, dewaTariffAed);

  // Cache the result
  await setCachedAssessment(buildingId, result as unknown as Record<string, unknown>);

  return result;
}
