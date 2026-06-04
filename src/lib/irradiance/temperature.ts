import { logger } from "@/lib/logger";

export interface TemperatureData {
  avgTempC: number;
  cellTempC: number;
  deratingFactor: number;
  dataSource: string;
  monthlyAvgTempC: number[];
}

interface OpenMeteoArchiveResponse {
  daily: {
    time: string[];
    temperature_2m_mean: number[];
  };
}

const OPEN_METEO_TIMEOUT_MS = 10_000;

function computeMonthlyAverages(dailyTemps: number[], times: string[]): number[] {
  const months: number[][] = Array.from({ length: 12 }, () => []);
  for (let i = 0; i < dailyTemps.length; i++) {
    const month = parseInt(times[i]!.split("-")[1]!, 10) - 1;
    months[month]!.push(dailyTemps[i]!);
  }
  return months.map(
    (temps) => temps.reduce((a, b) => a + b, 0) / (temps.length || 1),
  );
}

export async function getTemperatureDerating(
  lat: number,
  lng: number,
): Promise<TemperatureData | null> {
  try {
    const currentYear = new Date().getFullYear();
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${currentYear - 1}-01-01&end_date=${currentYear - 1}-12-31&daily=temperature_2m_mean`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OPEN_METEO_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      logger.error({ status: response.status }, "Open-Meteo API error");
      return null;
    }

    const data = (await response.json()) as OpenMeteoArchiveResponse;
    const dailyTemps = data.daily.temperature_2m_mean;
    const times = data.daily.time;

    if (!dailyTemps || dailyTemps.length === 0) {
      logger.error("Open-Meteo returned empty temperature data");
      return null;
    }

    const avgTempC =
      dailyTemps.reduce((sum, t) => sum + t, 0) / dailyTemps.length;

    // Cell temperature = ambient + 25°C (rooftop solar heating effect)
    const cellTempC = avgTempC + 25;

    // Standard crystalline silicon temperature coefficient: -0.35% per °C above STC (25°C)
    const deratingFactor = Math.max(
      0,
      1 + (cellTempC - 25) * -0.0035,
    );

    const monthlyAvgTempC = computeMonthlyAverages(dailyTemps, times);

    const dataSource = `OPEN_METEO_ARCHIVE_${currentYear - 1}`;

    return {
      avgTempC: Math.round(avgTempC * 100) / 100,
      cellTempC: Math.round(cellTempC * 100) / 100,
      deratingFactor: Math.round(deratingFactor * 10000) / 10000,
      dataSource,
      monthlyAvgTempC: monthlyAvgTempC.map((t) => Math.round(t * 100) / 100),
    };
  } catch (error) {
    logger.error({ err: error }, "Failed to fetch temperature data from Open-Meteo");
    return null;
  }
}
