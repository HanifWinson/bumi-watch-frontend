// AQI bands follow the US EPA scale, the same one the agent's prompt uses.
export const AQI_BANDS = [
  { max: 50, label: 'Good', color: '#7fb77e' },
  { max: 100, label: 'Moderate', color: '#e3c55b' },
  { max: 150, label: 'Unhealthy for sensitive groups', short: 'Sensitive', color: '#eb9a4f' },
  { max: 200, label: 'Unhealthy', color: '#e0634a' },
  { max: 300, label: 'Very unhealthy', color: '#b2587d' },
  { max: Infinity, label: 'Hazardous', color: '#8c3b52' },
];

export function aqiBand(aqi: number | null | undefined) {
  if (aqi == null) return { label: 'No data', short: 'No data', color: 'rgb(242 238 232 / 0.3)' };
  const band = AQI_BANDS.find((b) => aqi <= b.max)!;
  return { ...band, short: band.short ?? band.label };
}

export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return 'never';
  const mins = Math.round((now - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function formatNumber(n: number | null | undefined, digits = 0): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export const PERIODS = [
  { days: 1, label: '24h', long: 'the last 24 hours' },
  { days: 7, label: '7d', long: 'the last 7 days' },
  { days: 30, label: '30d', long: 'the last 30 days' },
] as const;

export type PeriodDays = (typeof PERIODS)[number]['days'];

export const periodLabel = (days: number) => PERIODS.find((p) => p.days === days)?.long ?? `the last ${days} days`;

// Friendly names for the agent's tools (agent/toolDefinitions.js)
export const TOOL_LABELS: Record<string, { label: string; source: string }> = {
  query_air_quality: { label: 'Air quality', source: 'WAQI' },
  query_fire_hotspots: { label: 'Fire hotspots', source: 'NASA FIRMS' },
  query_earthquakes: { label: 'Earthquakes', source: 'BMKG' },
  query_rainfall: { label: 'Rainfall', source: 'Open-Meteo' },
  query_cross_correlation: { label: 'Cross-source check', source: 'All sources' },
  query_national_overview: { label: 'National overview', source: 'All sources' },
};

export function modelLabel(model: string | undefined): string {
  if (!model) return 'NVIDIA Nemotron';
  const name = model.split('/').pop() ?? model;
  if (/nemotron-3-nano/i.test(name)) return 'Nemotron 3 Nano';
  if (/nemotron-3-super/i.test(name)) return 'Nemotron 3 Super';
  return name;
}

// "Kalimantan Tengah · 24h" from a tool call's arguments, for the live steps
export function describeToolArgs(args: Record<string, unknown>): string {
  const parts: string[] = [];
  if (args.city) parts.push(String(args.city));
  else if (args.province) parts.push(String(args.province));
  else parts.push('All Indonesia');
  if (args.minMagnitude != null) parts.push(`M${args.minMagnitude}+`);
  const days = Number(args.days);
  if (Number.isFinite(days)) parts.push(PERIODS.find((p) => p.days === days)?.label ?? `${days}d`);
  return parts.join(' · ');
}

// The dashboard period closest to a tool's look-back (tools default to 7 days)
export function periodFor(days: unknown): PeriodDays {
  const d = Number(days ?? 7);
  if (!Number.isFinite(d)) return 7;
  return d <= 1 ? 1 : d <= 7 ? 7 : 30;
}
