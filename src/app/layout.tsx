import type { Metadata } from "next";
import Link from "next/link";
import { currentUserId } from "@/lib/auth";
import { logOut } from "./actions";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChargeWise – charge your EV for less",
  description: "Find the cheapest and greenest time to charge your EV at home on Octopus Agile.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const userId = await currentUserId();

  return (
    <html lang="en">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-bold text-brand">
              <span aria-hidden className="grid h-7 w-7 place-items-center rounded-md bg-brand text-white">⚡</span>
              ChargeWise
            </Link>
            <div className="flex items-center gap-1">
              {userId ? (
                <>
                  <Link href="/dashboard" className="btn-ghost">Dashboard</Link>
                  <form action={logOut}>
                    <button className="btn-ghost">Log out</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn-ghost">Log in</Link>
                  <Link href="/signup" className="btn">Sign up</Link>
                </>
              )}
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 pb-8 text-xs text-slate-500">
          Prices from the Octopus Energy API. Carbon forecasts from the National Grid ESO Carbon Intensity API.
          Not affiliated with Octopus Energy.
        </footer>
      </body>
    </html>
  );
}
