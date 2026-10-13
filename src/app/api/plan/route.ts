import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { buildPlan } from "@/lib/plan-service";
import { PlanError } from "@/lib/planner";
import { savePlan, vehicleBelongsTo } from "@/lib/queries";
import { planRequestSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = planRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const input = parsed.data;

  let result;
  try {
    result = await buildPlan(input);
  } catch (err) {
    if (err instanceof PlanError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("Plan failed:", err);
    return NextResponse.json({ error: "Couldn't get prices from Octopus right now. Please try again shortly." }, { status: 502 });
  }

  // Logged-in users get the plan saved to their history.
  const userId = await currentUserId();
  if (userId) {
    const vehicleId = input.vehicleId ? Number(input.vehicleId) : null;
    const ownsVehicle = vehicleId !== null && (await vehicleBelongsTo(userId, vehicleId));
    await savePlan(userId, {
      vehicleId: ownsVehicle ? vehicleId : null,
      region: input.region,
      mode: input.mode,
      currentPercent: input.currentPercent,
      targetPercent: input.targetPercent,
      kwh: result.kwhNeeded,
      costPence: result.costPence,
      savingPence: result.savingPence,
      carbonGrams: result.carbonGrams,
      startsAt: result.slots[0].start,
      endsAt: result.slots[result.slots.length - 1].end,
    });
  }

  return NextResponse.json({ ...result, saved: Boolean(userId) });
}
