import { describe, it, expect } from "vitest";
import {
  calculateAllFinancingModels,
  type AssessmentInput,
} from "@/lib/engine/financing";

function makeAssessment(overrides: Partial<AssessmentInput> = {}): AssessmentInput {
  return {
    totalCostAed: 100000,
    annualProductionKwh: 160000,
    annualSavingsAed: 51200,
    paybackYears: 2.0,
    npv25yrAed: 250000,
    co2OffsetTons: 67.2,
    dewaTariffAed: 0.32,
    ...overrides,
  };
}

describe("calculateAllFinancingModels", () => {
  it("returns exactly 4 models", () => {
    const models = calculateAllFinancingModels(makeAssessment());
    expect(models).toHaveLength(4);
  });

  it("returns all expected types", () => {
    const models = calculateAllFinancingModels(makeAssessment());
    const types = models.map((m) => m.type);
    expect(types).toContain("DIRECT");
    expect(types).toContain("PPA");
    expect(types).toContain("LEASE");
    expect(types).toContain("ESCO");
  });

  it("DIRECT has full upfront cost, zero monthly", () => {
    const models = calculateAllFinancingModels(makeAssessment());
    const direct = models.find((m) => m.type === "DIRECT")!;
    expect(direct.upfrontCostAED).toBe(100000);
    expect(direct.monthlyPaymentAED).toBe(0);
  });

  it("PPA has zero upfront cost", () => {
    const models = calculateAllFinancingModels(makeAssessment());
    const ppa = models.find((m) => m.type === "PPA")!;
    expect(ppa.upfrontCostAED).toBe(0);
    expect(ppa.paybackYears).toBeNull();
  });

  it("LEASE has zero upfront, positive monthly", () => {
    const models = calculateAllFinancingModels(makeAssessment());
    const lease = models.find((m) => m.type === "LEASE")!;
    expect(lease.upfrontCostAED).toBe(0);
    expect(lease.monthlyPaymentAED).toBeGreaterThan(0);
  });

  it("ESCO first-10yr savings = 70% of annual", () => {
    const models = calculateAllFinancingModels(makeAssessment());
    const esco = models.find((m) => m.type === "ESCO")!;
    expect(esco.annualSavingsAED).toBe(Math.round(51200 * 0.7));
  });

  it("all models have positive CO2 offset", () => {
    const models = calculateAllFinancingModels(makeAssessment());
    for (const m of models) {
      expect(m.co2OffsetTons).toBe(67.2);
    }
  });

  it("sorted by NPV descending", () => {
    const models = calculateAllFinancingModels(makeAssessment());
    for (let i = 1; i < models.length; i++) {
      expect(models[i]!.npv25yrAED).toBeLessThanOrEqual(models[i - 1]!.npv25yrAED);
    }
  });

  it("one model is marked recommended", () => {
    const models = calculateAllFinancingModels(makeAssessment());
    const recommended = models.filter((m) => m.recommended);
    expect(recommended.length).toBeGreaterThanOrEqual(1);
  });

  it("handles zero cost gracefully", () => {
    const models = calculateAllFinancingModels(makeAssessment({ totalCostAed: 0 }));
    expect(models).toHaveLength(4);
    const direct = models.find((m) => m.type === "DIRECT")!;
    expect(direct.paybackYears).toBeNull();
  });

  it("all NPV values are finite numbers", () => {
    const models = calculateAllFinancingModels(makeAssessment());
    for (const m of models) {
      expect(Number.isFinite(m.npv25yrAED)).toBe(true);
    }
  });
});
