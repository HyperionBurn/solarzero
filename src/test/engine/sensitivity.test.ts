import { describe, it, expect } from "vitest";
import { calculateSensitivity, CONSERVATIVE, EXPECTED, OPTIMISTIC } from "@/lib/engine/sensitivity";
import type { SensitivityInput } from "@/lib/engine/sensitivity";

const mockAssessment: SensitivityInput = {
  totalCostAed: 100_000,
  annualSavingsAed: 15_000,
  annualProductionKwh: 18_000,
  npv25yrAed: 75_000,
  paybackYears: 6.7,
  dewaTariffAed: 0.32,
};

describe("calculateSensitivity", () => {
  it("preserves baseline values from assessment", () => {
    const result = calculateSensitivity(mockAssessment, EXPECTED);
    expect(result.baselineNpv).toBe(75_000);
    expect(result.baselinePayback).toBe(6.7);
  });

  it("returns adjusted annual savings matching tariff adjustment", () => {
    // EXPECTED: tariffPercent=0 → modifiedSavings = 18000 * 0.32 = 5760
    const result = calculateSensitivity(mockAssessment, EXPECTED);
    expect(result.adjustedAnnualSavings).toBe(5760);
  });

  it("CONSERVATIVE preset produces lower NPV than baseline", () => {
    const result = calculateSensitivity(mockAssessment, CONSERVATIVE);
    expect(result.adjustedNpv).toBeLessThan(result.baselineNpv);
    expect(result.adjustedPayback).toBeGreaterThan(result.baselinePayback);
  });

  it("OPTIMISTIC preset produces higher adjustedAnnualSavings than EXPECTED", () => {
    const expected = calculateSensitivity(mockAssessment, EXPECTED);
    const optimistic = calculateSensitivity(mockAssessment, OPTIMISTIC);
    expect(optimistic.adjustedAnnualSavings).toBeGreaterThan(expected.adjustedAnnualSavings);
    expect(optimistic.adjustedPayback).toBeLessThan(expected.adjustedPayback);
  });

  it("tornado data has 4 items sorted by impact descending", () => {
    const result = calculateSensitivity(mockAssessment, EXPECTED);
    expect(result.tornadoData).toHaveLength(4);
    for (let i = 1; i < result.tornadoData.length; i++) {
      expect(result.tornadoData[i].impact).toBeLessThanOrEqual(result.tornadoData[i - 1].impact);
    }
  });

  it("tornado items have expected keys", () => {
    const result = calculateSensitivity(mockAssessment, EXPECTED);
    const keys = result.tornadoData.map((t) => t.variable);
    expect(keys.sort()).toEqual(["costPercent", "degradationPercent", "discountRatePercent", "tariffPercent"]);
  });

  it("guards division-by-zero on payback with zero tariff", () => {
    const zeroTariff: SensitivityInput = { ...mockAssessment, dewaTariffAed: 0, annualProductionKwh: 0 };
    const result = calculateSensitivity(zeroTariff, EXPECTED);
    expect(result.adjustedPayback).toBe(999);
  });

  it("handles negative baseline NPV", () => {
    const negativeNpv: SensitivityInput = { ...mockAssessment, npv25yrAed: -10_000 };
    const result = calculateSensitivity(negativeNpv, EXPECTED);
    expect(result.baselineNpv).toBe(-10_000);
  });

  it("handles zero total cost", () => {
    const zeroCost: SensitivityInput = { ...mockAssessment, totalCostAed: 0 };
    const result = calculateSensitivity(zeroCost, EXPECTED);
    expect(result.adjustedPayback).toBe(0);
  });

  it("handles very large NPV without overflow", () => {
    const largeNpv: SensitivityInput = { ...mockAssessment, npv25yrAed: 1e9 };
    const result = calculateSensitivity(largeNpv, EXPECTED);
    expect(result.baselineNpv).toBe(1e9);
    expect(Number.isFinite(result.adjustedNpv)).toBe(true);
  });

  it("CONSERVATIVE produces lower adjustedNpv than OPTIMISTIC", () => {
    const conservative = calculateSensitivity(mockAssessment, CONSERVATIVE);
    const optimistic = calculateSensitivity(mockAssessment, OPTIMISTIC);
    expect(conservative.adjustedNpv).toBeLessThan(optimistic.adjustedNpv);
  });

  it("CONSERVATIVE produces higher adjustedPayback than OPTIMISTIC", () => {
    const conservative = calculateSensitivity(mockAssessment, CONSERVATIVE);
    const optimistic = calculateSensitivity(mockAssessment, OPTIMISTIC);
    expect(conservative.adjustedPayback).toBeGreaterThan(optimistic.adjustedPayback);
  });

  it("all scenarios return finite adjustedNpv", () => {
    for (const preset of [CONSERVATIVE, EXPECTED, OPTIMISTIC]) {
      const result = calculateSensitivity(mockAssessment, preset);
      expect(Number.isFinite(result.adjustedNpv)).toBe(true);
    }
  });
});
