"use client";

import type { PlanResult as Result } from "@/lib/plan-service";
import { formatCarbon, formatDayTime, formatPounds, formatTime } from "@/lib/format";
import { PriceChart } from "./PriceChart";

// Turn individual chosen slots into readable blocks, e.g. 01:00–03:30.
function toBlocks(slots: Result["slots"]) {
  const blocks: { start: string; end: string; kwh: number }[] = [];
  for (const s of slots) {
    const last = blocks[blocks.length - 1];
    if (last && last.end === s.start) {
      last.end = s.end;
      last.kwh += s.kwh;
    } else {
      blocks.push({ start: s.start, end: s.end, kwh: s.kwh });
    }
  }
  return blocks;
}

export function PlanResult({ result }: { result: Result & { saved?: boolean } }) {
  const blocks = toBlocks(result.slots);
  const chosen = new Set(result.slots.map((s) => s.start));
  const carbonSaved =
    result.carbonGrams !== null && result.chargeNow.carbonGrams !== null
      ? result.chargeNow.carbonGrams - result.carbonGrams
      : null;

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Cost with ChargeWise" value={formatPounds(result.costPence)} />
        <Stat
          label="You save vs charging now"
          value={formatPounds(Math.max(0, result.savingPence))}
          hint={`Charging now: ${formatPounds(result.chargeNow.costPence)}`}
        />
        <Stat
          label="CO₂ for this charge"
          value={formatCarbon(result.carbonGrams)}
          hint={carbonSaved !== null && carbonSaved > 0 ? `${formatCarbon(carbonSaved)} less than charging now` : undefined}
        />
      </div>

      <div className="card">
        <h2 className="mb-1 font-semibold">When to charge</h2>
        <p className="mb-3 text-sm text-slate-600">
          {result.kwhNeeded} kWh over {result.slotsNeeded / 2} hours
          {result.saved ? " · saved to your history" : ""}
        </p>
        <ul className="mb-4 flex flex-wrap gap-2">
          {blocks.map((b) => (
            <li key={b.start} className="rounded-lg bg-brand-light px-3 py-1.5 text-sm font-medium text-brand-dark">
              {formatDayTime(b.start)}–{formatTime(b.end)} · {b.kwh.toFixed(1)} kWh
            </li>
          ))}
        </ul>
        <PriceChart timeline={result.timeline} chosen={chosen} />
        <p className="mt-2 text-xs text-slate-500">
          Teal bars are the half-hours to charge in. Prices are Agile unit rates inc. VAT.
          {!result.carbonAvailable && " Carbon forecast was unavailable, so CO₂ isn't shown."}
        </p>
      </div>
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
