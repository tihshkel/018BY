import { useCallback, useEffect, useRef, useState } from 'react';

import { useDebouncedValue } from '@/hooks/use-debounced-value';

type UseDeferredJsonOptions = {
  debounceMs?: number;
};

/**
 * Локальный draft для JSON-serializable значений (customFields, freeElements).
 * Commit в store — с debounce; flush() — перед save / navigate.
 */
export function useDeferredJson<T>(
  scopeKey: string | undefined,
  committed: T,
  onCommit: (next: T) => void,
  options: UseDeferredJsonOptions = {},
) {
  const { debounceMs = 450 } = options;
  const [draft, setDraft] = useState(committed);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  const scopeRef = useRef(scopeKey);
  const lastCommittedJsonRef = useRef<string>(JSON.stringify(committed));
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const json = JSON.stringify(committed);
    if (scopeRef.current !== scopeKey) {
      scopeRef.current = scopeKey;
      setDraft(committed);
      lastCommittedJsonRef.current = json;
      return;
    }

    const draftJson = JSON.stringify(draftRef.current);
    if (draftJson === lastCommittedJsonRef.current && json !== lastCommittedJsonRef.current) {
      setDraft(committed);
      lastCommittedJsonRef.current = json;
    }
  }, [committed, scopeKey]);

  const debouncedDraft = useDebouncedValue(draft, debounceMs);

  useEffect(() => {
    const json = JSON.stringify(debouncedDraft);
    if (json === lastCommittedJsonRef.current) return;
    lastCommittedJsonRef.current = json;
    if (mountedRef.current) {
      onCommitRef.current(debouncedDraft);
    }
  }, [debouncedDraft]);

  const replace = useCallback((next: T) => {
    setDraft((prev) => {
      const prevJson = JSON.stringify(prev);
      const nextJson = JSON.stringify(next);
      return prevJson === nextJson ? prev : next;
    });
  }, []);

  const flush = useCallback(() => {
    onCommitRef.current(draftRef.current);
    lastCommittedJsonRef.current = JSON.stringify(draftRef.current);
  }, []);

  return { draft, replace, flush };
}
