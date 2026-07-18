import type { PageInstance, PageValues } from '@/types/album-page-schema';

import { syncWidgetSnapshot } from '@/utils/widgetSnapshot';

export type AlbumProjectPersistMeta = {
  id: string;
  title: string;
  category?: string;
  albumId?: string;
  interiorType?: string;
  coverType?: string;
  hasPdfTemplate?: boolean;
  isReadyMadeAlbum?: boolean;
  pagesCount?: number;
};

type PersistPayload = {
  images: string[];
  instances: PageInstance[];
  pageValuesMap: Record<string, PageValues>;
  meta: AlbumProjectPersistMeta | null;
  /** When set, incremental persist writes only this page entry (not full map). */
  changedInstanceId?: string;
};

type PersistRunner = (payload: PersistPayload) => Promise<void>;

const timers = new Map<string, ReturnType<typeof setTimeout>>();
const payloads = new Map<string, PersistPayload>();
const runners = new Map<string, PersistRunner>();
const inFlight = new Map<string, Promise<void>>();
let widgetSyncTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleWidgetSync(): void {
  if (widgetSyncTimer) clearTimeout(widgetSyncTimer);
  // Реже на Android: полный пересчёт виджета тяжёлый и лаг после многих сохранений.
  widgetSyncTimer = setTimeout(() => {
    widgetSyncTimer = null;
    void syncWidgetSnapshot();
  }, 8000);
}

/** Только таймер — pending payload не трогаем (иначе теряем правки во время записи). */
export function cancelAlbumProjectPersist(projectId: string): void {
  const timer = timers.get(projectId);
  if (timer) {
    clearTimeout(timer);
    timers.delete(projectId);
  }
}

export function scheduleAlbumProjectPersist(
  projectId: string,
  payload: PersistPayload,
  run: PersistRunner,
  delayMs = 400
): void {
  payloads.set(projectId, payload);
  runners.set(projectId, run);

  const existing = timers.get(projectId);
  if (existing) clearTimeout(existing);

  timers.set(
    projectId,
    setTimeout(() => {
      timers.delete(projectId);
      void flushAlbumProjectPersist(projectId);
    }, delayMs)
  );
}

export async function flushAlbumProjectPersist(projectId: string): Promise<boolean> {
  const active = inFlight.get(projectId);
  if (active) {
    await active;
    if (payloads.has(projectId) || timers.has(projectId)) {
      return flushAlbumProjectPersist(projectId);
    }
    return false;
  }

  const timer = timers.get(projectId);
  if (timer) {
    clearTimeout(timer);
    timers.delete(projectId);
  }

  const payload = payloads.get(projectId);
  const run = runners.get(projectId);
  if (!payload || !run) return false;

  payloads.delete(projectId);
  runners.delete(projectId);

  const write = (async () => {
    await run(payload);
  })();
  inFlight.set(projectId, write);
  try {
    await write;
  } finally {
    inFlight.delete(projectId);
  }

  // Правки, пришедшие во время записи, не должны пропасть.
  if (payloads.has(projectId) || timers.has(projectId)) {
    return flushAlbumProjectPersist(projectId);
  }

  scheduleWidgetSync();
  return true;
}

export function hasPendingAlbumProjectPersist(projectId: string): boolean {
  return payloads.has(projectId) || timers.has(projectId);
}
