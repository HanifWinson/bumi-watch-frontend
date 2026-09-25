import { ArrowUpRight } from 'lucide-react';
import bmkgLogo from '../assets/BMKG.png';
import nasaLogo from '../assets/nasa.png';
import openMeteoLogo from '../assets/openmeteo.png';
import waqiLogo from '../assets/WAQI.png';
import type { Freshness, Health } from '../lib/api';
import { formatNumber, modelLabel, timeAgo } from '../lib/format';

const SOURCES: {
  table: keyof Freshness;
  name: string;
  what: string;
  description: string;
  url: string;
  logo: string;
  color: string;
}[] = [
  {
    table: 'fire_hotspots',
    name: 'NASA FIRMS',
    what: 'Fire hotspots',
    description: 'Thermal anomalies from the VIIRS and MODIS satellites over the whole archipelago, with fire radiative power and confidence.',
    url: 'https://firms.modaps.eosdis.nasa.gov/',
    logo: nasaLogo,
    color: 'var(--color-fire)',
  },
  {
    table: 'air_quality',
    name: 'WAQI',
    what: 'Air quality',
    description: 'Current air quality index (US EPA scale) from government and community monitoring stations across Indonesia.',
    url: 'https://aqicn.org/',
    logo: waqiLogo,
    color: '#7fb77e',
  },
  {
    table: 'bmkg_events',
    name: 'BMKG',
    what: 'Earthquakes',
    description: "Indonesia's meteorology, climatology and geophysics agency. Magnitude, depth and location of recent earthquakes.",
    url: 'https://data.bmkg.go.id/',
    logo: bmkgLogo,
    color: 'var(--color-quake)',
  },
  {
    table: 'rainfall',
    name: 'Open-Meteo',
    what: 'Rainfall',
    description: 'Daily precipitation for each province over the past week, classified into drought and flood risk.',
    url: 'https://open-meteo.com/',
    logo: openMeteoLogo,
    color: 'var(--color-rain)',
  },
];

const STEPS = [
  { title: 'Collect', text: 'A pipeline pulls all four feeds every 30 minutes into one SQLite database, skipping duplicates.' },
  { title: 'Choose', text: 'NVIDIA Nemotron gets six query tools and decides which to call, for which province and time range.' },
  { title: 'Answer', text: 'The tool results go back to the model, which answers with numbers from the data and names its sources.' },
];

export default function Sources({ health }: { health: { data: Health | null; error: Error | null } }) {
  const fresh = health.data?.data;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6">
      <h1 className="font-serif text-4xl tracking-tight text-ink sm:text-5xl">Where the data comes from</h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">
        Every number on the dashboard and in the answers traces back to one of these public feeds. Nothing is estimated
        by the model.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {SOURCES.map((s) => {
          const t = fresh?.[s.table];
          return (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="card pressable group flex flex-col p-5 hover:border-line-strong"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1.5">
                  <img src={s.logo} alt="" className="h-full w-full object-contain" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-ink">{s.name}</div>
                  <div className="flex items-center gap-1.5 text-xs text-ink-3">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
                    {s.what}
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-ink-3 transition-colors duration-150 group-hover:text-ink" />
              </div>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-ink-2">{s.description}</p>
              <div className="mt-4 flex justify-between border-t border-dashed border-line pt-3 font-mono text-[11px] text-ink-3">
                <span className="tabular-nums">{t ? `${formatNumber(t.rows)} records stored` : health.error ? 'Backend offline' : '—'}</span>
                <span>{t ? `latest ${timeAgo(t.latest)}` : ''}</span>
              </div>
            </a>
          );
        })}
      </div>

      <h2 className="mt-14 font-serif text-3xl tracking-tight text-ink">How an answer is made</h2>
      <ol className="mt-5 grid gap-3 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="card p-5">
            <span className="eyebrow text-moss">Step {String(i + 1).padStart(2, '0')}</span>
            <div className="mt-2 font-medium text-ink">{step.title}</div>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{step.text}</p>
          </li>
        ))}
      </ol>

      <div className="card mt-3 flex flex-wrap items-center justify-between gap-3 p-5 text-sm">
        <div>
          <div className="font-medium text-ink">{modelLabel(health.data?.model)} on Nebius Token Factory</div>
          <div className="mt-0.5 text-ink-3">{health.data?.model ?? 'nvidia/nemotron-3-nano-30b-a3b'} · OpenAI-compatible function calling</div>
        </div>
        <span className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-ink-2">
          <span className="h-1.5 w-1.5 rounded-sm bg-[#76b900]" />
          NVIDIA Nemotron
        </span>
      </div>

      <p className="mt-10 text-xs text-ink-3">
        Bumi Watch · Nebius × NVIDIA Global AI Hackathon · Basemap © Esri, HERE, Garmin, OpenStreetMap contributors ·
        Province boundaries: 
        <a href="https://github.com/denyherianto/indonesia-geojson-topojson-maps-with-38-provinces" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink-2">
          denyherianto
        </a> 
        (CC BY 4.0)
      </p>
    </div>
  );
}
