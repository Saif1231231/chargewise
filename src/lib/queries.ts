import "server-only";
import { pool } from "./db";

// All SQL lives here. Every query that reads or changes a user's data
// filters by user_id, so one user can never see or edit another's rows.

export type User = { id: number; email: string; password_hash: string };

export type Vehicle = {
  id: number;
  name: string;
  battery_kwh: number;
  charger_kw: number;
  region: string;
};

export type SavedPlan = {
  id: number;
  vehicle_name: string | null;
  region: string;
  mode: string;
  current_percent: number;
  target_percent: number;
  kwh: number;
  cost_pence: number;
  saving_pence: number;
  carbon_grams: number | null;
  starts_at: Date;
  ends_at: Date;
  created_at: Date;
};

export async function findUserByEmail(email: string): Promise<User | null> {
  const { rows } = await pool.query<User>("SELECT id, email, password_hash FROM users WHERE email = $1", [email]);
  return rows[0] ?? null;
}

export async function createUser(email: string, passwordHash: string): Promise<number | null> {
  // ON CONFLICT avoids a race between "check email exists" and "insert".
  const { rows } = await pool.query<{ id: number }>(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING id",
    [email, passwordHash],
  );
  return rows[0]?.id ?? null;
}

export async function listVehicles(userId: number): Promise<Vehicle[]> {
  const { rows } = await pool.query<Vehicle>(
    "SELECT id, name, battery_kwh, charger_kw, region FROM vehicles WHERE user_id = $1 ORDER BY created_at",
    [userId],
  );
  return rows;
}

export async function addVehicle(
  userId: number,
  v: { name: string; batteryKwh: number; chargerKw: number; region: string },
) {
  await pool.query(
    "INSERT INTO vehicles (user_id, name, battery_kwh, charger_kw, region) VALUES ($1, $2, $3, $4, $5)",
    [userId, v.name, v.batteryKwh, v.chargerKw, v.region],
  );
}

export async function deleteVehicle(userId: number, vehicleId: number) {
  await pool.query("DELETE FROM vehicles WHERE id = $1 AND user_id = $2", [vehicleId, userId]);
}

export async function vehicleBelongsTo(userId: number, vehicleId: number): Promise<boolean> {
  const { rowCount } = await pool.query("SELECT 1 FROM vehicles WHERE id = $1 AND user_id = $2", [vehicleId, userId]);
  return (rowCount ?? 0) > 0;
}

export async function savePlan(
  userId: number,
  p: {
    vehicleId: number | null;
    region: string;
    mode: string;
    currentPercent: number;
    targetPercent: number;
    kwh: number;
    costPence: number;
    savingPence: number;
    carbonGrams: number | null;
    startsAt: string;
    endsAt: string;
  },
) {
  await pool.query(
    `INSERT INTO plans (user_id, vehicle_id, region, mode, current_percent, target_percent,
                        kwh, cost_pence, saving_pence, carbon_grams, starts_at, ends_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      userId, p.vehicleId, p.region, p.mode, p.currentPercent, p.targetPercent,
      p.kwh, p.costPence, p.savingPence, p.carbonGrams, p.startsAt, p.endsAt,
    ],
  );
}

export async function listPlans(userId: number, limit = 20): Promise<SavedPlan[]> {
  const { rows } = await pool.query<SavedPlan>(
    `SELECT p.id, v.name AS vehicle_name, p.region, p.mode, p.current_percent, p.target_percent,
            p.kwh, p.cost_pence, p.saving_pence, p.carbon_grams, p.starts_at, p.ends_at, p.created_at
     FROM plans p
     LEFT JOIN vehicles v ON v.id = p.vehicle_id
     WHERE p.user_id = $1
     ORDER BY p.created_at DESC
     LIMIT $2`,
    [userId, limit],
  );
  return rows;
}

export async function totalSavings(userId: number): Promise<{ plans: number; savedPence: number }> {
  const { rows } = await pool.query<{ plans: number; saved: number | null }>(
    "SELECT COUNT(*)::int AS plans, SUM(saving_pence) AS saved FROM plans WHERE user_id = $1",
    [userId],
  );
  return { plans: rows[0].plans, savedPence: rows[0].saved ?? 0 };
}
