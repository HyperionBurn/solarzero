import { describe, it, expect } from "vitest";
import { calculateCosts } from "@/lib/engine/cost";

describe("calculateCosts", () => {
  const GHI_DUBAI = 2100; // kWh/m2/yr typical Dubai GHI

  it("calculates system size proportionally to roof area", () => {
    const r1 = calculateCosts(100, GHI_DUBAI);
    const r2 = calculateCosts(200, GHI_DUBAI);
    expect(r2.systemSizeKwp).toBeGreaterThan(r1.systemSizeKwp);
    expect(r2.panelCount).toBeGreaterThan(r1.panelCount);
  });

  it("returns zero-size system for zero roof area", () => {
    const result = calculateCosts(0, GHI_DUBAI);
    expect(result.systemSizeKwp).toBe(0);
    expect(result.panelCount).toBe(0);
    expect(result.annualProductionKwh).toBe(0);
    expect(result.totalCostAed).toBe(0);
    expect(result.annualSavingsAed).toBe(0);
  });

  it("uses higher cost-per-watt for small systems (<50 kWp)", () => {
    // ~100 m2 roof -> ~10 kWp -> should use 2.1 AED/W
    const result = calculateCosts(100, GHI_DUBAI);
    const expectedCost = result.systemSizeKwp * 1000 * 2.1;
    expect(result.totalCostAed).toBeCloseTo(expectedCost, -1);
  });

  it("uses medium cost-per-watt for mid systems (50-250 kWp)", () => {
    // ~1000 m2 roof -> ~100 kWp -> should use 1.85 AED/W
    const result = calculateCosts(1000, GHI_DUBAI);
    const expectedCost = result.systemSizeKwp * 1000 * 1.85;
    expect(result.totalCostAed).toBeCloseTo(expectedCost, -1);
  });

  it("switches to 1.75 AED/W for 250-500 kWp systems", () => {
    // ~3000 m2 roof -> ~300 kWp -> should use 1.75 AED/W
    const result = calculateCosts(3000, GHI_DUBAI);
    const expectedCost = result.systemSizeKwp * 1000 * 1.75;
    expect(result.totalCostAed).toBeCloseTo(expectedCost, -1);
  });

  it("uses lowest cost-per-watt for large systems (500+ kWp)", () => {
    // ~6000 m2 roof -> ~600 kWp -> should use 1.6 AED/W
    const result = calculateCosts(6000, GHI_DUBAI);
    const expectedCost = result.systemSizeKwp * 1000 * 1.6;
    expect(result.totalCostAed).toBeCloseTo(expectedCost, -1);
  });

  it("calculates annual production with default performance ratio (0.78)", () => {
    const result = calculateCosts(100, GHI_DUBAI);
    const expectedProduction = result.systemSizeKwp * GHI_DUBAI * 0.78;
    expect(result.annualProductionKwh).toBeCloseTo(expectedProduction, -1);
  });

  it("applies temperature derating when temperature data is provided", () => {
    const withoutTemp = calculateCosts(100, GHI_DUBAI);
    const withTemp = calculateCosts(100, GHI_DUBAI, 0.32, {
      deratingFactor: 0.92,
      dataSource: "SOLCAST",
      avgTempC: 32,
      cellTempC: 45,
      monthlyAvgTempC: [25, 26, 28, 32, 35, 38, 40, 40, 38, 34, 30, 26],
    });
    // With thermal derating 0.92, performance ratio = 0.85 * 0.92 * 0.95 * 0.97 = 0.720
    // Without thermal derating, PR = 0.78
    // So production should be lower with temp data
    expect(withTemp.annualProductionKwh).toBeLessThan(withoutTemp.annualProductionKwh);
  });

  it("calculates annual savings based on tariff", () => {
    const HIGH_TARIFF = 0.45;
    const LOW_TARIFF = 0.25;
    const high = calculateCosts(100, GHI_DUBAI, HIGH_TARIFF);
    const low = calculateCosts(100, GHI_DUBAI, LOW_TARIFF);
    expect(high.annualSavingsAed).toBeGreaterThan(low.annualSavingsAed);
  });

  it("returns finite payback for positive savings", () => {
    const result = calculateCosts(100, GHI_DUBAI);
    expect(result.paybackYears).toBeGreaterThan(0);
    expect(result.paybackYears).toBeLessThan(50);
  });

  it("returns 999 payback when savings are zero", () => {
    const result = calculateCosts(100, 0);
    expect(result.paybackYears).toBe(999);
  });

  it("returns positive NPV for typical Dubai solar installation", () => {
    const result = calculateCosts(100, GHI_DUBAI);
    expect(result.npv25yrAed).toBeGreaterThan(0);
  });

  it("calculates CO2 offset proportional to annual production", () => {
    const small = calculateCosts(50, GHI_DUBAI);
    const big = calculateCosts(500, GHI_DUBAI);
    expect(big.co2OffsetTons).toBeGreaterThan(small.co2OffsetTons);
  });

  it("rounds payback to 1 decimal place", () => {
    const result = calculateCosts(100, GHI_DUBAI);
    const decimalPart = result.paybackYears * 10;
    expect(decimalPart).toBe(Math.round(decimalPart));
  });

  it("rounds NPV to nearest integer", () => {
    const result = calculateCosts(100, GHI_DUBAI);
    expect(result.npv25yrAed).toBe(Math.round(result.npv25yrAed));
  });

  it("rounds CO2 offset to 2 decimal places", () => {
    const result = calculateCosts(100, GHI_DUBAI);
    const decimalPart = result.co2OffsetTons * 100;
    expect(decimalPart).toBe(Math.round(decimalPart));
  });
});
