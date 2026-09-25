import type { Dashboard } from '../lib/api';
import { AQI_BANDS, formatNumber } from '../lib/format';
import type { Layers } from './DataMap';

// Mirrors the province shading in DataMap: fire colour at 0.03 → 0.45 opacity,
// relative to the province with the most hotspots.
const SHADING = 'linear-gradient(to right, rgb(240 113 78 / 0.03), rgb(240 113 78 / 0.45))';
const AQI_TICKS = ['0', '50', '100', '150', '200', '300+'];

export default function MapLegend({ data, layers, hint }: { data: Dashboard | null; layers: Layers; hint: boolean }) {
  const maxFires = Math.max(0, ...(data?.fires.by_province.map((p) => p.count) ?? []));
  const showFires = layers.fires && maxFires > 0;
  const showAir = layers.air && !!data?.air.stations.length;
  if (!showFires && !showAir && !hint) return null;

  return (
    <div className="pointer-events-none w-[220px] space-y-2.5 rounded-lg border border-line bg-bg/80 px-3 py-2.5 backdrop-blur-md">
      {showFires && (
        <div>
          <div className="source-tag mb-1.5">Fire hotspots per province</div>
          <div className="h-2 rounded-sm bg-surface-2" style={{ backgroundImage: SHADING }} />
          <div className="mt-1 flex justify-between font-mono text-[10px] tabular-nums text-ink-3">
            <span>0</span>
            <span>{formatNumber(maxFires)}</span>
          </div>
        </div>
      )}

      {showAir && (
        <div>
          <div className="source-tag mb-1.5">Air quality (AQI) · dots</div>
          <div className="flex h-2 overflow-hidden rounded-sm">
            {AQI_BANDS.map((b) => (
              <span key={b.label} className="flex-1" style={{ background: b.color }} title={b.label} />
            ))}
          </div>
          {/* Each label sits at the start of its band */}
          <div className="mt-1 flex font-mono text-[10px] tabular-nums text-ink-3">
            {AQI_TICKS.map((t) => (
              <span key={t} className="flex-1">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {hint && <div className="text-[11px] text-ink-3">Click a province for details</div>}
    </div>
  );
}
