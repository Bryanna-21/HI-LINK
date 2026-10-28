import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

export interface LoadState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Loads data whenever the screen gains focus and exposes explicit loading
 * and error states, so every screen can render all three honestly.
 */
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []): LoadState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    try {
      setError(null);
      setData(await loader());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useFocusEffect(
    useCallback(() => {
      void run();
    }, [run]),
  );

  return { data, loading, error, reload: run };
}
