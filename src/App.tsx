import { useCallback, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import Header, { type View } from './components/Header';
import LandingPage from './components/LandingPage';
import Overview from './views/Overview';
import Ask from './views/Ask';
import Sources from './views/Sources';
import { ChatProvider, useChat } from './state/chat';
import { useRemote } from './state/useRemote';
import { getHealth } from './lib/api';
import type { PeriodDays } from './lib/format';

const STARTED_KEY = 'bumi_watch_started';

function readStarted() {
  try {
    return sessionStorage.getItem(STARTED_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeStarted(value: boolean) {
  try {
    sessionStorage.setItem(STARTED_KEY, String(value));
  } catch {
    // storage blocked: the landing page simply shows again next visit
  }
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ChatProvider>
        <Shell />
      </ChatProvider>
    </MotionConfig>
  );
}

function Shell() {
  const [started, setStarted] = useState(readStarted);
  const [view, setView] = useState<View>('overview');
  const [days, setDays] = useState<PeriodDays>(1);
  const health = useRemote('health', getHealth, 60 * 1000);
  const { send } = useChat();

  const start = () => {
    writeStarted(true);
    setStarted(true);
  };

  const backToLanding = () => {
    writeStarted(false);
    setStarted(false);
  };

  const askAbout = useCallback(
    (question: string) => {
      send(question);
      setView('ask');
      window.scrollTo({ top: 0 });
    },
    [send],
  );

  return (
    <div className="min-h-dvh bg-bg">
      <AnimatePresence initial={false}>
        {!started && (
          <motion.div
            key="landing"
            className="fixed inset-0 z-[100]"
            exit={{ opacity: 0, transform: 'translateY(-24px)' }}
            transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
          >
            <LandingPage onStart={start} />
          </motion.div>
        )}
      </AnimatePresence>

      {started && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
        >
          <Header view={view} onNavigate={setView} onHome={backToLanding} health={health} />
          <main>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={view}
                initial={{ opacity: 0, transform: 'translateY(6px)' }}
                animate={{ opacity: 1, transform: 'translateY(0px)' }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              >
                {view === 'overview' && <Overview days={days} onDaysChange={setDays} onAsk={askAbout} />}
                {view === 'ask' && <Ask model={health.data?.model} />}
                {view === 'sources' && <Sources health={health} />}
              </motion.div>
            </AnimatePresence>
          </main>
        </motion.div>
      )}
    </div>
  );
}
