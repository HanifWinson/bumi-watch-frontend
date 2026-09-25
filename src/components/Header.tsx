import { motion } from 'motion/react';
import { Github } from 'lucide-react';
import logoImg from '../assets/logo.png';
import type { Health } from '../lib/api';
import { modelLabel, timeAgo } from '../lib/format';
import { cn } from '../lib/utils';

export type View = 'overview' | 'ask' | 'sources';

const NAV: { id: View; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'ask', label: 'Ask Bumi' },
  { id: 'sources', label: 'Sources' },
];

const GITHUB_URL = 'https://github.com/HanifWinson/bumi-watch-nemotron';

interface HeaderProps {
  view: View;
  onNavigate: (view: View) => void;
  onHome: () => void;
  health: { data: Health | null; error: Error | null; loading: boolean };
}

export default function Header({ view, onNavigate, onHome, health }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <button onClick={onHome} className="pressable flex shrink-0 items-center gap-2.5 rounded-lg" aria-label="Back to start">
          <img src={logoImg} alt="" className="h-8 w-8" />
          <span className="hidden font-serif text-xl tracking-tight text-ink md:inline">Bumi Watch</span>
        </button>

        <nav className="flex items-center gap-1 rounded-full border border-line bg-surface p-1" aria-label="Main">
          {NAV.map((item) => {
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'pressable relative h-8 rounded-full px-3 text-[13px] font-medium sm:px-4',
                  active ? 'text-bg' : 'text-ink-2 hover:text-ink',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full bg-ink"
                    transition={{ type: 'spring', duration: 0.35, bounce: 0.12 }}
                  />
                )}
                <span className="relative">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <StatusPill health={health} />
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Source code on GitHub"
            className="pressable hidden h-9 w-9 items-center justify-center rounded-full border border-line text-ink-2 hover:border-line-strong hover:text-ink sm:flex"
          >
            <Github className="h-4 w-4" />
          </a>
        </div>
      </div>
    </header>
  );
}

function StatusPill({ health }: Pick<HeaderProps, 'health'>) {
  const { data, error, loading } = health;
  const latest = data
    ? Object.values(data.data)
        .map((t) => t.latest)
        .filter(Boolean)
        .sort()
        .pop()
    : null;

  // The pipeline runs every 30 min, so anything older than 2h means it stalled.
  const stale = latest ? Date.now() - new Date(latest).getTime() > 2 * 3600e3 : true;

  const state = loading ? 'loading' : error || !data ? 'offline' : stale ? 'stale' : 'live';
  const dot = { loading: 'bg-ink-3', offline: 'bg-fire', stale: 'bg-quake', live: 'bg-moss' }[state];
  const text = {
    loading: 'Connecting…',
    offline: 'Backend offline',
    stale: `Data ${timeAgo(latest)}`,
    live: `Live · ${timeAgo(latest)}`,
  }[state];

  return (
    <div className="flex items-center gap-3">
      {data && (
        <span className="hidden items-center gap-1.5 text-xs text-ink-3 lg:flex" title={data.model}>
          <span className="h-1.5 w-1.5 rounded-sm bg-[#76b900]" />
          {modelLabel(data.model)}
        </span>
      )}
      <span className="flex h-8 items-center gap-2 rounded-full border border-line px-3 text-xs text-ink-2" role="status">
        <span className="relative flex h-2 w-2">
          <span className={cn('relative h-2 w-2 rounded-full', dot)} />
        </span>
        <span className="hidden whitespace-nowrap font-mono text-[11px] sm:inline">{text}</span>
      </span>
    </div>
  );
}
