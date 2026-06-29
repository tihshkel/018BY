import { useEffect, useState } from 'react';

/** Откладывает обновление value — для тяжёлого preview без лагов при быстром вводе. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) {
        setDebounced(value);
      }
    }, delayMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debounced;
}
