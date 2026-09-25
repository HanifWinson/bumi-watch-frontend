import { useEffect, useMemo, useRef, useState } from 'react';
import { animate } from 'motion/react';
import { Pause, Play, X } from 'lucide-react';
import type { FirePoint } from '../lib/api';
import type { FireClock } from './fireCanvas';

const PLAY_MS = 10000; // the whole period, start to end
const SETTLE_S = 0.6; // easing back to the normal map at the end
const MIN_SPAN_MS = 12 * 3600e3; // less history than this isn't worth playing

const formatWIB = (ms: number) =>
  new Date(ms).toLocaleString('en-GB', {
    timeZone: 'Asia/Jakarta',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }) + ' WIB';

type Status = 'idle' | 'playing' | 'paused';

/** Plays the period's fires in the order they were detected. */
export default function Timelapse({ points, clock }: { points: FirePoint[]; clock: FireClock }) {
  const span = useMemo(() => {
    let start = Infinity;
    let end = -Infinity;
    for (const p of points) {
      const t = Date.parse(p.timestamp);
      if (t < start) start = t;
      if (t > end) end = t;
    }
    return { start, end, length: end - start };
  }, [points]);

  const [status, setStatus] = useState<Status>('idle');
  const [cursor, setCursor] = useState(span.start);
  const frame = useRef(0);
  const settle = useRef<{ stop: () => void } | null>(null);

  const show = (t: number) => {
    clock.cursor = t;
    clock.mix = 0;
    clock.freshMs = span.length / 10; // a fire glows for a tenth of the playback
    clock.redraw();
    setCursor(t);
  };

  const stopFrames = () => cancelAnimationFrame(frame.current);

  const reset = () => {
    stopFrames();
    settle.current?.stop();
    clock.cursor = null;
    clock.mix = 1;
    clock.redraw();
    setStatus('idle');
  };

  // Ease the timelapse look (fresh glow, dim embers) back into the normal map
  const finish = () => {
    stopFrames();
    setStatus('idle');
    settle.current = animate(0, 1, {
      duration: SETTLE_S,
      ease: [0.23, 1, 0.32, 1],
      onUpdate: (m) => {
        clock.mix = m;
        clock.redraw();
      },
      onComplete: () => {
        clock.cursor = null;
        clock.redraw();
      },
    });
  };

  const play = () => {
    settle.current?.stop();
    const from = status === 'paused' && cursor < span.end ? cursor : span.start;
    const began = performance.now() - ((from - span.start) / span.length) * PLAY_MS;
    setStatus('playing');
    const tick = (now: number) => {
      const t = span.start + ((now - began) / PLAY_MS) * span.length; // constant speed: linear
      if (t >= span.end) {
        show(span.end);
        finish();
        return;
      }
      show(t);
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };

  const pause = () => {
    stopFrames();
    setStatus('paused');
  };

  // New data or period: back to the normal map
  useEffect(() => {
    reset();
    return reset;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  if (!(span.length >= MIN_SPAN_MS)) return null;

  if (status === 'idle') {
    return (
      <button
        onClick={play}
        className="pressable flex h-9 items-center gap-2 rounded-full border border-line-strong bg-surface/90 pl-3 pr-4 text-xs font-medium text-ink backdrop-blur-md hover:bg-surface-2"
      >
        <Play className="h-3.5 w-3.5 fill-current text-fire" />
        {/* The span the data really covers: a young database has less than the chosen period */}
        Play {Math.max(1, Math.round(span.length / 864e5))} days of fires
      </button>
    );
  }

  return (
    <div className="flex h-9 items-center gap-3 rounded-full border border-line-strong bg-surface/90 pl-1.5 pr-2 backdrop-blur-md">
      <button
        onClick={status === 'playing' ? pause : play}
        aria-label={status === 'playing' ? 'Pause' : 'Play'}
        className="pressable flex h-7 w-7 items-center justify-center rounded-full bg-ink text-bg hover:bg-white"
      >
        {status === 'playing' ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}
      </button>
      <span className="w-[150px] font-mono text-[11px] tabular-nums text-ink">{formatWIB(cursor)}</span>
      <input
        type="range"
        min={span.start}
        max={span.end}
        step={span.length / 1000}
        value={cursor}
        onChange={(e) => {
          pause();
          show(Number(e.target.value));
        }}
        aria-label="Time"
        className="hidden w-32 accent-[#f0714e] sm:block"
      />
      <button
        onClick={reset}
        aria-label="Stop timelapse"
        className="pressable flex h-7 w-7 items-center justify-center rounded-full text-ink-3 hover:bg-surface-3 hover:text-ink"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
