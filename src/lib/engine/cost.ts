export interface CostResult {
  systemSizeKwp: number;
  panelCount: number;
  annualProductionKwh: number;
  totalCostAed: number;
  annualSavingsAed: number;
  paybackYears: number;
  npv25yrAed: number;
  co2OffsetTons: number;
}

import type { TemperatureData } from "@/lib/irradiance/temperature";

/**
 * UAE cost-per-watt lookup table based on system size.
 */
function getCostPerWatt(systemSizeKwp: number): number {
  if (systemSizeKwp < 50) return 2.1;
  if (systemSizeKwp >= 50 && systemSizeKwp < 250) return 1.85;
  if (systemSizeKwp >= 250 && systemSizeKwp < 500) return 1.75;
  return 1.6;
}

/**
 * Calculate all financial and performance metrics for a solar installation.
 *
 * Uses the formulas from Section 5.3 of the SolarZero plan:
 * - STEP 3: System sizing from roof area
 * - STEP 4: Energy production with UAE-adjusted performance ratio
 * - STEP 5: Cost, savings, payback, NPV, CO2 offset
 */
export function calculateCosts(
  roofAreaM2: number,
  ghiAnnual: number, // kWh/m²/year
  dewaTariffKwh: number = 0.32,
  temperatureData?: TemperatureData | null,
): CostResult {
  // STEP 3: System sizing
  // USABLE_AREA = roofAreaM2 × 0.85 × 0.82 (setback × usable roof ratio)
  const usableArea = roofAreaM2 * 0.85 * 0.82;

  // PANEL_AREA = 2.58 m² (standard 550W panel)
  const PANEL_AREA = 2.58;

  // PANEL_COUNT = floor(USABLE_AREA / PANEL_AREA × 0.70)
  // 0.70 = panel packing factor (not all area can fit panels)
  const panelCount = Math.floor((usableArea / PANEL_AREA) * 0.7);

  // SYSTEM_SIZE_KWP = PANEL_COUNT × 0.550 (550W panels)
  const systemSizeKwp = panelCount * 0.55;

  // STEP 4: Energy production
  // Dynamic performance ratio: 0.85 (inverter+wiring) × tempDerating × 0.95 (soiling) × 0.97 (mismatch)
  // Falls back to legacy 0.78 when no temperature data is available
  const PERFORMANCE_RATIO = temperatureData
    ? 0.85 * temperatureData.deratingFactor * (1 - 0.05) * (1 - 0.03)
    : 0.78;
  const annualProductionKwh = systemSizeKwp * ghiAnnual * PERFORMANCE_RATIO;

  // STEP 5: Cost estimation
  const costPerWatt = getCostPerWatt(systemSizeKwp);
  const totalCostAed = systemSizeKwp * 1000 * costPerWatt;
  const annualSavingsAed = annualProductionKwh * dewaTariffKwh;
  const paybackYears =
    annualSavingsAed > 0 ? totalCostAed / annualSavingsAed : 999;

  // NPV over 25 years with 8% discount rate and 0.45% annual degradation
  // NPV_25YR = -TOTAL_COST + Σ(SAVINGS × 0.9955^n / 1.08^n) for n=1..25
  let npv25yrAed = -totalCostAed;
  const degradationFactor = 0.9955; // 0.45% annual degradation
  const discountRate = 1.08;
  for (let n = 1; n <= 25; n++) {
    const degradedSavings = annualSavingsAed * Math.pow(degradationFactor, n);
    const discounted = degradedSavings / Math.pow(discountRate, n);
    npv25yrAed += discounted;
  }

  // CO2 offset: PRODUCTION_MWH × 0.42 tons CO2/MWh
  const productionMwh = annualProductionKwh / 1000;
  const co2OffsetTons = productionMwh * 0.42;

  return {
    systemSizeKwp,
    panelCount,
    annualProductionKwh,
    totalCostAed,
    annualSavingsAed,
    paybackYears: Math.round(paybackYears * 10) / 10,
    npv25yrAed: Math.round(npv25yrAed),
    co2OffsetTons: Math.round(co2OffsetTons * 100) / 100,
  };
}
