import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import logoImg from '../assets/logo.png';

const ease = [0.23, 1, 0.32, 1] as const;

// Seen once per session, so it can take its time a little.
const rise = (delay: number) => ({
  initial: { opacity: 0, transform: 'translateY(12px)' },
  animate: { opacity: 1, transform: 'translateY(0px)' },
  transition: { duration: 0.6, ease, delay },
});

export default function LandingPage({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-bg px-6">
      <div className="relative flex max-w-xl flex-col items-center text-center">
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

        <motion.p {...rise(0.26)} className="mt-6 max-w-md text-[15px] leading-relaxed text-ink-3">
          Live air quality, fire hotspots, earthquakes and rainfall across Indonesia, with an AI agent that answers
          from the data.
        </motion.p>

        <motion.div {...rise(0.34)} className="mt-10">
          <button
            onClick={onStart}
            className="pressable group inline-flex h-12 items-center gap-2 rounded-full bg-ink pl-6 pr-5 text-sm font-semibold text-bg hover:bg-white"
          >
            Open dashboard
            <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
          </button>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="source-tag absolute inset-x-6 bottom-8 flex flex-col items-center justify-between gap-2 sm:flex-row"
      >
        <span>Powered by NVIDIA Nemotron on Nebius Token Factory</span>
        <span>NASA FIRMS · BMKG · WAQI · Open-Meteo</span>
      </motion.div>
    </div>
  );
}
