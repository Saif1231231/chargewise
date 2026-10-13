import { PlannerForm } from "@/components/PlannerForm";
import { currentUserId } from "@/lib/auth";
import { listVehicles } from "@/lib/queries";

export default async function Home() {
  const userId = await currentUserId();
  const vehicles = userId ? await listVehicles(userId) : [];

  return (
    <div className="space-y-8">
      <section className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Charge your EV when power is cheapest</h1>
        <p className="mt-3 text-slate-600">
          Octopus Agile prices change every half hour, and overnight they can drop to a few pence (sometimes below zero).
          Tell ChargeWise about your car and when you need it, and it picks the cheapest half-hours to charge in.
        </p>
      </section>
      <PlannerForm vehicles={vehicles} />
    </div>
  );
}
