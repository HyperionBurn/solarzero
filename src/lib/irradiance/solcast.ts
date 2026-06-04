const SOLCAST_API_URL = "https://api.solcast.com.au";

const SOLCAST_TIMEOUT_MS = 15_000;

export interface SolcastGHIResponse {
  estimated_actuals: {
    ghi: number;
    period_end: string;
    period: string;
  }[];
}

/**
 * Query Solcast API to get annual GHI for a location.
 * Returns kWh/m²/year or null if unavailable.
 */
export async function getSolcastGHI(
  lat: number,
  lng: number,
): Promise<number | null> {
  const apiKey = process.env.SOLCAST_API_KEY;
  if (!apiKey) {
    console.warn("SOLCAST_API_KEY not set, skipping Solcast");
    return null;
  }

  try {
    const url = `${SOLCAST_API_URL}/data/historic/radiation_and_weather?latitude=${lat}&longitude=${lng}&format=json`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SOLCAST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      console.warn(
        `Solcast API returned ${response.status}: ${response.statusText}`,
      );
      return null;
    }

    const data = (await response.json()) as SolcastGHIResponse;
    const estimates = data.estimated_actuals;

    if (!estimates || estimates.length === 0) {
      console.warn("Solcast returned no estimated_actuals");
      return null;
    }

    // Solcast returns GHI in W/m² per interval (typically 30-min).
    // Sum up all intervals and convert to kWh/m²/year.
    // Each interval is typically PT30M, so 2 intervals per hour.
    // GHI in W/m² × 0.5h = Wh/m² per interval, then / 1000 for kWh.
    let totalWhPerM2 = 0;
    for (const entry of estimates) {
      const period = entry.period || "PT30M";
      const hoursStr = period.match(/PT(\d+)H/)?.[1];
      const minsStr = period.match(/(\d+)M/)?.[1];
      const hours =
        (parseInt(hoursStr ?? "0") || 0) + (parseInt(minsStr ?? "30") || 30) / 60;

      totalWhPerM2 += entry.ghi * hours;
    }

    const totalKwhPerM2 = totalWhPerM2 / 1000;

    // If we have less than a full year of data (8760 hours), scale up.
    // Estimate the coverage based on number of intervals.
    const totalHours = estimates.reduce((sum, e) => {
      const period = e.period || "PT30M";
      const hoursStr = period.match(/PT(\d+)H/)?.[1];
      const minsStr = period.match(/(\d+)M/)?.[1];
      return (
        sum +
        (parseInt(hoursStr ?? "0") || 0) +
        (parseInt(minsStr ?? "30") || 30) / 60
      );
    }, 0);

    if (totalHours > 0 && totalHours < 8000) {
      // Scale to full year
      return (totalKwhPerM2 / totalHours) * 8760;
    }

    return totalKwhPerM2;
  } catch (err) {
    console.warn("Solcast API error:", err);
    return null;
  }
}
