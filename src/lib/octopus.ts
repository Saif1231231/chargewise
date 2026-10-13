import type { Slot } from "./planner";

const API = "https://api.octopus.energy/v1";

// Agile product codes change when Octopus launches a new version (e.g. AGILE-24-10-01),
// so look up whichever one is currently on sale instead of hard-coding it.
export async function currentAgileProductCode(fetcher: typeof fetch = fetch): Promise<string> {
  const res = await fetcher(`${API}/products/?brand=OCTOPUS_ENERGY&is_business=false`, {
    next: { revalidate: 60 * 60 * 24 },
  } as RequestInit);
  if (!res.ok) throw new Error(`Octopus products request failed (${res.status})`);
  const body = (await res.json()) as { results: { code: string; available_to: string | null }[] };

  const agile = body.results.filter((p) => p.code.startsWith("AGILE-") && !p.code.includes("OUTGOING"));
  const current = agile.find((p) => p.available_to === null) ?? agile[0];
  if (!current) throw new Error("No Agile tariff found");
  return current.code;
}

type RateResponse = {
  results: { value_inc_vat: number; valid_from: string; valid_to: string }[];
};

// Agile prices for the next day are published around 4pm, so this usually
// returns between ~8 and ~32 hours of half-hour slots.
export async function getAgilePrices(regionCode: string, from: Date, fetcher: typeof fetch = fetch): Promise<Slot[]> {
  const product = await currentAgileProductCode(fetcher);
  const tariff = `E-1R-${product}-${regionCode}`;
  const url = `${API}/products/${product}/electricity-tariffs/${tariff}/standard-unit-rates/?period_from=${from.toISOString()}&page_size=200`;

  const res = await fetcher(url, { next: { revalidate: 60 * 30 } } as RequestInit);
  if (!res.ok) throw new Error(`Octopus prices request failed (${res.status})`);
  const body = (await res.json()) as RateResponse;

  // The API returns newest first; we want them in time order.
  return body.results
    .map((r) => ({
      start: new Date(r.valid_from).toISOString(),
      end: new Date(r.valid_to).toISOString(),
      pricePence: r.value_inc_vat,
    }))
    .sort((a, b) => a.start.localeCompare(b.start));
}
