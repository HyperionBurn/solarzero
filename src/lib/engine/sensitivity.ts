import type { AssessmentResult } from "@/lib/engine/assessment";

// ── Types ───────────────────────────────────────────────────────────────────

export interface SensitivityVariables {
  /** Percentage adjustment to DEWA tariff (e.g., 0 = no change, -15 = 15% lower) */
  tariffPercent: number;
  /** Percentage adjustment to total installation cost */
  costPercent: number;
  /** Percentage adjustment to panel degradation rate */
  degradationPercent: number;
  /** Percentage adjustment to discount rate */
  discountRatePercent: number;
}

export interface SensitivityResult {
  /** Baseline NPV (AED) from the original assessment */
  baselineNpv: number;
  /** Baseline payback (years) from the original assessment */
  baselinePayback: number;
  /** NPV recalculated with all sensitivity variables applied */
  adjustedNpv: number;
  /** Payback recalculated with tariff and cost adjustments applied */
  adjustedPayback: number;
  /** Annual savings recalculated with tariff adjustment applied */
  adjustedAnnualSavings: number;
  /** Tornado chart data — one item per variable, sorted by impact descending */
  tornadoData: TornadoItem[];
}

export interface TornadoItem {
  /** Variable key matching SensitivityVariables field name */
  variable: string;
  /** Human-readable label for chart display */
  label: string;
  /** NPV when this variable is at its conservative (low) extreme, others at baseline */
  lowNpv: number;
  /** NPV when this variable is at its optimistic (high) extreme, others at baseline */
  highNpv: number;
  /** Spread: highNpv - lowNpv (positive when optimistic NPV > conservative NPV) */
  impact: number;
}

// ── Constants ───────────────────────────────────────────────────────────────

/** Baseline annual panel degradation (0.45%) — matches cost.ts */
const BASELINE_DEGRADATION = 0.0045;

/** Baseline discount rate (8%) — matches cost.ts */
const BASELINE_DISCOUNT_RATE = 0.08;

/** Project lifetime in years — matches cost.ts */
const PROJECT_YEARS = 25;

/** Preset: worst-case sensitivity (lower tariff, higher costs, faster degradation, higher discount) */
export const CONSERVATIVE: SensitivityVariables = {
  tariffPercent: -20,
  costPercent: +20,
  degradationPercent: +50,
  discountRatePercent: +30,
};

/** Preset: baseline / no adjustments */
export const EXPECTED: SensitivityVariables = {
  tariffPercent: 0,
  costPercent: 0,
  degradationPercent: 0,
  discountRatePercent: 0,
};

/** Preset: best-case sensitivity (higher tariff, lower costs, slower degradation, lower discount) */
export const OPTIMISTIC: SensitivityVariables = {
  tariffPercent: +20,
  costPercent: -20,
  degradationPercent: -50,
  discountRatePercent: -30,
};

// ── Private helpers ─────────────────────────────────────────────────────────

/**
 * Recalculate NPV using the same discounting pattern as cost.ts:
 *
 *   NPV = -totalCost + Σ(annualSavings × (1 - degradation)^n / (1 + discountRate)^n)
 *   for n = 1..25
 */
function computeNpv(
  totalCost: number,
  annualSavings: number,
  degradationRate: number,
  discountRate: number,
): number {
  let npv = -totalCost;
  const degradationFactor = 1 - degradationRate;
  const discountFactor = 1 + discountRate;

  for (let n = 1; n <= PROJECT_YEARS; n++) {
    const degradedSavings = annualSavings * Math.pow(degradationFactor, n);
    const discounted = degradedSavings / Math.pow(discountFactor, n);
    npv += discounted;
  }

  return Math.round(npv);
}

/**
 * Convenience wrapper: applies all four percentage adjustments and returns NPV.
 */
