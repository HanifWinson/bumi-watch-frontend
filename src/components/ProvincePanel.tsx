import { useCallback, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { useMediaQuery } from '../lib/useMediaQuery';
import { Activity, ArrowUpRight, CloudRain, Flame, Wind, X } from 'lucide-react';
import { getProvince } from '../lib/api';
import { aqiBand, formatNumber, periodLabel, timeAgo } from '../lib/format';
import { useRemote } from '../state/useRemote';

interface ProvincePanelProps {
  province: string;
  days: number;
  onClose: () => void;
  onAsk: (question: string) => void;
}

function Metric({ icon, label, value, sub }: { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-lg bg-surface-2 p-3">
      <div className="eyebrow flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className="mt-1.5 font-serif text-3xl leading-none text-ink tabular-nums">{value}</div>
      {sub && <div className="mt-1.5 text-xs text-ink-3">{sub}</div>}
    </div>
  );
}

export default function ProvincePanel({ province, days, onClose, onAsk }: ProvincePanelProps) {
  const load = useCallback((signal: AbortSignal) => getProvince(province, days, signal), [province, days]);
  const { data, error, loading, refreshing } = useRemote(`${province}:${days}`, load, 0);

  const stationAqi = data?.air_stations.length
    ? Math.round(data.air_stations.reduce((sum, s) => sum + s.aqi, 0) / data.air_stations.length)
    : null;
  const band = aqiBand(stationAqi);
  const rain = data?.rainfall?.by_province[0];
  const frp = data?.fires?.by_province[0]?.total_frp;

  // Enter from the edge the panel is anchored to: the right side on desktop, the bottom on mobile.
  const side = useMediaQuery('(min-width: 768px)');
  const offset = (px: number) => (side ? `translateX(${px}px)` : `translateY(${px}px)`);

  return (
    <motion.aside
      initial={{ opacity: 0, transform: offset(12) }}
      animate={{ opacity: 1, transform: offset(0) }}
      exit={{ opacity: 0, transform: offset(8), transition: { duration: 0.14 } }}
      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
      className="absolute inset-x-3 bottom-3 z-[500] flex max-h-[75%] flex-col rounded-xl border border-line-strong bg-surface/95 shadow-2xl shadow-black/50 backdrop-blur-md md:inset-x-auto md:bottom-3 md:right-3 md:top-3 md:max-h-none md:w-[320px]"
      aria-label={`${province} details`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-line p-4">
        <div>
          <div className="eyebrow">Province</div>
          <h3 className="mt-1 font-serif text-3xl leading-tight text-ink">{province}</h3>
          <div className="mt-1 text-xs text-ink-3">Over {periodLabel(days)}</div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="pressable -mr-1 flex h-8 w-8 items-center justify-center rounded-full text-ink-3 hover:bg-surface-3 hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="scroll-thin flex-1 overflow-y-auto p-4">
        {error ? (
          <p className="text-sm text-ink-2">{error.message}</p>
        ) : loading || refreshing || !data ? (
          <div className="grid grid-cols-2 gap-2" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-[92px] rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Metric
                icon={<Wind className="h-3.5 w-3.5" style={{ color: band.color }} />}
                label="Air quality"
                value={stationAqi ?? '—'}
                sub={stationAqi == null ? 'No station' : band.short}
              />
              <Metric
                icon={<Flame className="h-3.5 w-3.5 text-fire" />}
                label="Hotspots"
                value={formatNumber(data.fires?.total_count ?? 0)}
                sub={frp ? `${formatNumber(frp)} MW power` : undefined}
              />
              <Metric
                icon={<Activity className="h-3.5 w-3.5 text-quake" />}
                label="Earthquakes"
                value={formatNumber(data.earthquakes?.total ?? 0)}
                sub={data.earthquakes?.max_magnitude != null ? `Max M${data.earthquakes.max_magnitude.toFixed(1)}` : undefined}
              />
              <Metric
                icon={<CloudRain className="h-3.5 w-3.5 text-rain" />}
                label="Rainfall"
                value={rain?.avg_rain_mm ?? '—'}
                sub={rain ? `mm/day · drought ${rain.drought_risk}` : 'No reading'}
              />
            </div>

            {data.air_stations.length > 0 && (
              <div className="mt-5">
                <div className="eyebrow mb-2">Stations</div>
                <ul className="space-y-1.5">
                  {data.air_stations.map((s) => {
                    const b = aqiBand(s.aqi);
                    return (
                      <li key={s.city} className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate text-ink-2">{s.city.split(',')[0]}</span>
                        <span className="flex shrink-0 items-center gap-2 tabular-nums">
                          <span className="font-mono text-[11px] text-ink-3">{timeAgo(s.timestamp)}</span>
                          <span className="h-2 w-2 rounded-full" style={{ background: b.color }} />
                          {s.aqi}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      <div className="border-t border-line p-3">
        <button
          onClick={() =>
            onAsk(
              `How is the environment in ${province} over ${periodLabel(days)}? Check air quality, fires, earthquakes and rainfall, and tell me if they are linked.`,
            )
          }
          className="pressable flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-moss text-sm font-semibold text-bg hover:bg-[#b3c47b]"
        >
          Ask Bumi about {province}
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>
    </motion.aside>
  );
}
