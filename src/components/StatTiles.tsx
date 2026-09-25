import type { ReactNode } from 'react';
import type { Dashboard } from '../lib/api';
import { aqiBand, formatNumber } from '../lib/format';
import CountUp from './CountUp';
import { cn } from '../lib/utils';

interface TileProps {
  accent: string;
  label: string;
  source: string;
  value: ReactNode;
  unit?: string;
  detail: ReactNode;
  footer: ReactNode;
}

// One cell of the readout strip. The accent hairline uses the same color as the
// layer on the map, so the tiles double as the legend.
function Tile({ accent, label, source, value, unit, detail, footer }: TileProps) {
  return (
    <div className="relative flex flex-col gap-4 bg-surface p-5">
      <span aria-hidden className="absolute inset-x-5 top-0 h-[2px]" style={{ background: accent }} />
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-ink">{label}</span>
        <span className="source-tag">{source}</span>
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-5xl leading-none tracking-tight text-ink tabular-nums">{value}</span>
          {unit && <span className="source-tag">{unit}</span>}
        </div>
        <div className="mt-2 text-[13px] text-ink-2">{detail}</div>
      </div>
      <div className="mt-auto border-t border-dashed border-line pt-3 text-xs text-ink-3">{footer}</div>
    </div>
  );
}

function TileSkeleton() {
  return (
    <div className="flex flex-col gap-4 bg-surface p-5" aria-hidden>
      <div className="skeleton h-4 w-28" />
      <div className="skeleton h-12 w-24" />
      <div className="skeleton h-4 w-36" />
      <div className="mt-2 border-t border-dashed border-line pt-3">
        <div className="skeleton h-3 w-32" />
      </div>
    </div>
  );
}

// A 1px gap over a line-colored background draws the dividers between cells.
const STRIP = 'grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 xl:grid-cols-4';

const empty = (text: string) => <span className="text-ink-3">{text}</span>;

export default function StatTiles({ data, loading }: { data: Dashboard | null; loading: boolean }) {
  if (loading || !data) {
    return (
      <div className={STRIP}>
        {[0, 1, 2, 3].map((i) => (
          <TileSkeleton key={i} />
        ))}
      </div>
    );
  }

  const { air, fires, earthquakes, rainfall } = data;
  const band = aqiBand(air.average_aqi);
  const worstCity = air.stations[0];
  const topFire = fires.by_province[0];
  const strongest = earthquakes.events.reduce<(typeof earthquakes.events)[number] | null>(
    (best, e) => ((e.magnitude ?? 0) > (best?.magnitude ?? -1) ? e : best),
    null,
  );
  const droughtHigh = rainfall.by_province.filter((p) => p.drought_risk === 'high').length;
  const driest = rainfall.by_province[0];

  return (
    <div className={STRIP}>
      <Tile
        accent={band.color}
        label="Air quality"
        source="WAQI"
        value={air.average_aqi == null ? '—' : <CountUp value={air.average_aqi} />}
        unit={air.average_aqi == null ? undefined : 'AQI avg'}
        detail={
          air.average_aqi == null ? (
            empty('No station readings in this period')
          ) : (
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: band.color }} />
              {band.label} · {air.stations.length} stations
            </span>
          )
        }
        footer={worstCity ? <>Worst: <span className="text-ink-2">{worstCity.city.split(',')[0]}</span> at {worstCity.aqi}</> : '—'}
      />
      <Tile
        accent="var(--color-fire)"
        label="Fire hotspots"
        source="NASA FIRMS"
        value={<CountUp value={fires.total} />}
        unit="detected"
        detail={fires.total ? `${formatNumber(fires.high_confidence)} high confidence` : empty('No hotspots detected')}
        footer={topFire ? <>Most in <span className="text-ink-2">{topFire.province}</span> ({formatNumber(topFire.count)})</> : '—'}
      />
      <Tile
        accent="var(--color-quake)"
        label="Earthquakes"
        source="BMKG"
        value={<CountUp value={earthquakes.total} />}
        unit={earthquakes.total === 1 ? 'event' : 'events'}
        detail={
          earthquakes.max_magnitude != null ? (
            <>Strongest M{earthquakes.max_magnitude.toFixed(1)}</>
          ) : (
            empty('No events recorded')
          )
        }
        footer={strongest ? <span className="line-clamp-1">{strongest.description || strongest.province}</span> : '—'}
      />
      <Tile
        accent="var(--color-rain)"
        label="Rainfall"
        source="Open-Meteo"
        value={rainfall.average_mm == null ? '—' : <CountUp value={rainfall.average_mm} digits={1} />}
        unit={rainfall.average_mm == null ? undefined : 'mm/day'}
        detail={
          rainfall.by_province.length ? (
            <span className={cn(droughtHigh > 0 && 'text-quake')}>
              {droughtHigh} {droughtHigh === 1 ? 'province' : 'provinces'} at high drought risk
            </span>
          ) : (
            empty('No rainfall data')
          )
        }
        footer={driest ? <>Driest: <span className="text-ink-2">{driest.province}</span> ({driest.avg_rain_mm} mm/day)</> : '—'}
      />
    </div>
  );
}
