// Octopus prices differ by electricity region (the letter at the end of the tariff code).
// The Carbon Intensity API numbers the same areas differently, so we map between them.
// Sources: Octopus developer docs and carbonintensity.org.uk/regional.

export type Region = {
  code: string; // Octopus region letter
  name: string;
  carbonRegionId: number; // Carbon Intensity API region id
};

export const REGIONS: Region[] = [
  { code: "A", name: "East England", carbonRegionId: 10 },
  { code: "B", name: "East Midlands", carbonRegionId: 9 },
  { code: "C", name: "London", carbonRegionId: 13 },
  { code: "D", name: "Merseyside & North Wales", carbonRegionId: 6 },
  { code: "E", name: "West Midlands", carbonRegionId: 8 },
  { code: "F", name: "North East England", carbonRegionId: 4 },
  { code: "G", name: "North West England", carbonRegionId: 3 },
  { code: "H", name: "Southern England", carbonRegionId: 12 },
  { code: "J", name: "South East England", carbonRegionId: 14 },
  { code: "K", name: "South Wales", carbonRegionId: 7 },
  { code: "L", name: "South West England", carbonRegionId: 11 },
  { code: "M", name: "Yorkshire", carbonRegionId: 5 },
  { code: "N", name: "South Scotland", carbonRegionId: 2 },
  { code: "P", name: "North Scotland", carbonRegionId: 1 },
];

export function findRegion(code: string): Region | undefined {
  return REGIONS.find((r) => r.code === code.toUpperCase());
}
