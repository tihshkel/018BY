import type { PageInstance, PageValues } from '@/types/album-page-schema';

export type AlbumProjectSnapshotMeta = {
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

export type AlbumProjectSnapshot = {
  pageValuesMap: Record<string, PageValues>;
  instances: PageInstance[];
  images: string[];
  /** Нужна для lineGuideId при fast-path (без ожидания AsyncStorage). */
  meta?: AlbumProjectSnapshotMeta | null;
};

/** Сколько проектов держать в RAM — иначе Android деградирует после многих альбомов. */
const MAX_SNAPSHOTS = 3;

const snapshots = new Map<string, AlbumProjectSnapshot>();
const snapshotOrder: string[] = [];
const listeners = new Map<string, Set<(snapshot: AlbumProjectSnapshot) => void>>();

function touchSnapshotOrder(projectId: string): void {
  const idx = snapshotOrder.indexOf(projectId);
  if (idx >= 0) snapshotOrder.splice(idx, 1);
  snapshotOrder.push(projectId);
  while (snapshotOrder.length > MAX_SNAPSHOTS) {
    const evictId = snapshotOrder.shift();
    if (!evictId || evictId === projectId) continue;
    snapshots.delete(evictId);
    listeners.delete(evictId);
  }
}

export function getAlbumProjectSnapshot(projectId: string): AlbumProjectSnapshot | undefined {
  return snapshots.get(projectId);
}

export function publishAlbumProjectSnapshot(
  projectId: string,
  snapshot: AlbumProjectSnapshot,
  options?: { notify?: boolean },
): void {
  const prev = snapshots.get(projectId);
  // meta не затираем при publish только values/instances (частые save).
  const next: AlbumProjectSnapshot = {
    ...snapshot,
    meta: snapshot.meta !== undefined ? snapshot.meta : (prev?.meta ?? null),
  };
  snapshots.set(projectId, next);
  touchSnapshotOrder(projectId);
  // notify:false — RAM уже актуальна для preview/fast-path, без перерисовки
  // всех подписчиков (список страниц / соседние экраны) на JS-потоке.
  if (options?.notify === false) return;
  listeners.get(projectId)?.forEach((listener) => listener(next));
}

export function patchAlbumProjectSnapshot(
  projectId: string,
  patch: Partial<AlbumProjectSnapshot>,
  options?: { notify?: boolean },
): void {
  const current = snapshots.get(projectId) ?? {
    pageValuesMap: {},
    instances: [],
    images: [],
    meta: null,
  };

  publishAlbumProjectSnapshot(
    projectId,
    {
      pageValuesMap: patch.pageValuesMap ?? current.pageValuesMap,
      instances: patch.instances ?? current.instances,
      images: patch.images ?? current.images,
      meta: patch.meta !== undefined ? patch.meta : current.meta,
    },
    options,
  );
}

export function subscribeAlbumProjectSnapshot(
  projectId: string,
  listener: (snapshot: AlbumProjectSnapshot) => void
): () => void {
  if (!listeners.has(projectId)) {
    listeners.set(projectId, new Set());
  }

  listeners.get(projectId)?.add(listener);

  const existing = snapshots.get(projectId);
  if (existing) {
    listener(existing);
  }

  return () => {
    listeners.get(projectId)?.delete(listener);
  };
}

export function clearAlbumProjectSnapshot(projectId: string): void {
  snapshots.delete(projectId);
  listeners.delete(projectId);
  const idx = snapshotOrder.indexOf(projectId);
  if (idx >= 0) snapshotOrder.splice(idx, 1);
}

/** Сброс всех in-memory проектов (низкая память / уход с экрана альбомов). */
export function clearAllAlbumProjectSnapshots(): void {
  snapshots.clear();
  listeners.clear();
  snapshotOrder.length = 0;
}
