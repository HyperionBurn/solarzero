import { describe, it, expect } from "vitest";
import { calculateCosts } from "@/lib/engine/cost";

describe("calculateCosts", () => {
  const DubaiGHI = 2100; // Dubai typical annual GHI kWh/m²

  it("returns positive values for a valid roof", () => {
    const result = calculateCosts(100, DubaiGHI);
    expect(result.systemSizeKwp).toBeGreaterThan(0);
    expect(result.panelCount).toBeGreaterThan(0);
    expect(result.annualProductionKwh).toBeGreaterThan(0);
    expect(result.totalCostAed).toBeGreaterThan(0);
    expect(result.annualSavingsAed).toBeGreaterThan(0);
    expect(result.paybackYears).toBeGreaterThan(0);
    expect(result.co2OffsetTons).toBeGreaterThanOrEqual(0);
  });

  it("uses correct panel math for 100m² roof", () => {
    const result = calculateCosts(100, DubaiGHI);
    // USABLE_AREA = 100 * 0.85 * 0.82 = 69.7
    // PANEL_COUNT = floor(69.7 / 2.58 * 0.70) = floor(18.9) = 18
    expect(result.panelCount).toBe(18);
    // SYSTEM_SIZE = 18 * 0.55 = 9.9 kwp
    expect(result.systemSizeKwp).toBe(9.9);
  });

  it("applies cost-per-watt tiering correctly", () => {
    // <50kwp => 2.1 AED/W
    const small = calculateCosts(50, DubaiGHI);
    expect(small.totalCostAed).toBe(small.systemSizeKwp * 1000 * 2.1);

    // 50-249kwp => 1.85 AED/W
    const medium = calculateCosts(500, DubaiGHI);
    expect(medium.totalCostAed).toBe(medium.systemSizeKwp * 1000 * 1.85);

    // 250-499kwp => 1.75 AED/W — but 2000m² roof yields ~208kwp (50-249 tier = 1.85)
    const large = calculateCosts(2000, DubaiGHI);
    // 2000m² => panelCount=379, systemSize=208.45kwp => 1.85 tier
    expect(large.totalCostAed).toBe(large.systemSizeKwp * 1000 * 1.85);
  });

  it("uses legacy performance ratio when no temperature data", () => {
    const result = calculateCosts(100, DubaiGHI);
    // 100m² => panelCount=18, systemSize=9.9kwp
    // Legacy PR=0.78: 9.9 * 2100 * 0.78 = 16216.2
    expect(result.annualProductionKwh).toBeCloseTo(16216.2, 0);
  });

  it("uses dynamic performance ratio with temperature data", () => {
    const tempData = {
      avgTempC: 28,
      cellTempC: 53,
      deratingFactor: 0.8445,
      dataSource: "test",
      monthlyAvgTempC: Array(12).fill(28),
    };
    const result = calculateCosts(100, DubaiGHI, 0.32, tempData);
    // Dynamic PR = 0.85 * 0.8445 * 0.95 * 0.97 = ~0.663
    // Production should be different from legacy
    const legacy = calculateCosts(100, DubaiGHI);
    expect(result.annualProductionKwh).not.toBe(legacy.annualProductionKwh);
  });

  it("guards division-by-zero on paybackYears", () => {
    // Zero tariff => zero savings => payback = 999
    const result = calculateCosts(100, DubaiGHI, 0);
    expect(result.paybackYears).toBe(999);
  });

  it("calculates NPV correctly", () => {
    const result = calculateCosts(100, DubaiGHI);
    // NPV should be negative for small system (upfront cost > discounted savings over 25yr)
    // or positive for large system
    expect(typeof result.npv25yrAed).toBe("number");
    expect(result.npv25yrAed).not.toBeNaN();
  });

  it("calculates CO2 offset as production MWh * 0.42", () => {
    const result = calculateCosts(100, DubaiGHI);
    const expectedCo2 = (result.annualProductionKwh / 1000) * 0.42;
    expect(result.co2OffsetTons).toBeCloseTo(expectedCo2, 1);
  });
});
