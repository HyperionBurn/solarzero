interface GHI {
  ghi: number; // kWh/m²/year
}

const UAE_GHI_ZONES: Record<string, GHI> = {
  dubai_coastal: { ghi: 2150 },
  dubai_inland: { ghi: 2200 },
  abu_dhabi_coastal: { ghi: 2120 },
  abu_dhabi_inland: { ghi: 2250 },
  sharjah_northern: { ghi: 2180 },
  al_ain: { ghi: 2300 },
};

/**
 * Determine the UAE GHI zone for a given lat/lng coordinate.
 * Returns the zone name and annual GHI in kWh/m²/year.
 *
 * Zone boundaries (approximate):
 * - Dubai coastal: lat 24.9-25.3, lng 54.9-55.3 (coastal strip)
 * - Dubai inland: lat 24.9-25.3, lng 55.3-55.7 (inland Dubai)
 * - Abu Dhabi coastal: lat 24.0-24.8, lng 54.0-54.8 (Abu Dhabi city / coast)
 * - Abu Dhabi inland: lat 23.0-24.8, lng 54.8-56.0 (Al Dhafra, inland)
 * - Sharjah/Northern: lat 25.3-26.0, lng 55.3-56.5 (Sharjah, Ajman, UAQ, RAK)
 * - Al Ain: lat 24.0-24.5, lng 55.5-56.0 (Al Ain oasis, high GHI)
 */
export function getUAEIrradiance(lat: number, lng: number): number {
  // Al Ain region: high inland, higher GHI
  if (lat >= 24.0 && lat <= 24.5 && lng >= 55.5 && lng <= 56.0) {
    return UAE_GHI_ZONES["al_ain"]!.ghi;
  }

  // Sharjah / Northern Emirates
  if (lat >= 25.3 && lat <= 26.0 && lng >= 55.3 && lng <= 56.5) {
    return UAE_GHI_ZONES["sharjah_northern"]!.ghi;
  }

  // Dubai coastal vs inland
  if (lat >= 24.9 && lat <= 25.3) {
    if (lng >= 54.9 && lng <= 55.3) {
      return UAE_GHI_ZONES["dubai_coastal"]!.ghi;
    }
    if (lng > 55.3 && lng <= 55.7) {
      return UAE_GHI_ZONES["dubai_inland"]!.ghi;
    }
    // Default Dubai area
    return UAE_GHI_ZONES["dubai_coastal"]!.ghi;
  }

  // Abu Dhabi coastal vs inland
  if (lat >= 23.0 && lat <= 24.8) {
    if (lng >= 54.0 && lng <= 54.8) {
      return UAE_GHI_ZONES["abu_dhabi_coastal"]!.ghi;
    }
    if (lng > 54.8 && lng <= 56.0) {
      return UAE_GHI_ZONES["abu_dhabi_inland"]!.ghi;
    }
    // Default Abu Dhabi area
    return UAE_GHI_ZONES["abu_dhabi_coastal"]!.ghi;
  }

  // Default fallback for UAE (typical value)
  return 2180;
}
