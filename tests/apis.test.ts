import { describe, expect, it, vi } from "vitest";
import { getAgilePrices } from "@/lib/octopus";
import { getCarbonForecast, withCarbon } from "@/lib/carbon";
import { findRegion, REGIONS } from "@/lib/regions";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("getAgilePrices", () => {
  it("uses the current Agile product and returns slots oldest first", async () => {
    const fetcher = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes("/products/?")) {
        return jsonResponse({
          results: [
            { code: "AGILE-OUTGOING-19-05-13", available_to: null },
            { code: "AGILE-23-12-06", available_to: "2024-10-01T00:00:00Z" },
            { code: "AGILE-24-10-01", available_to: null },
          ],
        });
      }
      expect(u).toContain("/products/AGILE-24-10-01/electricity-tariffs/E-1R-AGILE-24-10-01-C/");
      return jsonResponse({
        results: [
          { value_inc_vat: 21.5, valid_from: "2026-10-14T21:30:00Z", valid_to: "2026-10-14T22:00:00Z" },
          { value_inc_vat: 24.5, valid_from: "2026-10-14T21:00:00Z", valid_to: "2026-10-14T21:30:00Z" },
        ],
      });
    });

    const slots = await getAgilePrices("C", new Date("2026-10-14T21:00:00Z"), fetcher as unknown as typeof fetch);
    expect(slots.map((s) => s.pricePence)).toEqual([24.5, 21.5]);
    expect(slots[0].start).toBe("2026-10-14T21:00:00.000Z");
  });

  it("throws when Octopus is down", async () => {
    const fetcher = vi.fn(async () => jsonResponse({}, 503));
    await expect(getAgilePrices("C", new Date(), fetcher as unknown as typeof fetch)).rejects.toThrow(/503/);
  });
});

describe("carbon forecast", () => {
  it("matches forecasts to price slots by start time", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({
        data: { data: [{ from: "2026-10-14T21:00Z", to: "2026-10-14T21:30Z", intensity: { forecast: 133 } }] },
      }),
    );
    const forecast = await getCarbonForecast(13, new Date("2026-10-14T21:00:00Z"), fetcher as unknown as typeof fetch);
    const slots = withCarbon(
      [
        { start: "2026-10-14T21:00:00.000Z", end: "2026-10-14T21:30:00.000Z", pricePence: 20 },
        { start: "2026-10-14T21:30:00.000Z", end: "2026-10-14T22:00:00.000Z", pricePence: 20 },
      ],
      forecast,
    );
    expect(slots[0].carbon).toBe(133);
    expect(slots[1].carbon).toBeUndefined();
  });
});

describe("regions", () => {
  it("covers all 14 regions with unique carbon ids", () => {
    expect(REGIONS).toHaveLength(14);
    expect(new Set(REGIONS.map((r) => r.carbonRegionId)).size).toBe(14);
    expect(findRegion("c")?.name).toBe("London");
  });
});
