// Works out when to charge an EV so it's ready by a deadline at the lowest cost.
// Prices come in half-hour slots (Octopus Agile), optionally with a carbon forecast.

export type Slot = {
  start: string; // ISO timestamp (UTC)
  end: string;
  pricePence: number; // p/kWh inc VAT
  carbon?: number; // gCO2/kWh forecast, if known
};

export type PlanInput = {
  batteryKwh: number;
  currentPercent: number;
  targetPercent: number;
  chargerKw: number;
  readyBy: Date;
  now?: Date;
  mode: "flexible" | "continuous";
  efficiency?: number; // wall-to-battery, home chargers lose roughly 10%
};

export type PlannedSlot = Slot & { kwh: number };

export type Plan = {
  kwhNeeded: number; // energy drawn from the wall
  slotsNeeded: number;
  slots: PlannedSlot[];
  costPence: number;
  carbonGrams: number | null;
  chargeNow: { costPence: number; carbonGrams: number | null };
  savingPence: number;
};

export class PlanError extends Error {}

const SLOT_HOURS = 0.5;

export function energyNeededKwh(input: Pick<PlanInput, "batteryKwh" | "currentPercent" | "targetPercent" | "efficiency">) {
  const efficiency = input.efficiency ?? 0.9;
  const percent = Math.max(0, input.targetPercent - input.currentPercent);
  return (input.batteryKwh * percent) / 100 / efficiency;
}

// Only consider slots that haven't started yet and finish before the deadline.
export function availableSlots(slots: Slot[], now: Date, readyBy: Date): Slot[] {
  return slots
    .filter((s) => new Date(s.start) >= floorToHalfHour(now) && new Date(s.end) <= readyBy)
    .sort((a, b) => a.start.localeCompare(b.start));
}

function floorToHalfHour(d: Date) {
  const copy = new Date(d);
  copy.setUTCMinutes(copy.getUTCMinutes() < 30 ? 0 : 30, 0, 0);
  return copy;
}

// Spread the energy across the chosen slots: every slot runs at full power
// except the last one (in time order), which tops up whatever is left.
function allocate(chosen: Slot[], kwhNeeded: number, chargerKw: number): PlannedSlot[] {
  const perSlot = chargerKw * SLOT_HOURS;
  let remaining = kwhNeeded;
  return [...chosen]
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((slot) => {
      const kwh = Math.min(perSlot, remaining);
      remaining -= kwh;
      return { ...slot, kwh: round(kwh, 3) };
    });
}

function totals(planned: PlannedSlot[]) {
  const costPence = planned.reduce((sum, s) => sum + s.kwh * s.pricePence, 0);
  const hasCarbon = planned.every((s) => s.carbon !== undefined);
  const carbonGrams = hasCarbon ? planned.reduce((sum, s) => sum + s.kwh * (s.carbon ?? 0), 0) : null;
  return { costPence: round(costPence, 1), carbonGrams: carbonGrams === null ? null : Math.round(carbonGrams) };
}

export function planCharge(allSlots: Slot[], input: PlanInput): Plan {
  if (input.targetPercent <= input.currentPercent) {
    throw new PlanError("Target charge must be higher than current charge.");
  }
  if (input.chargerKw <= 0 || input.batteryKwh <= 0) {
    throw new PlanError("Battery size and charger power must be positive.");
  }

  const now = input.now ?? new Date();
  const kwhNeeded = energyNeededKwh(input);
  const slotsNeeded = Math.ceil(kwhNeeded / (input.chargerKw * SLOT_HOURS));
  const slots = availableSlots(allSlots, now, input.readyBy);

  if (slots.length < slotsNeeded) {
    throw new PlanError(
      `Not enough time: you need ${slotsNeeded / 2} hours of charging but only ${slots.length / 2} hours of prices are available before your deadline.`,
    );
  }

  const chosen = input.mode === "flexible" ? cheapestSlots(slots, slotsNeeded) : cheapestContinuousWindow(slots, slotsNeeded);
  const planned = allocate(chosen, kwhNeeded, input.chargerKw);
  const chargeNowPlanned = allocate(slots.slice(0, slotsNeeded), kwhNeeded, input.chargerKw);

  const plan = totals(planned);
  const baseline = totals(chargeNowPlanned);

  return {
    kwhNeeded: round(kwhNeeded, 2),
    slotsNeeded,
    slots: planned,
    costPence: plan.costPence,
    carbonGrams: plan.carbonGrams,
    chargeNow: baseline,
    savingPence: round(baseline.costPence - plan.costPence, 1),
  };
}

// Smart chargers can stop and start, so just take the N cheapest half-hours.
// Ties go to the lower-carbon slot, then the earlier one.
export function cheapestSlots(slots: Slot[], n: number): Slot[] {
  return [...slots]
    .sort(
      (a, b) =>
        a.pricePence - b.pricePence ||
        (a.carbon ?? 0) - (b.carbon ?? 0) ||
        a.start.localeCompare(b.start),
    )
    .slice(0, n);
}

// Basic chargers need one unbroken block, so slide a window of N slots
// across the timeline and keep the cheapest. Gaps in the data break a window.
export function cheapestContinuousWindow(slots: Slot[], n: number): Slot[] {
  let best: Slot[] | null = null;
  let bestCost = Infinity;

  for (let i = 0; i + n <= slots.length; i++) {
    const window = slots.slice(i, i + n);
    if (!isContiguous(window)) continue;
    const cost = window.reduce((sum, s) => sum + s.pricePence, 0);
    if (cost < bestCost) {
      bestCost = cost;
      best = window;
    }
  }

  if (!best) throw new PlanError("Couldn't find an unbroken block of prices long enough. Try flexible mode.");
  return best;
}

function isContiguous(window: Slot[]) {
  for (let i = 1; i < window.length; i++) {
    if (window[i].start !== window[i - 1].end) return false;
  }
  return true;
}

function round(n: number, dp: number) {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
