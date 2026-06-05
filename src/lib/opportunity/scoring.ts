import type { ScoringInput, ScoringOutput } from "./types";
import { getEmirateConfig } from "../regulatory/emirates";
import { calculateCosts } from "../engine/cost";

export const SCORING_VERSION = "v1.0";

/**
 * Deterministically scores a solar opportunity based on physical, economic, building-type,
 * solarization evidence, completeness, and regulatory factors.
 */
export function scoreOpportunity(input: ScoringInput): ScoringOutput {
  const {
    roofAreaM2,
    buildingType,
    lat,
    lng,
    hasSolar,
    existingAssessment,
    evidenceList = [],
  } = input;

  const reasons: string[] = [];
  const risks: string[] = [];

  // GATE: Reject if roof area is less than 250 m2 for commercial MVP
  if (roofAreaM2 === null || roofAreaM2 < 250) {
    return {
      scoreTotal: 0,
      scoreBand: "REJECT",
      confidence: 1.0,
      nextAction: "REJECT",
      reasons: [
        roofAreaM2 === null
          ? "Roof area is unknown/null."
          : `Roof area of ${roofAreaM2} m² is below the 250 m² commercial threshold.`,
      ],
      risks: ["Physical roof size is insufficient for a viable commercial solar project."],
      subScores: {
        roofFitScore: 0,
        economicsScore: 0,
        buildingTypeScore: 0,
        unsolarizedScore: 0,
        dataCompletenessScore: 0,
        regulatoryScore: 0,
      },
    };
  }

  // 1. roofFitScore (30%)
  const A = roofAreaM2;
  let roofFitScore = 0;
  if (A >= 5000) {
    roofFitScore = 100;
    reasons.push(`Massive roof footprint of ${A.toLocaleString()} m² is ideal for large-scale C&I solar.`);
  } else if (A >= 1000) {
    roofFitScore = 70 + ((A - 1000) / 4000) * 30;
    reasons.push(`Excellent roof footprint of ${A.toLocaleString()} m² supports substantial system size.`);
  } else {
    // 250 <= A < 1000
    roofFitScore = 30 + ((A - 250) / 750) * 40;
    reasons.push(`Moderate roof footprint of ${A.toLocaleString()} m² is suitable for mid-size C&I solar.`);
  }

  // 2. economicsScore (25%)
  const emirate = getEmirateConfig(lat, lng);
  const ghi = emirate.ghiZone.ghi;
  const tariffRate = emirate.tariffSlabs[0]?.rate ?? 0.32;

  let paybackYears = 999;
  let npv25yrAed = 0;
  let estSystemSizeKwp = 0;

  if (existingAssessment) {
    paybackYears = existingAssessment.paybackYears;
    npv25yrAed = existingAssessment.npv25yrAed;
    estSystemSizeKwp = existingAssessment.systemSizeKwp;
  } else {
    // Run estimation using calculateCosts
    const est = calculateCosts(A, ghi, tariffRate);
    paybackYears = est.paybackYears;
    npv25yrAed = est.npv25yrAed;
    estSystemSizeKwp = est.systemSizeKwp;
  }

  // Payback Score: <= 4 yrs = 100, >= 12 yrs = 0
  let paybackScore = 0;
  if (paybackYears <= 4) {
    paybackScore = 100;
  } else if (paybackYears >= 12) {
    paybackScore = 0;
  } else {
    paybackScore = 100 - (paybackYears - 4) * 12.5;
  }

  // NPV Score: <= 0 = 0, >= 500k = 100
  let npvScore = 0;
  if (npv25yrAed > 0) {
    npvScore = Math.min(100, (npv25yrAed / 500000) * 100);
  }

  const economicsScore = paybackScore * 0.5 + npvScore * 0.5;
  if (existingAssessment) {
    if (paybackYears <= 6) {
      reasons.push(`Validated assessment shows attractive payback of ${paybackYears} years.`);
    } else {
      risks.push(`Validated assessment indicates moderate payback of ${paybackYears} years.`);
    }
    if (npv25yrAed > 100000) {
      reasons.push(`Validated 25-year NPV of AED ${npv25yrAed.toLocaleString()} shows strong asset returns.`);
    }
  } else {
    if (paybackYears <= 6) {
      reasons.push(`Estimated payback of ${paybackYears} years is highly favorable for investment.`);
    }
    if (npv25yrAed > 150000) {
      reasons.push(`Estimated 25-year NPV is strong at AED ${npv25yrAed.toLocaleString()}.`);
    }
  }

  // 3. buildingTypeScore (15%)
  const normalizedType = buildingType?.toLowerCase() || "";
  let buildingTypeScore = 70; // commercial fallback
  const priorityTypes = [
    "warehouse", "industrial", "commercial", "retail", "school",
    "university", "hospital", "logistics", "mall", "supermarket", "office"
  ];
  const residentialTypes = ["house", "villa", "residential", "apartments"];

  if (priorityTypes.includes(normalizedType)) {
    buildingTypeScore = 100;
    reasons.push(`High-priority building type (${buildingType}) is typical of flat, unobstructed C&I roofs.`);
  } else if (residentialTypes.includes(normalizedType)) {
    buildingTypeScore = 30;
    risks.push(`Residential/villa building type (${buildingType}) typically has complex pitches and lower energy demand.`);
  } else {
    reasons.push(`Standard commercial fallback building type (${buildingType || "unknown"}).`);
  }

  // 4. unsolarizedScore (15%)
  let unsolarizedScore = 100;
  let evidenceConfidence = 0.5; // default moderate confidence when no evidence exists

  if (evidenceList.length > 0) {
    // Check if there's any evidence of solar being present
    const presentEvidence = evidenceList.filter((e) => e.status === "solar_present");
    const absentEvidence = evidenceList.filter((e) => e.status === "solar_absent");

    if (presentEvidence.length > 0) {
      // Find the highest confidence present evidence
      const maxPresent = Math.max(...presentEvidence.map((e) => e.confidence));
      unsolarizedScore = 100 * (1 - maxPresent);
      evidenceConfidence = maxPresent;
      if (maxPresent >= 0.7) {
        risks.push(`High probability solar array already exists (observed confidence: ${(maxPresent * 100).toFixed(0)}%).`);
      } else {
        risks.push(`Possible existing solar installations detected on roof.`);
      }
    } else if (absentEvidence.length > 0) {
      // Find the highest confidence absent evidence
      const maxAbsent = Math.max(...absentEvidence.map((e) => e.confidence));
      unsolarizedScore = 50 + 50 * maxAbsent;
      evidenceConfidence = maxAbsent;
      if (maxAbsent >= 0.8) {
        reasons.push(`High-confidence evidence confirms roof is unsolarized.`);
      } else {
        reasons.push(`Evidence suggests roof is currently unsolarized.`);
      }
    }
  } else {
    if (hasSolar) {
      unsolarizedScore = 0;
      evidenceConfidence = 1.0;
      risks.push("Flagged as already solarized.");
    } else {
      unsolarizedScore = 100;
      evidenceConfidence = 0.5; // neutral confidence
    }
  }

  // 5. dataCompletenessScore (10%)
  let dataCompletenessScore = 0;
  if (roofAreaM2 !== null) dataCompletenessScore += 25;
  if (buildingType !== null) dataCompletenessScore += 25;
  if (lat !== 0 && lng !== 0) dataCompletenessScore += 15;
  if (input.buildingType !== "unknown") dataCompletenessScore += 15; // standard detail
  if (existingAssessment) dataCompletenessScore += 20;

  // 6. regulatoryScore (5%)
  let regulatoryScore = 50;
  if (emirate.utility === "DEWA") {
    regulatoryScore = 100;
    reasons.push("Favorable net metering regulations under Dubai Shams Dubai framework.");
  } else if (emirate.utility === "ADDC") {
    regulatoryScore = 85;
    reasons.push("Abu Dhabi ADDC net metering rules are favorable but require structured approval.");
  } else if (emirate.utility === "SEWA") {
    regulatoryScore = 75;
    risks.push("Sharjah SEWA limits system connection capacity approvals.");
  } else {
    regulatoryScore = 65;
    risks.push("FEWA net metering regulations impose limited export capabilities.");
  }

  // Regulatory constraints based on size
  if (estSystemSizeKwp > 400 && emirate.utility === "DEWA") {
    regulatoryScore = Math.max(0, regulatoryScore - 20);
    risks.push("System size exceeds 400 kWp, which may trigger dedicated substation/connection requirements.");
  }
  if (estSystemSizeKwp > 500) {
    regulatoryScore = Math.max(0, regulatoryScore - 10);
    risks.push("System size exceeds 500 kWp, requiring mandatory structural engineering certification.");
  }

  // Weighted total score calculation
  const rawTotal =
    roofFitScore * 0.30 +
    economicsScore * 0.25 +
    buildingTypeScore * 0.15 +
    unsolarizedScore * 0.15 +
    dataCompletenessScore * 0.10 +
    regulatoryScore * 0.05;

  const scoreTotal = Math.max(0, Math.min(100, Math.round(rawTotal)));

  // Score Band assignment
  let scoreBand: "A" | "B" | "C" | "D" | "REJECT" = "D";
  if (scoreTotal >= 85) {
    scoreBand = "A";
  } else if (scoreTotal >= 70) {
    scoreBand = "B";
  } else if (scoreTotal >= 50) {
    scoreBand = "C";
  }

  // Opportunity confidence aggregation: 40% completeness, 60% evidence confidence
  const confidence = 0.4 * (dataCompletenessScore / 100) + 0.6 * evidenceConfidence;

  // Next Action determination
  let nextAction: "ASSESS" | "VERIFY_SOLARIZATION" | "ENRICH_OWNER" | "CONTACT" | "REJECT" = "ASSESS";
  if (unsolarizedScore < 30) {
    nextAction = "VERIFY_SOLARIZATION";
  } else if (!existingAssessment) {
    nextAction = "ASSESS";
  } else if (scoreBand === "A" || scoreBand === "B") {
    nextAction = "CONTACT";
  } else {
    nextAction = "ENRICH_OWNER";
  }

  return {
    scoreTotal,
    scoreBand,
    confidence: Math.round(confidence * 100) / 100,
    nextAction,
    reasons,
    risks,
    subScores: {
      roofFitScore: Math.round(roofFitScore),
      economicsScore: Math.round(economicsScore),
      buildingTypeScore: Math.round(buildingTypeScore),
      unsolarizedScore: Math.round(unsolarizedScore),
      dataCompletenessScore: Math.round(dataCompletenessScore),
      regulatoryScore: Math.round(regulatoryScore),
    },
  };
}
