import type { Slot } from "./planner";

const API = process.env.CARBON_API_URL ?? "https://api.carbonintensity.org.uk";

type RegionalResponse = {
  data: { data: { from: string; to: string; intensity: { forecast: number } }[] };
};

// Returns a map of slot start time -> forecast gCO2/kWh for the region.
export async function getCarbonForecast(
  carbonRegionId: number,
  from: Date,
  fetcher: typeof fetch = fetch,
): Promise<Map<string, number>> {
  // The API wants minutes precision, e.g. 2026-10-13T22:00Z
  const fromParam = from.toISOString().slice(0, 16) + "Z";
  const res = await fetcher(`${API}/regional/intensity/${fromParam}/fw48h/regionid/${carbonRegionId}`, {
    next: { revalidate: 60 * 30 },
  } as RequestInit);
  if (!res.ok) throw new Error(`Carbon intensity request failed (${res.status})`);
  const body = (await res.json()) as RegionalResponse;

  const forecast = new Map<string, number>();
  for (const entry of body.data.data) {
    forecast.set(new Date(entry.from).toISOString(), entry.intensity.forecast);
  }
  return forecast;
}

// Carbon data is a nice-to-have: if a slot has no forecast we just leave it out.
export function withCarbon(slots: Slot[], forecast: Map<string, number>): Slot[] {
  return slots.map((s) => (forecast.has(s.start) ? { ...s, carbon: forecast.get(s.start) } : s));
}
