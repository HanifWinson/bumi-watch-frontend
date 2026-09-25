import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { ArrowUp, Check, ChevronDown, RotateCcw, Square, SquarePen, TriangleAlert } from 'lucide-react';
import logoImg from '../assets/logo.png';
import { useChat, type ChatMessage, type Progress } from '../state/chat';
import { TOOL_LABELS, describeToolArgs, modelLabel } from '../lib/format';
import { cn } from '../lib/utils';

const SUGGESTIONS = [
  'Which province has the most fire hotspots right now?',
  'Bagaimana kualitas udara di Jakarta hari ini?',
  'Is the smoke in Pekanbaru from fires? Has it been dry?',
  'Ada gempa besar minggu ini?',
];

const ease = [0.23, 1, 0.32, 1] as const;

export default function Ask({ model }: { model?: string }) {
  const { messages, progress, pending, pendingSince, send, retry, stop, clear } = useChat();
  const endRef = useRef<HTMLDivElement>(null);
  const lastId = messages[messages.length - 1]?.id;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: messages.length > 1 ? 'smooth' : 'auto' });
  }, [lastId, pending]);

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-3xl flex-col px-4 sm:px-6">
      {messages.length === 0 ? (
        <EmptyState model={model} onPick={send} />
      ) : (
        <div className="flex-1 pb-8 pt-6">
          <div className="mb-6 flex justify-end">
            <button
              onClick={clear}
              className="pressable flex h-8 items-center gap-1.5 rounded-full px-3 text-xs text-ink-3 hover:bg-surface hover:text-ink-2"
            >
              <SquarePen className="h-3.5 w-3.5" />
              New chat
            </button>
          </div>
          <div className="space-y-8">
            {messages.map((m) =>
              m.role === 'user' ? (
                <UserMessage key={m.id} text={m.content} />
              ) : (
                <AssistantMessage key={m.id} message={m} onRetry={m.id === lastId && m.error ? retry : undefined} />
              ),
            )}
            {pendingSince && <Thinking since={pendingSince} progress={progress} />}
          </div>
          <div ref={endRef} className="h-4" />
        </div>
      )}

      <Composer onSend={send} onStop={stop} pending={pending} />
    </div>
  );
}

