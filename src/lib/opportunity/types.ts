export interface ScoringInput {
  roofAreaM2: number | null;
  buildingType: string | null;
  lat: number;
  lng: number;
  hasSolar: boolean;
  existingAssessment?: {
    systemSizeKwp: number;
    paybackYears: number;
    npv25yrAed: number;
    annualSavingsAed: number;
  } | null;
  evidenceList?: Array<{
    status: string; // "solar_present" | "solar_absent" | "unknown"
    confidence: number;
  }>;
}

export interface SubScores {
  roofFitScore: number;
  economicsScore: number;
  buildingTypeScore: number;
  unsolarizedScore: number;
  dataCompletenessScore: number;
  regulatoryScore: number;
}

export interface ScoringOutput {
  scoreTotal: number; // 0 to 100
  scoreBand: "A" | "B" | "C" | "D" | "REJECT";
  confidence: number; // 0 to 1
  nextAction: "ASSESS" | "VERIFY_SOLARIZATION" | "ENRICH_OWNER" | "CONTACT" | "REJECT";
  reasons: string[];
  risks: string[];
  subScores: SubScores;
}
