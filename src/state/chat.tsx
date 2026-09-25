import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { askAgent, ApiError, type AgentReply, type ChatTurn } from '../lib/api';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  meta?: AgentReply['metadata'];
  error?: boolean;
}

interface ChatState {
  messages: ChatMessage[];
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
  const controllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const run = useCallback(async (question: string, prior: ChatMessage[]) => {
    const controller = new AbortController();
    controllerRef.current = controller;
    setPendingSince(Date.now());

    try {
      const reply = await askAgent(question, toHistory(prior), controller.signal);
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
  }, []);

  const clear = useCallback(() => {
    stop();
    setMessages([]);
  }, [stop]);

  const value = useMemo(
    () => ({ messages, pending: pendingSince !== null, pendingSince, send, retry, stop, clear }),
    [messages, pendingSince, send, retry, stop, clear],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used inside ChatProvider');
  return ctx;
}