function EmptyState({ model, onPick }: { model?: string; onPick: (q: string) => void }) {
  return (
    <div className="flex flex-1 flex-col justify-center py-12">
      <img src={logoImg} alt="" className="mb-6 h-10 w-10" />
      <h1 className="font-serif text-5xl tracking-tight text-ink sm:text-6xl">Ask the earth.</h1>
      <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-ink-2">
        {modelLabel(model)} decides which data to pull: air quality, fire hotspots, earthquakes or rainfall. It queries
        the live database, then answers with its sources. English or Bahasa Indonesia.
      </p>
      <div className="mt-8 grid gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((q, i) => (
          <motion.button
            key={q}
            initial={{ opacity: 0, transform: 'translateY(6px)' }}
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            transition={{ duration: 0.3, ease, delay: 0.05 + i * 0.04 }}
            onClick={() => onPick(q)}
            className="pressable rounded-xl border border-line bg-surface px-4 py-3 text-left text-sm text-ink-2 hover:border-line-strong hover:bg-surface-2 hover:text-ink"
          >
            {q}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function UserMessage({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-surface-3 px-4 py-2.5 text-[15px] leading-relaxed text-ink">
        {text}
      </div>
    </div>
  );
}

function AssistantMessage({ message, onRetry }: { message: ChatMessage; onRetry?: () => void }) {
  const [showTrace, setShowTrace] = useState(false);
  const meta = message.meta;

  if (message.error) {
    return (
      <div className="flex gap-3 rounded-xl border border-fire/25 bg-fire/5 p-4">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-fire" />
        <div className="flex-1 text-sm text-ink-2">
          <div className="answer !text-sm">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="pressable mt-3 flex h-8 items-center gap-1.5 rounded-full border border-line-strong px-3 text-xs font-medium text-ink hover:bg-surface-2"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <img src={logoImg} alt="" className="mt-0.5 h-6 w-6 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="answer">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>

        {meta && (
          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {/* No source chips: the answer's own "📍 Sources" line names what it used,
                  and chips listing everything the tools fetched contradicted it */}
              <button
                onClick={() => setShowTrace((v) => !v)}
                aria-expanded={showTrace}
                className="pressable flex h-7 items-center gap-1 rounded-md px-2 font-mono text-[11px] text-ink-3 hover:bg-surface hover:text-ink-2"
              >
                {meta.tool_calls.length} tool {meta.tool_calls.length === 1 ? 'call' : 'calls'} · {(meta.latency_ms / 1000).toFixed(1)}s
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', showTrace && 'rotate-180')} />
              </button>
            </div>

            <AnimatePresence initial={false}>
              {showTrace && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease }}
                  className="overflow-hidden"
                >
                  <Trace meta={meta} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function Trace({ meta }: { meta: NonNullable<ChatMessage['meta']> }) {
  return (
    <div className="mt-2 rounded-xl border border-line bg-surface p-3">
      <div className="eyebrow mb-2">How Nemotron answered</div>
      {meta.tool_calls.length === 0 ? (
        <p className="text-xs text-ink-3">Answered without calling a tool.</p>
      ) : (
        <ol className="space-y-1.5">
          {meta.tool_calls.map((call, i) => {
            const tool = TOOL_LABELS[call.name];
            const args = Object.entries(call.args ?? {})
              .map(([k, v]) => `${k}: ${String(v)}`)
              .join(' · ');
            return (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span
                  className={cn(
                    'mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                    call.ok ? 'bg-moss/20 text-moss' : 'bg-fire/20 text-fire',
                  )}
                >
                  {call.ok ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : <span className="text-[10px] leading-none">!</span>}
                </span>
                <span className="min-w-0">
                  <span className="text-ink">{tool?.label ?? call.name}</span>
                  <span className="text-ink-3"> · {tool?.source ?? 'tool'}</span>
                  <code className="mt-0.5 block truncate font-mono text-[11px] text-ink-3">
                    {call.name}({args})
                  </code>
                </span>
              </li>
            );
          })}
        </ol>
      )}
      <div className="mt-3 border-t border-dashed border-line pt-2 font-mono text-[11px] text-ink-3">
        {modelLabel(meta.model)} · {meta.steps} {meta.steps === 1 ? 'step' : 'steps'} · {(meta.latency_ms / 1000).toFixed(1)}s
      </div>
    </div>
  );
}

const PHASE_LABEL: Record<Progress['phase'], string> = {
  choosing: 'Nemotron is choosing which data to pull',
  querying: 'Querying the database',
  writing: 'Reading the results and writing the answer',
};

// Live view of the agent: what it's doing now, and each tool call as it runs.
// Everything here comes from the backend's event stream, nothing is on a timer.
function Thinking({ since, progress }: { since: number; progress: Progress | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  const seconds = Math.max(0, Math.floor((now - since) / 1000));
  const phase = progress?.phase ?? 'choosing';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex gap-3"
      role="status"
    >
      <img src={logoImg} alt="" className="mt-0.5 h-6 w-6 shrink-0 animate-pulse" />
      <div className="min-w-0 flex-1">
        <div className="text-sm text-ink-2">
          <motion.span
            key={phase}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {PHASE_LABEL[phase]}
          </motion.span>
          <span className="ml-2 font-mono text-xs tabular-nums text-ink-3">{seconds}s</span>
        </div>

        {!!progress?.tools.length && (
          <ol className="mt-3 space-y-1.5">
            {progress.tools.map((t) => {
              const tool = TOOL_LABELS[t.name];
              return (
                <motion.li
                  key={t.id}
                  initial={{ opacity: 0, transform: 'translateY(4px)' }}
                  animate={{ opacity: 1, transform: 'translateY(0px)' }}
                  transition={{ duration: 0.2, ease }}
                  className="flex items-center gap-2 text-xs"
                >
                  <ToolStatus status={t.status} />
                  <span className="text-ink">{tool?.label ?? t.name}</span>
                  <span className="truncate text-ink-3">{describeToolArgs(t.args)}</span>
                  <span className="source-tag ml-auto shrink-0">{tool?.source ?? 'tool'}</span>
                </motion.li>
              );
            })}
          </ol>
        )}
      </div>
    </motion.div>
  );
}

function ToolStatus({ status }: { status: Progress['tools'][number]['status'] }) {
  if (status === 'running') {
    return (
      <span
        aria-label="Running"
        className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-line-strong border-t-moss motion-reduce:animate-none"
      />
    );
  }
  return (
    <span
      aria-label={status === 'ok' ? 'Done' : 'Failed'}
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
        status === 'ok' ? 'bg-moss/20 text-moss' : 'bg-fire/20 text-fire',
      )}
    >
      {status === 'ok' ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : <span className="text-[10px] leading-none">!</span>}
    </span>
  );
}

function Composer({ onSend, onStop, pending }: { onSend: (q: string) => void; onStop: () => void; pending: boolean }) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  // Grow with the content, up to a limit
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) ref.current?.focus();
  }, []);

  const submit = () => {
    if (!value.trim() || pending) return;
    onSend(value);
    setValue('');
  };

  return (
    <div className="sticky bottom-0 -mx-4 bg-gradient-to-t from-bg via-bg to-bg/0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6 sm:-mx-6 sm:px-6">
      <div className="flex items-end gap-2 rounded-2xl border border-line-strong bg-surface p-2 shadow-xl shadow-black/30 transition-colors duration-150 focus-within:border-moss/50">
        <textarea
          ref={ref}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Ask about fires, air quality, earthquakes or rain…"
          aria-label="Your question"
          className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-base text-ink placeholder:text-ink-3 focus:outline-none sm:text-[15px]"
        />
        {pending ? (
          <button
            onClick={onStop}
            aria-label="Stop"
            className="pressable flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-ink hover:bg-line-strong"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!value.trim()}
            aria-label="Send"
            className="pressable flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink text-bg hover:bg-white disabled:bg-surface-3 disabled:text-ink-3"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="mt-2 text-center text-[11px] text-ink-3">Answers come from the Bumi Watch database. Check critical decisions with official sources.</p>
    </div>
  );
}
