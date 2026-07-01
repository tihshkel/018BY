import { useCallback, useMemo } from 'react';

import { useDeferredRecord } from '@/hooks/use-deferred-record';

type Options = { debounceMs?: number };

function captionsToRecord(captions: (string | null)[] | undefined): Record<string, string> {
  const record: Record<string, string> = {};
  for (let i = 0; i < (captions?.length ?? 0); i += 1) {
    const value = captions![i];
    if (value != null && value !== '') {
      record[String(i)] = value;
    }
  }
  return record;
}

function recordToCaptions(
  record: Record<string, string>,
  minLength: number,
): (string | null)[] {
  const indices = Object.keys(record)
    .map((key) => Number.parseInt(key, 10))
    .filter((n) => Number.isFinite(n));
  const maxIndex = Math.max(minLength - 1, ...indices, -1);
  const next: (string | null)[] = Array.from({ length: maxIndex + 1 }, () => null);
  for (const [key, value] of Object.entries(record)) {
    const index = Number.parseInt(key, 10);
    if (Number.isFinite(index) && index >= 0) {
      next[index] = value;
    }
  }
  return next;
}

export function useDeferredPhotoCaptions(
  scopeKey: string | undefined,
  committed: (string | null)[] | undefined,
  onCommit: (next: (string | null)[]) => void,
  options: Options = {},
) {
  const committedRecord = useMemo(
    () => captionsToRecord(committed),
    [committed],
  );
  const minLength = committed?.length ?? 0;

  const { draft: draftRecord, setField, flush } = useDeferredRecord(
    scopeKey,
    committedRecord,
    (record) => {
      onCommit(recordToCaptions(record, minLength));
    },
    options,
  );

  const draft = useMemo(
    () => recordToCaptions(draftRecord, minLength),
    [draftRecord, minLength],
  );

  const setCaption = useCallback(
    (slotIndex: number, text: string) => {
      setField(String(slotIndex), text);
    },
    [setField],
  );

  return { draft, setCaption, flush };
}
