import { logger } from "@/lib/logger";

export type FinancingType = "DIRECT" | "PPA" | "LEASE" | "ESCO";

export interface FinancingModel {
  type: FinancingType;
  name: string;
  description: string;
  upfrontCostAED: number;
  monthlyPaymentAED: number;
  annualSavingsAED: number;
  year1SavingsAED: number;
  paybackYears: number | null;
  npv25yrAED: number;
  irrPercent: number | null;
  co2OffsetTons: number;
  recommended: boolean;
}

export interface AssessmentInput {
  totalCostAed: number;
  annualProductionKwh: number;
  annualSavingsAed: number;
  paybackYears: number;
  npv25yrAed: number;
  co2OffsetTons: number;
  dewaTariffAed: number;
}

function discountCashFlows(
  annualAmount: number,
  years: number,
  discountRate: number = 0.08,
  degradationFactor: number = 0.9955,
  startYear: number = 1,
): number {
  let npv = 0;
  for (let n = startYear; n <= years; n++) {
    const degraded = annualAmount * Math.pow(degradationFactor, n);
    const discounted = degraded / Math.pow(1 + discountRate, n);
    npv += discounted;
  }
  return npv;
}

export function calculateAllFinancingModels(
  assessment: AssessmentInput,
): FinancingModel[] {
  const { totalCostAed, annualProductionKwh, annualSavingsAed, npv25yrAed, co2OffsetTons, dewaTariffAed } = assessment;

  // === DIRECT PURCHASE ===
  const direct: FinancingModel = {
    type: "DIRECT",
    name: "Direct Purchase",
    description: "Full upfront investment. Highest long-term returns.",
    upfrontCostAED: Math.round(totalCostAed),
    monthlyPaymentAED: 0,
    annualSavingsAED: Math.round(annualSavingsAed),
    year1SavingsAED: Math.round(annualSavingsAed),
    paybackYears: totalCostAed > 0 ? Math.round((totalCostAed / annualSavingsAed) * 10) / 10 : null,
    npv25yrAED: Math.round(npv25yrAed),
    irrPercent: calculateIRR([-totalCostAed, ...Array(25).fill(annualSavingsAed * 0.9955)]),
    co2OffsetTons: co2OffsetTons,
    recommended: false,
  };

  // === PPA (Power Purchase Agreement) ===
  const ppaRate = 0.20; // AED/kWh — below retail
  const ppaSavings = annualProductionKwh * (dewaTariffAed - ppaRate);
  const ppaNpv = discountCashFlows(ppaSavings, 25);
  const ppa: FinancingModel = {
    type: "PPA",
    name: "Power Purchase Agreement",
    description: "Zero upfront cost. Pay per kWh at a discounted rate.",
    upfrontCostAED: 0,
    monthlyPaymentAED: 0,
    annualSavingsAED: Math.round(ppaSavings),
    year1SavingsAED: Math.round(ppaSavings),
    paybackYears: null,
    npv25yrAED: Math.round(ppaNpv),
    irrPercent: null,
    co2OffsetTons: co2OffsetTons,
    recommended: true,
  };

  // === LEASE ===
  const leaseMonthly = totalCostAed * 0.008;
  const leaseAnnualCost = leaseMonthly * 12;
  const leaseNetSavings = annualSavingsAed - leaseAnnualCost;
  const leaseNpv = discountCashFlows(leaseNetSavings, 25);
  const lease: FinancingModel = {
    type: "LEASE",
    name: "Operating Lease",
    description: "Fixed monthly payments. Own the system after lease term.",
    upfrontCostAED: 0,
    monthlyPaymentAED: Math.round(leaseMonthly),
    annualSavingsAED: Math.round(leaseNetSavings),
    year1SavingsAED: Math.round(leaseNetSavings),
    paybackYears: null,
    npv25yrAED: Math.round(leaseNpv),
    irrPercent: null,
    co2OffsetTons: co2OffsetTons,
    recommended: false,
  };

  // === ESCO (Shared Savings) ===
  // First 10 years: client gets 70%, ESCO gets 30%
  // Years 11-25: client gets 100%
  const esco10yrNpv = discountCashFlows(annualSavingsAed * 0.70, 10);
  const esco15yrNpv = discountCashFlows(annualSavingsAed, 25, 0.08, 0.9955, 11);
  const escoNpv = esco10yrNpv + esco15yrNpv;
  const esco: FinancingModel = {
    type: "ESCO",
    name: "Shared Savings (ESCO)",
    description: "Energy service company finances and maintains. You share the savings.",
    upfrontCostAED: 0,
    monthlyPaymentAED: 0,
    annualSavingsAED: Math.round(annualSavingsAed * 0.70),
    year1SavingsAED: Math.round(annualSavingsAed * 0.70),
    paybackYears: null,
    npv25yrAED: Math.round(escoNpv),
    irrPercent: null,
    co2OffsetTons: co2OffsetTons,
    recommended: false,
  };

  const models: FinancingModel[] = [direct, ppa, lease, esco];

  // === Recommendation logic (per Section 6: Context) ===
  // - Direct purchase: Most common for large commercial (>250kW equivalent cost)
  // - PPA: Growing for mid-size, zero upfront, immediate savings
  // - ESCO/LEASE: Not recommended (shared savings reduces benefit; monthly payments)
  const estimatedKwp = totalCostAed / (1.85 * 1000); // mid-tier cost per watt
  const directIsStrong = (direct.irrPercent ?? 0) > 8;
  const directBeatsPpaSignificantly = direct.npv25yrAED > ppa.npv25yrAED * 1.15;
  const ppaHasSavings = ppa.annualSavingsAED > 0;

  if (estimatedKwp >= 250 && directIsStrong && directBeatsPpaSignificantly) {
    direct.recommended = true;
    ppa.recommended = false;
  } else if (ppaHasSavings) {
    ppa.recommended = true;
  }

  // LEASE and ESCO remain recommended: false (set at construction)

  return models.sort((a, b) => b.npv25yrAED - a.npv25yrAED);
}

function calculateIRR(cashFlows: number[]): number | null {
  try {
    let rate = 0.1;
    for (let iter = 0; iter < 100; iter++) {
      let npv = 0;
      let dnpv = 0;
      for (let t = 0; t < cashFlows.length; t++) {
        const cf = cashFlows[t]!;
        const df = Math.pow(1 + rate, t);
        npv += cf / df;
        if (t > 0) dnpv += (-t * cf) / Math.pow(1 + rate, t + 1);
      }
      if (Math.abs(npv) < 0.01) return Math.round(rate * 10000) / 100;
      if (dnpv === 0) return null;
      rate -= npv / dnpv;
    }
    return Math.round(rate * 10000) / 100;
  } catch (err) {
    logger.warn({ err }, "IRR calculation failed");
    return null;
  }
}
