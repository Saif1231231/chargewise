import { z } from "zod";
import { REGIONS } from "./regions";

const regionCodes = REGIONS.map((r) => r.code) as [string, ...string[]];

export const planRequestSchema = z
  .object({
    region: z.enum(regionCodes, { errorMap: () => ({ message: "Choose a valid region" }) }),
    batteryKwh: z.coerce.number().min(10).max(200),
    chargerKw: z.coerce.number().min(1.4).max(22),
    currentPercent: z.coerce.number().int().min(0).max(100),
    targetPercent: z.coerce.number().int().min(1).max(100),
    readyBy: z.coerce.date(),
    mode: z.enum(["flexible", "continuous"]).default("flexible"),
    vehicleId: z.string().optional(),
  })
  .refine((v) => v.targetPercent > v.currentPercent, {
    message: "Target charge must be higher than current charge",
    path: ["targetPercent"],
  });

export type PlanRequest = z.infer<typeof planRequestSchema>;

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

export const vehicleSchema = z.object({
  name: z.string().trim().min(1, "Give your car a name").max(40),
  batteryKwh: z.coerce.number().min(10).max(200),
  chargerKw: z.coerce.number().min(1.4).max(22),
  region: z.enum(regionCodes, { errorMap: () => ({ message: "Choose a valid region" }) }),
});
