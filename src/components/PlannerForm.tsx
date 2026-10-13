"use client";

import { useMemo, useState } from "react";
import { REGIONS } from "@/lib/regions";
import type { PlanResult as Result } from "@/lib/plan-service";
import type { Vehicle } from "@/lib/queries";
import { PlanResult } from "./PlanResult";

// Default deadline: 7am tomorrow, as a value for <input type="datetime-local">.
function defaultReadyBy() {
  const d = new Date();
  d.setDate(d.getDate() + (d.getHours() >= 7 ? 1 : 0));
  d.setHours(7, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T07:00`;
}

export function PlannerForm({ vehicles = [] }: { vehicles?: Vehicle[] }) {
  const first = vehicles[0];
  const [vehicleId, setVehicleId] = useState(first ? String(first.id) : "");
  const [form, setForm] = useState({
    region: first?.region ?? "C",
    batteryKwh: String(first?.battery_kwh ?? 60),
    chargerKw: String(first?.charger_kw ?? 7.4),
    currentPercent: "30",
    targetPercent: "80",
    readyBy: defaultReadyBy(),
    mode: "flexible",
  });
  const [result, setResult] = useState<(Result & { saved?: boolean }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const chooseVehicle = (id: string) => {
    setVehicleId(id);
    const v = vehicles.find((x) => String(x.id) === id);
    if (v) setForm((f) => ({ ...f, region: v.region, batteryKwh: String(v.battery_kwh), chargerKw: String(v.charger_kw) }));
  };

  const addedKwh = useMemo(() => {
    const pct = Number(form.targetPercent) - Number(form.currentPercent);
    return pct > 0 ? ((Number(form.batteryKwh) * pct) / 100).toFixed(1) : "0";
  }, [form.batteryKwh, form.currentPercent, form.targetPercent]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          // datetime-local has no timezone; the browser's local time is what the user meant
          readyBy: new Date(form.readyBy).toISOString(),
          vehicleId: vehicleId || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong");
      setResult(body);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <form onSubmit={submit} className="card space-y-4 self-start">
        {vehicles.length > 0 && (
          <div>
            <label className="label" htmlFor="vehicle">Car</label>
            <select id="vehicle" className="input" value={vehicleId} onChange={(e) => chooseVehicle(e.target.value)}>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
              <option value="">Other / not saved</option>
            </select>
          </div>
        )}

        <div>
          <label className="label" htmlFor="region">Your region</label>
          <select id="region" className="input" value={form.region} onChange={update("region")}>
            {REGIONS.map((r) => (
              <option key={r.code} value={r.code}>{r.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field id="batteryKwh" label="Battery (kWh)" value={form.batteryKwh} onChange={update("batteryKwh")} step="0.1" />
          <Field id="chargerKw" label="Charger (kW)" value={form.chargerKw} onChange={update("chargerKw")} step="0.1" />
          <Field id="currentPercent" label="Charge now (%)" value={form.currentPercent} onChange={update("currentPercent")} />
          <Field id="targetPercent" label="Target (%)" value={form.targetPercent} onChange={update("targetPercent")} />
        </div>
        <p className="-mt-2 text-xs text-slate-500">Adds about {addedKwh} kWh to the battery.</p>

        <div>
          <label className="label" htmlFor="readyBy">Ready by</label>
          <input id="readyBy" type="datetime-local" className="input" value={form.readyBy} onChange={update("readyBy")} required />
        </div>

        <fieldset>
          <legend className="label">Charger type</legend>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Choice name="mode" value="flexible" current={form.mode} onChange={update("mode")} title="Smart" text="Can pause and resume" />
            <Choice name="mode" value="continuous" current={form.mode} onChange={update("mode")} title="Basic" text="One unbroken session" />
          </div>
        </fieldset>

        <button className="btn w-full" disabled={loading}>{loading ? "Checking prices…" : "Find cheapest time"}</button>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </form>

      <div>
        {result ? (
          <PlanResult result={result} />
        ) : (
          <div className="card grid h-full min-h-64 place-items-center text-center text-slate-500">
            <p>Fill in your car details to see when electricity is cheapest before you need to leave.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Field(props: { id: string; label: string; value: string; onChange: React.ChangeEventHandler<HTMLInputElement>; step?: string }) {
  return (
    <div>
      <label className="label" htmlFor={props.id}>{props.label}</label>
      <input id={props.id} type="number" inputMode="decimal" className="input" value={props.value} onChange={props.onChange} step={props.step ?? "1"} required />
    </div>
  );
}

function Choice(props: { name: string; value: string; current: string; onChange: React.ChangeEventHandler<HTMLInputElement>; title: string; text: string }) {
  const active = props.current === props.value;
  return (
    <label className={`cursor-pointer rounded-lg border p-2 ${active ? "border-brand bg-brand-light/50" : "border-slate-300"}`}>
      <input type="radio" className="sr-only" name={props.name} value={props.value} checked={active} onChange={props.onChange} />
      <span className="block font-medium">{props.title}</span>
      <span className="text-xs text-slate-500">{props.text}</span>
    </label>
  );
}