function npvWithMods(
  baselineCost: number,
  baselineSavings: number,
  tariffPct: number,
  costPct: number,
  degradationPct: number,
  discountPct: number,
): number {
  const modifiedCost = baselineCost * (1 + costPct / 100);
  const modifiedSavings = baselineSavings * (1 + tariffPct / 100);
  const degradation = BASELINE_DEGRADATION * (1 + degradationPct / 100);
  const discountRate = BASELINE_DISCOUNT_RATE * (1 + discountPct / 100);

  return computeNpv(modifiedCost, modifiedSavings, degradation, discountRate);
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Run sensitivity analysis on an existing assessment.
 *
 * Applies percentage adjustments to key financial variables and recalculates
 * NPV, payback, and annual savings. Also produces tornado-chart data by
 * testing each variable at its conservative vs. optimistic extreme while
 * holding all other variables at baseline.
 */
export function calculateSensitivity(
  assessment: AssessmentResult,
  variables: SensitivityVariables,
): SensitivityResult {
  const baselineCost = assessment.totalCostAed;
  const baselineSavings = assessment.annualSavingsAed;

  // ── Baseline (from assessment) ──
  const baselineNpv = assessment.npv25yrAed;
  const baselinePayback = assessment.paybackYears;

  // ── Adjusted values ──
  const modifiedTariff =
    assessment.dewaTariffAed * (1 + variables.tariffPercent / 100);
  const modifiedAnnualSavings = assessment.annualProductionKwh * modifiedTariff;
  const modifiedTotalCost =
    baselineCost * (1 + variables.costPercent / 100);
  const modifiedDegradation =
    BASELINE_DEGRADATION * (1 + variables.degradationPercent / 100);
  const modifiedDiscountRate =
    BASELINE_DISCOUNT_RATE * (1 + variables.discountRatePercent / 100);

  const adjustedNpv = computeNpv(
    modifiedTotalCost,
    modifiedAnnualSavings,
    modifiedDegradation,
    modifiedDiscountRate,
  );

  const adjustedPayback =
    modifiedAnnualSavings > 0
      ? Math.round((modifiedTotalCost / modifiedAnnualSavings) * 10) / 10
      : 999;

  const adjustedAnnualSavings = Math.round(modifiedAnnualSavings);

  // ── Tornado data ──
  // Each variable is tested at its conservative (low NPV) and optimistic
  // (high NPV) extreme from the presets while keeping other variables at baseline.
  //
  // Mapping rationale:
  //   tariff:       low = -20% (conservative) → lower tariff → lower NPV
  //                 high = +20% (optimistic)  → higher tariff → higher NPV
  //   cost:         low = +20% (conservative) → higher cost → lower NPV
  //                 high = -20% (optimistic)  → lower cost → higher NPV
  //   degradation:  low = +50% (conservative) → faster degradation → lower NPV
  //                 high = -50% (optimistic)  → slower degradation → higher NPV
  //   discount:     low = +30% (conservative) → higher discount → lower NPV
  //                 high = -30% (optimistic)  → lower discount → higher NPV

  interface TornadoDef {
    variable: string;
    label: string;
    lowPct: number;
    highPct: number;
  }

  const tornadoDefs: TornadoDef[] = [
    {
      variable: "tariffPercent",
      label: "DEWA Tariff",
      lowPct: CONSERVATIVE.tariffPercent,
      highPct: OPTIMISTIC.tariffPercent,
    },
    {
      variable: "costPercent",
      label: "Installation Cost",
      lowPct: CONSERVATIVE.costPercent,
      highPct: OPTIMISTIC.costPercent,
    },
    {
      variable: "degradationPercent",
      label: "Panel Degradation",
      lowPct: CONSERVATIVE.degradationPercent,
      highPct: OPTIMISTIC.degradationPercent,
    },
    {
      variable: "discountRatePercent",
      label: "Discount Rate",
      lowPct: CONSERVATIVE.discountRatePercent,
      highPct: OPTIMISTIC.discountRatePercent,
    },
  ];

  const tornadoData: TornadoItem[] = tornadoDefs
    .map(({ variable, label, lowPct, highPct }) => {
      // Low NPV: apply lowPct (conservative) for THIS variable, baseline for others
      const lowNpv = npvWithMods(
        baselineCost,
        baselineSavings,
        variable === "tariffPercent" ? lowPct : 0,
        variable === "costPercent" ? lowPct : 0,
        variable === "degradationPercent" ? lowPct : 0,
        variable === "discountRatePercent" ? lowPct : 0,
      );

      // High NPV: apply highPct (optimistic) for THIS variable, baseline for others
      const highNpv = npvWithMods(
        baselineCost,
        baselineSavings,
        variable === "tariffPercent" ? highPct : 0,
        variable === "costPercent" ? highPct : 0,
        variable === "degradationPercent" ? highPct : 0,
        variable === "discountRatePercent" ? highPct : 0,
      );

      return {
        variable,
        label,
        lowNpv,
        highNpv,
        impact: highNpv - lowNpv,
      };
    })
    .sort((a, b) => b.impact - a.impact);

  return {
    baselineNpv,
    baselinePayback,
    adjustedNpv,
    adjustedPayback,
    adjustedAnnualSavings,
    tornadoData,
  };
}
