export function formatPounds(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

export function formatTime(iso: string | Date) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
}

export function formatDayTime(iso: string | Date) {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
}

export function formatCarbon(grams: number | null) {
  if (grams === null) return "–";
  return grams >= 1000 ? `${(grams / 1000).toFixed(1)} kg` : `${grams} g`;
}
