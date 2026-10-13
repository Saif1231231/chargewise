"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatTime } from "@/lib/format";
import type { Slot } from "@/lib/planner";

// Bar per half-hour: teal when we've chosen to charge, grey otherwise.
export function PriceChart({ timeline, chosen }: { timeline: Slot[]; chosen: Set<string> }) {
  const data = timeline.map((s) => ({
    time: formatTime(s.start),
    price: s.pricePence,
    charging: chosen.has(s.start),
    carbon: s.carbon,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={24} />
          <YAxis tick={{ fontSize: 11 }} unit="p" />
          <Tooltip
            formatter={(value) => [`${Number(value).toFixed(2)}p/kWh`, "Price"]}
            labelFormatter={(label) => `From ${label}`}
          />
          <Bar dataKey="price" radius={[3, 3, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.time} fill={d.charging ? "#0f766e" : d.price < 0 ? "#22c55e" : "#cbd5e1"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
