import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { currentUserId } from "@/lib/auth";
import { signUp } from "../actions";

export const metadata = { title: "Sign up – ChargeWise" };

export default async function SignupPage() {
  if (await currentUserId()) redirect("/dashboard");
  return <AuthForm mode="signup" action={signUp} />;
}
