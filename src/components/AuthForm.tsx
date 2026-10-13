"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/app/actions";

type Props = {
  mode: "login" | "signup";
  action: (state: FormState, form: FormData) => Promise<FormState>;
};

export function AuthForm({ mode, action }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const isLogin = mode === "login";

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-1 text-2xl font-bold">{isLogin ? "Log in" : "Create an account"}</h1>
      <p className="mb-6 text-sm text-slate-600">
        {isLogin ? "Welcome back." : "Save your cars and keep a history of your charging savings."}
      </p>
      <form action={formAction} className="card space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            minLength={8}
            className="input"
            required
          />
          {!isLogin && <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>}
        </div>
        {state?.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
        <button className="btn w-full" disabled={pending}>
          {pending ? "Please wait…" : isLogin ? "Log in" : "Sign up"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        {isLogin ? "New here? " : "Already have an account? "}
        <Link className="font-medium text-brand hover:underline" href={isLogin ? "/signup" : "/login"}>
          {isLogin ? "Create an account" : "Log in"}
        </Link>
      </p>
    </div>
  );
}
