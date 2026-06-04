export interface TariffSlab {
  min: number; // kWh/month
  max: number; // kWh/month (Infinity for last slab)
  rate: number; // AED/kWh
}

export interface GhiZone {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  ghi: number; // kWh/m²/year
}

export interface EmirateConfig {
  name: string;
  utility: "DEWA" | "ADDC" | "SEWA" | "FEWA";
  tariffSlabs: TariffSlab[];
  netMetering: "full_retail" | "avoided_cost" | "limited";
  maxSystemSizeKwp: number;
  requiresStructuralAssessment: boolean;
  buildingCodes: string;
  ghiZone: GhiZone;
}

export const EMIRATES: Record<string, EmirateConfig> = {
  dubai: {
    name: "Dubai",
    utility: "DEWA",
    tariffSlabs: [
      { min: 0, max: 2000, rate: 0.23 },
      { min: 2001, max: 4000, rate: 0.28 },
      { min: 4001, max: 6000, rate: 0.32 },
      { min: 6001, max: Infinity, rate: 0.38 },
    ],
    netMetering: "full_retail",
    maxSystemSizeKwp: 1000,
    requiresStructuralAssessment: true, // >500kW requires assessment
    buildingCodes: "AlSaFat",
    ghiZone: {
      minLat: 24.9,
      maxLat: 25.4,
      minLng: 55.0,
      maxLng: 55.6,
      ghi: 2150,
    },
  },
  abu_dhabi: {
    name: "Abu Dhabi",
    utility: "ADDC",
    tariffSlabs: [
      { min: 0, max: 3000, rate: 0.22 },
      { min: 3001, max: 5000, rate: 0.27 },
      { min: 5001, max: 10000, rate: 0.32 },
      { min: 10001, max: Infinity, rate: 0.37 },
    ],
    netMetering: "full_retail",
    maxSystemSizeKwp: 1000,
    requiresStructuralAssessment: true,
    buildingCodes: "Estidama",
    ghiZone: {
      minLat: 24.0,
      maxLat: 24.9,
      minLng: 54.0,
      maxLng: 55.0,
      ghi: 2120,
    },
  },
  sharjah: {
    name: "Sharjah",
    utility: "SEWA",
    tariffSlabs: [
      { min: 0, max: 2000, rate: 0.25 },
      { min: 2001, max: 4000, rate: 0.30 },
      { min: 4001, max: Infinity, rate: 0.35 },
    ],
    netMetering: "full_retail",
    maxSystemSizeKwp: 500,
    requiresStructuralAssessment: false, // below 500kW limit
    buildingCodes: "none",
    ghiZone: {
      minLat: 25.2,
      maxLat: 25.45,
      minLng: 55.3,
      maxLng: 55.7,
      ghi: 2100,
    },
  },
  ajman: {
    name: "Ajman",
    utility: "FEWA",
    tariffSlabs: [
      { min: 0, max: 2000, rate: 0.25 },
      { min: 2001, max: Infinity, rate: 0.33 },
    ],
    netMetering: "limited",
    maxSystemSizeKwp: 500,
    requiresStructuralAssessment: false,
    buildingCodes: "none",
    ghiZone: {
      minLat: 25.35,
      maxLat: 25.48,
      minLng: 55.4,
      maxLng: 55.6,
      ghi: 2050,
    },
  },
  umm_al_quwain: {
    name: "Umm Al Quwain",
    utility: "FEWA",
    tariffSlabs: [
      { min: 0, max: 2000, rate: 0.25 },
      { min: 2001, max: Infinity, rate: 0.33 },
    ],
    netMetering: "limited",
    maxSystemSizeKwp: 500,
    requiresStructuralAssessment: false,
    buildingCodes: "none",
    ghiZone: {
      minLat: 25.48,
      maxLat: 25.65,
      minLng: 55.55,
      maxLng: 55.75,
      ghi: 2050,
    },
  },
  ras_al_khaimah: {
    name: "Ras Al Khaimah",
    utility: "FEWA",
    tariffSlabs: [
      { min: 0, max: 2000, rate: 0.25 },
      { min: 2001, max: Infinity, rate: 0.33 },
    ],
    netMetering: "limited",
    maxSystemSizeKwp: 500,
    requiresStructuralAssessment: false,
    buildingCodes: "none",
    ghiZone: {
      minLat: 25.6,
      maxLat: 26.0,
      minLng: 55.7,
      maxLng: 56.1,
      ghi: 2050,
    },
  },
  fujairah: {
    name: "Fujairah",
    utility: "FEWA",
    tariffSlabs: [
      { min: 0, max: 2000, rate: 0.25 },
      { min: 2001, max: Infinity, rate: 0.33 },
    ],
    netMetering: "limited",
    maxSystemSizeKwp: 500,
    requiresStructuralAssessment: false,
    buildingCodes: "none",
    ghiZone: {
      minLat: 25.0,
      maxLat: 25.5,
      minLng: 56.1,
      maxLng: 56.4,
      ghi: 2050,
    },
  },
};

export function getEmirateConfig(lat: number, lng: number): EmirateConfig {
  for (const emirate of Object.values(EMIRATES)) {
    if (
      lat >= emirate.ghiZone.minLat &&
      lat <= emirate.ghiZone.maxLat &&
      lng >= emirate.ghiZone.minLng &&
      lng <= emirate.ghiZone.maxLng
    ) {
      return emirate;
    }
  }
  return EMIRATES.dubai; // Default fallback
}

export function getTariffRate(
  emirateKey: string,
  monthlyKwh: number,
): number {
  const config = EMIRATES[emirateKey];
  if (!config) return 0.32; // Default DEWA rate
  for (const slab of config.tariffSlabs) {
    if (monthlyKwh >= slab.min && monthlyKwh <= slab.max) {
      return slab.rate;
    }
  }
  return config.tariffSlabs[config.tariffSlabs.length - 1]?.rate ?? 0.32;
}

export function getEmirateByCoords(lat: number, lng: number): string {
  for (const [key, emirate] of Object.entries(EMIRATES)) {
    if (
      lat >= emirate.ghiZone.minLat &&
      lat <= emirate.ghiZone.maxLat &&
      lng >= emirate.ghiZone.minLng &&
      lng <= emirate.ghiZone.maxLng
    ) {
      return key;
    }
  }
  return "dubai";
}
