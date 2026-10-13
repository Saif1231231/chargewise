import Link from "next/link";
import { redirect } from "next/navigation";
import { VehicleForm } from "@/components/VehicleForm";
import { currentUserId } from "@/lib/auth";
import { formatCarbon, formatDayTime, formatPounds, formatTime } from "@/lib/format";
import { listPlans, listVehicles, totalSavings } from "@/lib/queries";
import { findRegion } from "@/lib/regions";
import { removeVehicle } from "../actions";

export const metadata = { title: "Dashboard – ChargeWise" };

export default async function Dashboard() {
  const userId = await currentUserId();
  if (!userId) redirect("/login");

  const [vehicles, plans, totals] = await Promise.all([listVehicles(userId), listPlans(userId), totalSavings(userId)]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-slate-600">
            {totals.plans} {totals.plans === 1 ? "plan" : "plans"} so far · {formatPounds(totals.savedPence)} saved vs charging straight away
          </p>
        </div>
        <Link href="/" className="btn">Plan a charge</Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="card overflow-x-auto">
          <h2 className="mb-3 font-semibold">Recent plans</h2>
          {plans.length === 0 ? (
            <p className="text-sm text-slate-500">No plans yet. Plan a charge and it&apos;ll show up here.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">Charging</th>
                  <th className="py-2 pr-3 font-medium">Car</th>
                  <th className="py-2 pr-3 font-medium">Charge</th>
                  <th className="py-2 pr-3 text-right font-medium">Cost</th>
                  <th className="py-2 pr-3 text-right font-medium">Saved</th>
                  <th className="py-2 text-right font-medium">CO₂</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plans.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 pr-3 whitespace-nowrap">{formatDayTime(p.starts_at)}–{formatTime(p.ends_at)}</td>
                    <td className="py-2 pr-3">{p.vehicle_name ?? "–"}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{p.current_percent}% → {p.target_percent}%</td>
                    <td className="py-2 pr-3 text-right">{formatPounds(p.cost_pence)}</td>
                    <td className="py-2 pr-3 text-right text-brand">{formatPounds(Math.max(0, p.saving_pence))}</td>
                    <td className="py-2 text-right">{formatCarbon(p.carbon_grams)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <aside className="space-y-6">
          <section className="card">
            <h2 className="mb-3 font-semibold">Your cars</h2>
            {vehicles.length === 0 ? (
              <p className="mb-4 text-sm text-slate-500">Save your car so you don&apos;t have to re-enter its details.</p>
            ) : (
              <ul className="mb-4 divide-y divide-slate-100">
                {vehicles.map((v) => (
                  <li key={v.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p className="font-medium">{v.name}</p>
                      <p className="text-xs text-slate-500">
                        {v.battery_kwh} kWh · {v.charger_kw} kW · {findRegion(v.region)?.name}
                      </p>
                    </div>
                    <form action={removeVehicle}>
                      <input type="hidden" name="id" value={v.id} />
                      <button className="btn-ghost text-xs text-red-600" aria-label={`Remove ${v.name}`}>Remove</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <VehicleForm />
          </section>
        </aside>
      </div>
    </div>
  );
}
