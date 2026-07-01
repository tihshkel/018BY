import { useCallback, useEffect, useRef, useState } from 'react';

import { useDebouncedValue } from '@/hooks/use-debounced-value';

type UseDeferredRecordOptions = {
  debounceMs?: number;
};

/**
 * Локальный draft для текстовых полей: ввод не трогает глобальный store на каждый символ.
 * Commit в parent — с debounce; flush() — перед сохранением страницы.
 */
export function useDeferredRecord(
  scopeKey: string | undefined,
  committed: Record<string, string>,
  onCommit: (next: Record<string, string>) => void,
  options: UseDeferredRecordOptions = {},
) {
  const { debounceMs = 450 } = options;
  const [draft, setDraft] = useState(committed);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  const scopeRef = useRef(scopeKey);
  const lastCommittedJsonRef = useRef<string | null>(null);
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

  const setField = useCallback((fieldId: string, value: string) => {
    setDraft((prev) => {
      if (prev[fieldId] === value) return prev;
      return { ...prev, [fieldId]: value };
    });
  }, []);

  const flush = useCallback(() => {
    onCommitRef.current(draftRef.current);
    lastCommittedJsonRef.current = JSON.stringify(draftRef.current);
  }, []);

  return { draft, setField, flush };
}

/**
 * Локальный draft для одной строки (подпись и т.п.).
 */
export function useDeferredText(
  scopeKey: string | undefined,
  committed: string,
  onCommit: (next: string) => void,
  options: UseDeferredRecordOptions = {},
) {
  const { debounceMs = 450 } = options;
  const [draft, setDraft] = useState(committed);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  const scopeRef = useRef(scopeKey);
  const lastCommittedRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (scopeRef.current !== scopeKey) {
      scopeRef.current = scopeKey;
      setDraft(committed);
      lastCommittedRef.current = committed;
      return;
    }

    if (draftRef.current === lastCommittedRef.current && committed !== lastCommittedRef.current) {
      setDraft(committed);
      lastCommittedRef.current = committed;
    }
  }, [committed, scopeKey]);

  const debouncedDraft = useDebouncedValue(draft, debounceMs);

  useEffect(() => {
    if (debouncedDraft === lastCommittedRef.current) return;
    lastCommittedRef.current = debouncedDraft;
    if (mountedRef.current) {
      onCommitRef.current(debouncedDraft);
    }
  }, [debouncedDraft]);

  const setText = useCallback((value: string) => {
    setDraft((prev) => (prev === value ? prev : value));
  }, []);

  const flush = useCallback(() => {
    onCommitRef.current(draftRef.current);
    lastCommittedRef.current = draftRef.current;
  }, []);

  return { draft, setText, flush };
}
