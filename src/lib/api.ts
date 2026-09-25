// Client for the Bumi Watch Nemotron backend (bumi-watch-nemotron/agent/index.js).

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');

// ─── Types (mirror agent/dashboard.js and agent/index.js) ─────────────────────
export type TableFreshness = { rows: number; latest: string | null };
export type Freshness = Record<'air_quality' | 'fire_hotspots' | 'bmkg_events' | 'rainfall', TableFreshness>;

export interface Health {
  status: string;
  version: string;
  model: string;
  data: Freshness;
}

export interface AirStation {
  city: string;
  province: string;
  lat: number | null;
  lon: number | null;
  aqi: number;
  category: string | null;
  timestamp: string;
}

export interface FirePoint {
  lat: number;
  lon: number;
  frp: number | null;
  confidence: string | null;
  satellite: string | null;
  timestamp: string;
  province: string;
}

export interface QuakeEvent {
  lat: number;
  lon: number;
  magnitude: number | null;
  depth_km: number | null;
  description: string;
  severity: string | null;
  timestamp: string;
  province: string;
}

export interface RainProvince {
  province: string;
  avg_rain_mm: string | undefined;
  drought_risk: string;
  flood_risk: string;
}

export interface Dashboard {
  period_days: number;
  generated_at: string;
  freshness: Freshness;
  air: { average_aqi: number | null; max_aqi: number | null; stations: AirStation[] };
  fires: {
    total: number;
    high_confidence: number;
    by_province: { province: string; count: number; total_frp: number }[];
    points: FirePoint[];
    points_truncated: boolean;
  };
  earthquakes: { total: number; max_magnitude: number | null; events: QuakeEvent[] };
  rainfall: { average_mm: number | null; by_province: RainProvince[] };
}

export interface ProvinceReport {
  province: string;
  period_days: number;
  air_quality: { overall_avg: number; overall_max: number } | null;
  fires: { total_count: number; high_confidence_count: number; by_province: { total_frp: number }[] } | null;
  earthquakes: { total: number; max_magnitude: number | null; earthquakes: QuakeEvent[] } | null;
  rainfall: { avg_rainfall: string | undefined; by_province: RainProvince[] } | null;
  air_stations: AirStation[];
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  ok: boolean;
}

export interface AgentReply {
  answer: string;
  metadata: {
    model: string;
    tool_calls: ToolCall[];
    sources: string[];
    steps: number;
    latency_ms: number;
    timestamp: string;
  };
}

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

// ─── Requests ─────────────────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(message: string, readonly kind: 'offline' | 'server' | 'timeout') {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const { timeoutMs = 15000, signal, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), timeoutMs);
  signal?.addEventListener('abort', () => controller.abort(signal.reason));

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...rest, signal: controller.signal });
  } catch (err) {
    if (controller.signal.aborted && controller.signal.reason === 'timeout') {
      throw new ApiError('The request took too long.', 'timeout');
    }
    if (signal?.aborted) throw err;
    throw new ApiError(`Can't reach the Bumi Watch backend at ${API_URL}.`, 'offline');
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.details || body?.error || `Server error ${res.status}`, 'server');
  }
  return res.json();
}

export const getHealth = (signal?: AbortSignal) => request<Health>('/health', { signal });

export const getDashboard = (days: number, signal?: AbortSignal) =>
  request<Dashboard>(`/api/dashboard?days=${days}`, { signal });

export const getProvince = (province: string, days: number, signal?: AbortSignal) =>
  request<ProvinceReport>(`/api/province/${encodeURIComponent(province)}?days=${days}`, { signal });

// The agent runs several model + tool steps; give it room.
export const askAgent = (question: string, history: ChatTurn[], signal?: AbortSignal) =>
  request<AgentReply>('/api/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, history }),
    signal,
    timeoutMs: 120000,
  });
