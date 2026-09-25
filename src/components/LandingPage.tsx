import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import logoImg from '../assets/logo.png';
import Globe from './Globe';

const ease = [0.23, 1, 0.32, 1] as const;

// Seen once per session, so it can take its time a little.
const rise = (delay: number) => ({
  initial: { opacity: 0, transform: 'translateY(12px)' },
  animate: { opacity: 1, transform: 'translateY(0px)' },
  transition: { duration: 0.6, ease, delay },
});

export default function LandingPage({ onStart }: { onStart: () => void }) {
  const reduce = !!useReducedMotion();
  const [flying, setFlying] = useState(false);
  const started = useRef(false);

  const start = () => {
    if (started.current) return;
    started.current = true;
    onStart();
  };

  // The fly-in is skippable: any click or key jumps straight to the dashboard.
  useEffect(() => {
    if (!flying) return;
    window.addEventListener('pointerdown', start);
    window.addEventListener('keydown', start);
    return () => {
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flying]);

  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-bg px-6">
      <Globe flying={flying} still={reduce} onArrive={start} />

      {/* Clears the text off the globe while it flies */}
      <motion.div
        className="relative flex flex-col items-center"
        animate={flying ? { opacity: 0, transform: 'translateY(-8px)' } : { opacity: 1, transform: 'translateY(0px)' }}
        transition={{ duration: 0.2, ease }}
      >
        <div className="relative isolate flex max-w-xl flex-col items-center text-center">
          {/* Soft dark glow behind the text, so the globe (and Indonesia's fires) passing behind it never hurts legibility */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-16 -inset-y-10 -z-10"
            style={{ background: 'radial-gradient(closest-side, rgb(21 19 17 / 0.6), rgb(21 19 17 / 0.3) 60%, transparent)' }}
          />
          <motion.img
            src={logoImg}
            alt=""
            className="mb-10 h-24 w-24 sm:h-28 sm:w-28"
            initial={{ opacity: 0, transform: 'scale(0.92)' }}
            animate={{ opacity: 1, transform: 'scale(1)' }}
            transition={{ duration: 0.7, ease }}
          />

          <motion.div {...rise(0.05)} className="eyebrow mb-5 flex items-center gap-2">
            <span>6°S 106°E</span>
            <span className="h-px w-6 bg-line-strong" />
            <span>38 provinces · 4 live feeds</span>
          </motion.div>

          <motion.h1 {...rise(0.1)} className="font-serif text-6xl leading-none tracking-tight text-ink sm:text-7xl">
            Bumi Watch
          </motion.h1>

          <motion.p {...rise(0.18)} className="mt-5 font-serif text-xl italic text-ink-2 sm:text-2xl">
            Ask the earth. It's listening.
          </motion.p>

          <motion.p {...rise(0.26)} className="mt-6 max-w-md text-[15px] leading-relaxed text-ink-2">
            Live air quality, fire hotspots, earthquakes and rainfall across Indonesia, with an AI agent that answers
            from the data.
          </motion.p>

          <motion.div {...rise(0.34)} className="mt-10">
            <button
              onClick={() => (reduce ? start() : setFlying(true))}
              disabled={flying}
              className="pressable group inline-flex h-12 items-center gap-2 rounded-full bg-ink pl-6 pr-5 text-sm font-semibold text-bg hover:bg-white"
            >
              Open dashboard
              <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
            </button>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: flying ? 0 : 1 }}
        transition={flying ? { duration: 0.2 } : { duration: 0.6, delay: 0.5 }}
        className="source-tag absolute inset-x-6 bottom-8 flex flex-col items-center justify-between gap-2 sm:flex-row"
      >
        <span>Powered by NVIDIA Nemotron on Nebius Token Factory</span>
        <span>NASA FIRMS · BMKG · WAQI · Open-Meteo</span>
      </motion.div>
    </div>
  );
}
