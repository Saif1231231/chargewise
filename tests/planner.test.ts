import { describe, expect, it } from "vitest";
import {
  cheapestContinuousWindow,
  cheapestSlots,
  energyNeededKwh,
  planCharge,
  PlanError,
  type Slot,
} from "@/lib/planner";

// Build half-hour slots from 18:00 UTC with the given prices.
function makeSlots(prices: number[], startIso = "2026-01-10T18:00:00.000Z", carbon?: number[]): Slot[] {
  const start = new Date(startIso).getTime();
  return prices.map((pricePence, i) => ({
    start: new Date(start + i * 30 * 60_000).toISOString(),
    end: new Date(start + (i + 1) * 30 * 60_000).toISOString(),
    pricePence,
    carbon: carbon?.[i],
  }));
}

const now = new Date("2026-01-10T18:05:00.000Z");
const readyBy = new Date("2026-01-11T07:00:00.000Z");

describe("energyNeededKwh", () => {
  it("accounts for charging losses", () => {
    // 60 kWh battery, 20% -> 80% = 36 kWh into the battery, 40 kWh from the wall at 90%
    expect(energyNeededKwh({ batteryKwh: 60, currentPercent: 20, targetPercent: 80 })).toBeCloseTo(40);
  });
});

describe("cheapestSlots", () => {
  it("picks the N cheapest slots wherever they are", () => {
    const slots = makeSlots([30, 5, 25, 4, 20, 6]);
    expect(cheapestSlots(slots, 3).map((s) => s.pricePence).sort((a, b) => a - b)).toEqual([4, 5, 6]);
  });

  it("breaks price ties with lower carbon", () => {
    const slots = makeSlots([10, 10], undefined, [200, 50]);
    expect(cheapestSlots(slots, 1)[0].carbon).toBe(50);
  });
});

describe("cheapestContinuousWindow", () => {
  it("finds the cheapest unbroken block", () => {
    const slots = makeSlots([30, 5, 25, 4, 3, 6]);
    expect(cheapestContinuousWindow(slots, 3).map((s) => s.pricePence)).toEqual([4, 3, 6]);
  });

  it("skips windows that span a gap in the data", () => {
    const slots = makeSlots([1, 1, 50, 50]);
    slots.splice(1, 1); // remove the second slot, leaving a gap after the first
    expect(cheapestContinuousWindow(slots, 2).map((s) => s.pricePence)).toEqual([50, 50]);
  });
});

describe("planCharge", () => {
  // 26 slots = 18:00 to 07:00. Expensive evening peak, cheap overnight.
  const prices = [35, 35, 35, 30, 28, 25, 20, 18, 15, 12, 10, 8, 6, 5, 5, 6, 7, 8, 9, 10, 12, 14, 15, 18, 20, 22];
  const slots = makeSlots(prices);

  it("is cheaper than plugging in and charging straight away", () => {
    const plan = planCharge(slots, {
      batteryKwh: 60, currentPercent: 30, targetPercent: 80, chargerKw: 7, readyBy, now, mode: "flexible",
    });
    expect(plan.slotsNeeded).toBe(10); // 33.3 kWh / 3.5 kWh per slot
    expect(plan.slots.reduce((s, x) => s + x.kwh, 0)).toBeCloseTo(plan.kwhNeeded, 2);
    expect(plan.costPence).toBeLessThan(plan.chargeNow.costPence);
    expect(plan.savingPence).toBeGreaterThan(0);
  });

  it("flexible mode is never more expensive than continuous", () => {
    const base = { batteryKwh: 75, currentPercent: 10, targetPercent: 90, chargerKw: 7.4, readyBy, now };
    const flexible = planCharge(slots, { ...base, mode: "flexible" });
    const continuous = planCharge(slots, { ...base, mode: "continuous" });
    expect(flexible.costPence).toBeLessThanOrEqual(continuous.costPence);
  });

  it("ignores slots that already started or end after the deadline", () => {
    const plan = planCharge(slots, {
      batteryKwh: 40, currentPercent: 50, targetPercent: 60, chargerKw: 7, readyBy: new Date("2026-01-10T20:00:00.000Z"),
      now: new Date("2026-01-10T18:45:00.000Z"), mode: "flexible",
    });
    for (const s of plan.slots) {
      expect(new Date(s.start) >= new Date("2026-01-10T18:30:00.000Z")).toBe(true);
      expect(new Date(s.end) <= new Date("2026-01-10T20:00:00.000Z")).toBe(true);
    }
  });

  it("returns null carbon when no forecast is available", () => {
    const plan = planCharge(slots, {
      batteryKwh: 40, currentPercent: 50, targetPercent: 60, chargerKw: 7, readyBy, now, mode: "flexible",
    });
    expect(plan.carbonGrams).toBeNull();
  });

  it("rejects impossible requests with a clear message", () => {
    expect(() =>
      planCharge(slots, { batteryKwh: 100, currentPercent: 0, targetPercent: 100, chargerKw: 2.3, readyBy, now, mode: "flexible" }),
    ).toThrow(PlanError);
    expect(() =>
      planCharge(slots, { batteryKwh: 60, currentPercent: 80, targetPercent: 50, chargerKw: 7, readyBy, now, mode: "flexible" }),
    ).toThrow(/higher than current/);
  });
});
