"use client";

import { useActionState, useEffect, useRef } from "react";
import { createVehicle } from "@/app/actions";
import { REGIONS } from "@/lib/regions";

export function VehicleForm() {
  const [state, action, pending] = useActionState(createVehicle, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the form after a successful save.
  useEffect(() => {
    if (!pending && !state?.error) formRef.current?.reset();
  }, [pending, state]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <div>
        <label className="label" htmlFor="name">Name</label>
        <input id="name" name="name" placeholder="e.g. My MG4" className="input" required maxLength={40} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="v-battery">Battery (kWh)</label>
          <input id="v-battery" name="batteryKwh" type="number" step="0.1" defaultValue={60} className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="v-charger">Charger (kW)</label>
          <input id="v-charger" name="chargerKw" type="number" step="0.1" defaultValue={7.4} className="input" required />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="v-region">Region</label>
        <select id="v-region" name="region" defaultValue="C" className="input">
          {REGIONS.map((r) => (
            <option key={r.code} value={r.code}>{r.name}</option>
          ))}
        </select>
      </div>
      {state?.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      <button className="btn w-full" disabled={pending}>{pending ? "Saving…" : "Add car"}</button>
    </form>
  );
}
