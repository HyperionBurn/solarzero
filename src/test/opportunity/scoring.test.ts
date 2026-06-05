import { describe, it, expect } from "vitest";
import { scoreOpportunity } from "../../lib/opportunity/scoring";
import type { ScoringInput } from "../../lib/opportunity/types";

describe("scoreOpportunity", () => {
  // Dubai coordinates
  const DUBAI_LAT = 25.1;
  const DUBAI_LNG = 55.2;

  it("Case 1: rejects roof footprint below 250m2", () => {
    const input: ScoringInput = {
      roofAreaM2: 200,
      buildingType: "warehouse",
      lat: DUBAI_LAT,
      lng: DUBAI_LNG,
      hasSolar: false,
    };
    const result = scoreOpportunity(input);
    expect(result.scoreBand).toBe("REJECT");
    expect(result.scoreTotal).toBe(0);
    expect(result.nextAction).toBe("REJECT");
    expect(result.reasons[0]).toContain("below the 250 m² commercial threshold");
  });

  it("Case 2: high-priority flat-roof warehouse with massive area", () => {
    const input: ScoringInput = {
      roofAreaM2: 6000,
      buildingType: "warehouse",
      lat: DUBAI_LAT,
      lng: DUBAI_LNG,
      hasSolar: false,
    };
    const result = scoreOpportunity(input);
    expect(result.subScores.roofFitScore).toBe(100);
    expect(result.subScores.buildingTypeScore).toBe(100);
    expect(result.scoreTotal).toBeGreaterThanOrEqual(70); // should be A or B
    expect(result.nextAction).toBe("ASSESS"); // unassessed, so should assess first
  });

  it("Case 3: residential building type penalty", () => {
    const input: ScoringInput = {
      roofAreaM2: 1000,
      buildingType: "villa",
      lat: DUBAI_LAT,
      lng: DUBAI_LNG,
      hasSolar: false,
    };
    const result = scoreOpportunity(input);
    expect(result.subScores.buildingTypeScore).toBe(30);
    expect(result.risks.some(r => r.includes("Residential/villa"))).toBe(true);
  });

  it("Case 4: flagged as already solarized drops unsolarized score to 0", () => {
    const input: ScoringInput = {
      roofAreaM2: 1000,
      buildingType: "warehouse",
      lat: DUBAI_LAT,
      lng: DUBAI_LNG,
      hasSolar: true,
    };
    const result = scoreOpportunity(input);
    expect(result.subScores.unsolarizedScore).toBe(0);
    expect(result.risks.some(r => r.includes("already solarized"))).toBe(true);
  });

  it("Case 5: assessed building with high NPV & low payback leads to A/B band and CONTACT", () => {
    const input: ScoringInput = {
      roofAreaM2: 2000,
      buildingType: "warehouse",
      lat: DUBAI_LAT,
      lng: DUBAI_LNG,
      hasSolar: false,
      existingAssessment: {
        systemSizeKwp: 220,
        paybackYears: 4.2,
        npv25yrAed: 600000,
        annualSavingsAed: 65000,
      },
    };
    const result = scoreOpportunity(input);
    expect(result.subScores.economicsScore).toBe(99); // paybackScore=97.5, npvScore=100 -> avg=98.75 -> rounded to 99
    expect(result.scoreBand).toBe("A");
    expect(result.nextAction).toBe("CONTACT");
  });

  it("Case 6: assessed building with poor economics leads to low score and ENRICH_OWNER", () => {
    const input: ScoringInput = {
      roofAreaM2: 500,
      buildingType: "office",
      lat: DUBAI_LAT,
      lng: DUBAI_LNG,
      hasSolar: false,
      existingAssessment: {
        systemSizeKwp: 40,
        paybackYears: 13,
        npv25yrAed: -10000,
        annualSavingsAed: 4000,
      },
    };
    const result = scoreOpportunity(input);
    expect(result.subScores.economicsScore).toBe(0);
    expect(result.nextAction).toBe("ENRICH_OWNER");
  });

  it("Case 7: unassessed building triggers estimation logic", () => {
    const input: ScoringInput = {
      roofAreaM2: 1200,
      buildingType: "warehouse",
      lat: DUBAI_LAT,
      lng: DUBAI_LNG,
      hasSolar: false,
    };
    const result = scoreOpportunity(input);
    expect(result.subScores.economicsScore).toBeGreaterThan(0);
    expect(result.nextAction).toBe("ASSESS");
  });

  it("Case 8: evidence integration - high-confidence solar present", () => {
    const input: ScoringInput = {
      roofAreaM2: 1000,
      buildingType: "warehouse",
      lat: DUBAI_LAT,
      lng: DUBAI_LNG,
      hasSolar: false,
      evidenceList: [
        { status: "solar_present", confidence: 0.9 },
      ],
    };
    const result = scoreOpportunity(input);
    expect(result.subScores.unsolarizedScore).toBeCloseTo(10, 0); // 100 * (1 - 0.9)
    expect(result.nextAction).toBe("VERIFY_SOLARIZATION");
  });

  it("Case 9: evidence integration - high-confidence solar absent", () => {
    const input: ScoringInput = {
      roofAreaM2: 1000,
      buildingType: "warehouse",
      lat: DUBAI_LAT,
      lng: DUBAI_LNG,
      hasSolar: false,
      evidenceList: [
        { status: "solar_absent", confidence: 0.8 },
      ],
    };
    const result = scoreOpportunity(input);
    expect(result.subScores.unsolarizedScore).toBeCloseTo(90, 0); // 50 + 50 * 0.8
    expect(result.reasons.some(r => r.includes("High-confidence evidence confirms"))).toBe(true);
  });

  it("Case 10: regulatory penalty for systems > 400 kWp and > 500 kWp", () => {
    // 5000 m2 roof in Dubai -> size ~ 550 kWp (calculated via cost.ts)
    const input: ScoringInput = {
      roofAreaM2: 5000,
      buildingType: "industrial",
      lat: DUBAI_LAT,
      lng: DUBAI_LNG,
      hasSolar: false,
    };
    const result = scoreOpportunity(input);
    // Base regulatory score for Dubai is 100
    // Because size > 400 kWp -> -20
    // Because size > 500 kWp -> -10
    // Total should be 70
    expect(result.subScores.regulatoryScore).toBe(70);
    expect(result.risks.some(r => r.includes("exceeds 400 kWp"))).toBe(true);
    expect(result.risks.some(r => r.includes("exceeds 500 kWp"))).toBe(true);
  });

  it("Case 11: data completeness scoring", () => {
    const input: ScoringInput = {
      roofAreaM2: 1000,
      buildingType: "warehouse",
      lat: DUBAI_LAT,
      lng: DUBAI_LNG,
      hasSolar: false,
    };
    const result = scoreOpportunity(input);
    // completeness: area (+25) + type (+25) + coords (+15) + detailed type (+15) = 80
    expect(result.subScores.dataCompletenessScore).toBe(80);
  });

  it("Case 12: boundary transitions of bands", () => {
    // Minimal valid building to trigger D band
    const inputD: ScoringInput = {
      roofAreaM2: 300,
      buildingType: "villa",
      lat: DUBAI_LAT,
      lng: DUBAI_LNG,
      hasSolar: true, // will drop unsolarized score and overall score
    };
    const resultD = scoreOpportunity(inputD);
    expect(resultD.scoreBand).toBe("D");

    // Valid high-quality opportunity for A band
    const inputA: ScoringInput = {
      roofAreaM2: 6000,
      buildingType: "warehouse",
      lat: DUBAI_LAT,
      lng: DUBAI_LNG,
      hasSolar: false,
      existingAssessment: {
        systemSizeKwp: 600,
        paybackYears: 3.5,
        npv25yrAed: 1200000,
        annualSavingsAed: 180000,
      },
    };
    const resultA = scoreOpportunity(inputA);
    expect(resultA.scoreBand).toBe("A");
  });
});
