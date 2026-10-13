import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { currentUserId } from "@/lib/auth";
import { logIn } from "../actions";

export const metadata = { title: "Log in – ChargeWise" };

export default async function LoginPage() {
  if (await currentUserId()) redirect("/dashboard");
  return <AuthForm mode="login" action={logIn} />;
}
