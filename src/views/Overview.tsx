import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { API_URL, getDashboard, type Dashboard } from '../lib/api';
import { PERIODS, aqiBand, formatNumber, timeAgo, type PeriodDays } from '../lib/format';
import { useRemote } from '../state/useRemote';
import StatTiles from '../components/StatTiles';
import DataMap, { type Layers, type MapFocus } from '../components/DataMap';
import ProvincePanel from '../components/ProvincePanel';
import Timelapse from '../components/Timelapse';
import { newFireClock } from '../components/fireCanvas';
import { cn } from '../lib/utils';

interface OverviewProps {
  days: PeriodDays;
  onDaysChange: (days: PeriodDays) => void;
  onAsk: (question: string) => void;
  selected: string | null;
  onSelect: (province: string | null) => void;
  /** Zoom the map to this province (from a chat answer's "Show on map") */
  focus: MapFocus | null;
}

export default function Overview({ days, onDaysChange, onAsk, selected, onSelect: setSelected, focus }: OverviewProps) {
  const load = useCallback((signal: AbortSignal) => getDashboard(days, signal), [days]);
  const { data, error, loading, refreshing, reload } = useRemote(`dashboard:${days}`, load);
  const [layers, setLayers] = useState<Layers>({ fires: true, quakes: true, air: true });
  const [fireClock] = useState(newFireClock);
  const canPlay = days > 1 && layers.fires && !!data?.fires.points.length;

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSelected(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl tracking-tight text-ink sm:text-5xl">Indonesia, right now</h1>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3">
            {data ? <>Updated {timeAgo(data.generated_at)} · pipeline refreshes every 30 minutes</> : 'Satellite, sensor and seismic feeds, in one place'}
          </p>
        </div>
        <PeriodSwitch days={days} onChange={onDaysChange} busy={refreshing} />
      </div>

      {error && !data && <OfflineNotice message={error.message} onRetry={reload} />}

      {!(error && !data) && (
        <div className={cn('transition-opacity duration-200', refreshing && 'opacity-60')}>
          <StatTiles data={data} loading={loading || !data} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="card relative h-[520px] overflow-hidden sm:h-[620px]">
          <DataMap data={data} layers={layers} selected={selected} onSelect={setSelected} fireClock={fireClock} focus={focus} />
          <LayerToggles layers={layers} onChange={setLayers} data={data} />
          {canPlay && (
            <div className="absolute bottom-3 left-3 z-[400]">
              <Timelapse points={data!.fires.points} clock={fireClock} />
            </div>
          )}
          {!selected && !canPlay && (
            <div className="source-tag pointer-events-none absolute bottom-3 left-3 z-[400] hidden rounded-md bg-bg/80 px-2.5 py-1.5 backdrop-blur sm:block">
              Click a province for details · shading = fire hotspots
            </div>
          )}
          <AnimatePresence>
            {selected && (
              <ProvincePanel
                key="province"
                province={selected}
                days={days}
                onClose={() => setSelected(null)}
                onAsk={onAsk}
              />
            )}
          </AnimatePresence>
        </div>

        <Rankings data={data} offline={!!error && !data} onSelect={setSelected} selected={selected} />
      </div>
    </div>
  );
}

function PeriodSwitch({ days, onChange, busy }: { days: PeriodDays; onChange: (d: PeriodDays) => void; busy: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {busy && <RefreshCw className="h-3.5 w-3.5 animate-spin text-ink-3" aria-label="Loading" />}
      <div className="flex rounded-full border border-line bg-surface p-1" role="radiogroup" aria-label="Time period">
        {PERIODS.map((p) => {
          const active = p.days === days;
          return (
            <button
              key={p.days}
              role="radio"
              aria-checked={active}
              onClick={() => onChange(p.days)}
              className={cn('pressable relative h-8 rounded-full px-3.5 text-[13px] font-medium tabular-nums', active ? 'text-ink' : 'text-ink-3 hover:text-ink-2')}
            >
              {active && (
                <motion.span
                  layoutId="period-pill"
                  className="absolute inset-0 rounded-full bg-surface-3"
                  transition={{ type: 'spring', duration: 0.3, bounce: 0.1 }}
                />
              )}
              <span className="relative">{p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LayerToggles({ layers, onChange, data }: { layers: Layers; onChange: (l: Layers) => void; data: Dashboard | null }) {
  const items: { key: keyof Layers; label: string; color: string; count?: number }[] = [
    { key: 'fires', label: 'Fires', color: 'var(--color-fire)', count: data?.fires.total },
    { key: 'quakes', label: 'Quakes', color: 'var(--color-quake)', count: data?.earthquakes.events.length },
    { key: 'air', label: 'Air quality', color: aqiBand(75).color, count: data?.air.stations.length },
  ];
  return (
    <div className="absolute left-3 top-3 z-[400] flex flex-wrap gap-1.5 pr-3">
      {items.map((item) => {
        const on = layers[item.key];
        return (
          <button
            key={item.key}
            onClick={() => onChange({ ...layers, [item.key]: !on })}
            aria-pressed={on}
            className={cn(
              'pressable flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium backdrop-blur-md',
              on ? 'border-line-strong bg-surface/90 text-ink' : 'border-line bg-bg/70 text-ink-3',
            )}
          >
            <span className="h-2 w-2 rounded-full transition-opacity duration-150" style={{ background: item.color, opacity: on ? 1 : 0.35 }} />
            {item.label}
            {item.count != null && <span className="tabular-nums text-ink-3">{formatNumber(item.count)}</span>}
          </button>
        );
      })}
    </div>
  );
}

function Rankings({
  data,
  offline,
  onSelect,
  selected,
}: {
  data: Dashboard | null;
  offline: boolean;
  onSelect: (p: string) => void;
  selected: string | null;
}) {
  const fires = data?.fires.by_province.filter((p) => p.province && p.province !== 'Unknown').slice(0, 6) ?? [];
  const maxFire = Math.max(1, ...fires.map((f) => f.count));
  const cities = data?.air.stations.slice(0, 5) ?? [];
  const quakes = data?.earthquakes.events.slice(0, 4) ?? [];

  return (
    <div className="flex flex-col gap-3">
      <Section title="Most fire hotspots" source="NASA FIRMS" empty={offline || (!!data && fires.length === 0)} loading={!data && !offline}>
        <ul className="space-y-1">
          {fires.map((f) => (
            <li key={f.province}>
              <button
                onClick={() => onSelect(f.province)}
                className={cn(
                  'pressable group w-full rounded-lg px-2.5 py-2 text-left text-sm hover:bg-surface-2',
                  selected === f.province && 'bg-surface-2',
                )}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="truncate text-ink-2 transition-colors duration-150 group-hover:text-ink">{f.province}</span>
                  <span className="tabular-nums text-ink">{formatNumber(f.count)}</span>
                </span>
                <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-surface-3">
                  <span className="bar-fill block h-full rounded-full bg-fire/80" style={{ transform: `scaleX(${f.count / maxFire})` }} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Worst air" source="WAQI" empty={offline || (!!data && cities.length === 0)} loading={!data && !offline}>
        <ul className="space-y-2.5 px-2.5 py-1">
          {cities.map((s) => {
            const band = aqiBand(s.aqi);
            return (
              <li key={s.city} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate text-ink-2">{s.city.split(',')[0]}</span>
                  <span className="block text-xs text-ink-3">{band.short}</span>
                </span>
                <span className="flex items-center gap-2 tabular-nums text-ink">
                  <span className="h-2 w-2 rounded-full" style={{ background: band.color }} />
                  {s.aqi}
                </span>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Recent earthquakes" source="BMKG" empty={offline || (!!data && quakes.length === 0)} loading={!data && !offline}>
        <ul className="space-y-2.5 px-2.5 py-1">
          {quakes.map((q, i) => (
            <li key={i} className="flex items-start justify-between gap-3 text-sm">
              <span className="min-w-0">
                <span className="line-clamp-1 text-ink-2">{q.description || q.province}</span>
                <span className="block font-mono text-[11px] text-ink-3">
                  {timeAgo(q.timestamp)}
                  {q.depth_km != null && ` · ${q.depth_km} km deep`}
                </span>
              </span>
              <span className="shrink-0 font-medium tabular-nums text-quake">M{q.magnitude?.toFixed(1) ?? '?'}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function Section({
  title,
  source,
  empty,
  loading,
  children,
}: {
  title: string;
  source: string;
  empty: boolean;
  loading: boolean;
  children: ReactNode;
}) {
  return (
    <section className="card p-3">
      <div className="mb-2 flex items-center justify-between px-2.5 pt-1">
        <h2 className="text-[13px] font-medium text-ink">{title}</h2>
        <span className="source-tag">{source}</span>
      </div>
      {loading ? (
        <div className="space-y-2 px-2.5 pb-1" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-5" />
          ))}
        </div>
      ) : empty ? (
        <p className="px-2.5 pb-2 text-sm text-ink-3">Nothing recorded in this period.</p>
      ) : (
        children
      )}
    </section>
  );
}

function OfflineNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="card flex flex-col gap-3 border-fire/30 p-4 sm:flex-row sm:items-center">
      <WifiOff className="h-5 w-5 shrink-0 text-fire" />
      <div className="flex-1 text-sm">
        <p className="text-ink">{message}</p>
        <p className="mt-0.5 text-ink-3">
          Run <code className="rounded bg-surface-3 px-1">npm start</code> in <code className="rounded bg-surface-3 px-1">bumi-watch-nemotron</code>,
          or point <code className="rounded bg-surface-3 px-1">VITE_API_URL</code> at a deployed backend (now {API_URL}).
        </p>
      </div>
      <button
        onClick={onRetry}
        className="pressable h-9 shrink-0 rounded-full border border-line-strong px-4 text-sm font-medium text-ink hover:bg-surface-2"
      >
        Try again
      </button>
    </div>
  );
}
