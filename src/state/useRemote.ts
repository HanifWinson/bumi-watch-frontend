import { useCallback, useEffect, useRef, useState } from 'react';

interface RemoteState<T> {
  data: T | null;
  error: Error | null;
  /** First load, nothing to show yet */
  loading: boolean;
  /** Refetching while older data stays on screen */
  refreshing: boolean;
  reload: () => void;
}

/**
 * Fetches `load` whenever `key` changes and every `pollMs`.
 * Keeps the previous data on screen while a new request is in flight.
 */
export function useRemote<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
  pollMs = 5 * 60 * 1000,
): RemoteState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [pending, setPending] = useState(true);
  const [tick, setTick] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    const controller = new AbortController();
    setPending(true);
    loadRef.current(controller.signal)
      .then((result) => {
        setData(result);
        setError(null);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setPending(false);
      });
    return () => controller.abort();
  }, [key, tick]);

  useEffect(() => {
    if (!pollMs) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') setTick((t) => t + 1);
    }, pollMs);
    return () => clearInterval(id);
  }, [pollMs]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  return { data, error, loading: pending && data === null, refreshing: pending && data !== null, reload };
}
