"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSession, currentUserId, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { addVehicle, createUser, deleteVehicle, findUserByEmail } from "@/lib/queries";
import { credentialsSchema, vehicleSchema } from "@/lib/validation";

export type FormState = { error?: string } | undefined;

export async function signUp(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const id = await createUser(parsed.data.email, await hashPassword(parsed.data.password));
  if (!id) return { error: "An account with that email already exists" };

  await createSession(id);
  redirect("/dashboard");
}

export async function logIn(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Invalid email or password" };

  const user = await findUserByEmail(parsed.data.email);
  // Same message either way so we don't reveal which emails have accounts.
  if (!user || !(await verifyPassword(parsed.data.password, user.password_hash))) {
    return { error: "Invalid email or password" };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logOut() {
  await destroySession();
  redirect("/");
}

export async function createVehicle(_prev: FormState, form: FormData): Promise<FormState> {
  const userId = await currentUserId();
  if (!userId) redirect("/login");

  const parsed = vehicleSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await addVehicle(userId, parsed.data);
  revalidatePath("/dashboard");
  return undefined;
}

export async function removeVehicle(form: FormData) {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  await deleteVehicle(userId, Number(form.get("id")));
  revalidatePath("/dashboard");
}
