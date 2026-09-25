import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { askAgentStream, ApiError, type AgentEvent, type AgentReply, type ChatTurn } from '../lib/api';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  meta?: AgentReply['metadata'];
  error?: boolean;
}

/** What the agent is doing right now, from the live event stream */
export interface Progress {
  phase: 'choosing' | 'querying' | 'writing';
  tools: { id: string; name: string; args: Record<string, unknown>; status: 'running' | 'ok' | 'failed' }[];
}

const START: Progress = { phase: 'choosing', tools: [] };

function advance(p: Progress, e: AgentEvent): Progress {
  switch (e.type) {
    case 'thinking':
      return { ...p, phase: e.after_tools ? 'writing' : 'choosing' };
    case 'tool_start':
      return { phase: 'querying', tools: [...p.tools, { id: e.id, name: e.name, args: e.args, status: 'running' }] };
    case 'tool_end':
      return { ...p, tools: p.tools.map((t) => (t.id === e.id ? { ...t, status: e.ok ? 'ok' : 'failed' } : t)) };
    default:
      return p;
  }
}

interface ChatState {
  messages: ChatMessage[];
  /** Live steps of the in-flight question */
  progress: Progress | null;
  pending: boolean;
  /** When the in-flight question was sent (for the elapsed timer) */
  pendingSince: number | null;
  send: (question: string) => void;
  retry: () => void;
  stop: () => void;
  clear: () => void;
}

const ChatContext = createContext<ChatState | null>(null);

let seq = 0;
const nextId = () => `${Date.now()}-${seq++}`;

// Only real exchanges go back to the agent as context, not error notices.
function toHistory(messages: ChatMessage[]): ChatTurn[] {
  return messages.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.content }));
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingSince, setPendingSince] = useState<number | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const run = useCallback(async (question: string, prior: ChatMessage[]) => {
    const controller = new AbortController();
    controllerRef.current = controller;
    setPendingSince(Date.now());
    setProgress(START);

    try {
      const reply = await askAgentStream(
        question,
        toHistory(prior),
        (event) => {
          if (controllerRef.current === controller) setProgress((p) => advance(p ?? START, event));
        },
        controller.signal,
      );
      setMessages((m) => [...m, { id: nextId(), role: 'assistant', content: reply.answer, meta: reply.metadata }]);
    } catch (err) {
      if (controller.signal.aborted && !(err instanceof ApiError)) return;
      const content =
        err instanceof ApiError && err.kind === 'offline'
          ? `${err.message} Start it with \`npm start\` in bumi-watch-nemotron, or set \`VITE_API_URL\`.`
          : err instanceof ApiError && err.kind === 'timeout'
            ? 'Nemotron took too long to answer. Try a narrower question.'
            : `Something went wrong: ${(err as Error).message}`;
      setMessages((m) => [...m, { id: nextId(), role: 'assistant', content, error: true }]);
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setPendingSince(null);
        setProgress(null);
      }
    }
  }, []);

  const send = useCallback(
    (raw: string) => {
      const question = raw.trim();
      if (!question || controllerRef.current) return;
      const prior = messagesRef.current;
      setMessages([...prior, { id: nextId(), role: 'user', content: question }]);
      run(question, prior);
    },
    [run],
  );

  // Re-ask the last question after an error
  const retry = useCallback(() => {
    if (controllerRef.current) return;
    const all = messagesRef.current;
    const lastUser = all.map((m) => m.role).lastIndexOf('user');
    if (lastUser === -1) return;
    const trimmed = all.slice(0, lastUser + 1);
    setMessages(trimmed);
    run(trimmed[lastUser].content, trimmed.slice(0, lastUser));
  }, [run]);

  const stop = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setPendingSince(null);
    setProgress(null);
  }, []);

  const clear = useCallback(() => {
    stop();
    setMessages([]);
  }, [stop]);

  const value = useMemo(
    () => ({ messages, progress, pending: pendingSince !== null, pendingSince, send, retry, stop, clear }),
    [messages, progress, pendingSince, send, retry, stop, clear],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used inside ChatProvider');
  return ctx;
}
