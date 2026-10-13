import { getAgilePrices } from "./octopus";
import { getCarbonForecast, withCarbon } from "./carbon";
import { planCharge, type Plan, type Slot } from "./planner";
import { findRegion } from "./regions";
import type { PlanRequest } from "./validation";

export type PlanResult = Plan & { timeline: Slot[]; carbonAvailable: boolean };

// Fetches prices (required) and carbon (optional), then runs the planner.
// If the carbon API is down we still return a plan, just without CO2 figures.
export async function buildPlan(req: PlanRequest, now = new Date(), fetcher: typeof fetch = fetch): Promise<PlanResult> {
  const region = findRegion(req.region);
  if (!region) throw new Error(`Unknown region ${req.region}`);

  const from = new Date(now);
  from.setUTCMinutes(from.getUTCMinutes() < 30 ? 0 : 30, 0, 0);

  const [prices, carbon] = await Promise.all([
    getAgilePrices(region.code, from, fetcher),
    getCarbonForecast(region.carbonRegionId, from, fetcher).catch((err) => {
      console.warn("Carbon forecast unavailable:", err instanceof Error ? err.message : err);
      return new Map<string, number>();
    }),
  ]);

  const slots = withCarbon(prices, carbon);
  const plan = planCharge(slots, {
    batteryKwh: req.batteryKwh,
    currentPercent: req.currentPercent,
    targetPercent: req.targetPercent,
    chargerKw: req.chargerKw,
    readyBy: req.readyBy,
    mode: req.mode,
    now,
  });

  // Timeline for the chart: everything from now until the deadline.
  const timeline = slots.filter((s) => new Date(s.start) >= from && new Date(s.end) <= req.readyBy);
  return { ...plan, timeline, carbonAvailable: carbon.size > 0 };
}
