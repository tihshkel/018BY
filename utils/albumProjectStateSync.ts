import type { PageInstance, PageValues } from '@/types/album-page-schema';

export type AlbumProjectSnapshot = {
  pageValuesMap: Record<string, PageValues>;
  instances: PageInstance[];
  images: string[];
};

const snapshots = new Map<string, AlbumProjectSnapshot>();
const listeners = new Map<string, Set<(snapshot: AlbumProjectSnapshot) => void>>();

function notifyAlbumProjectSnapshotListeners(
  projectId: string,
  snapshot: AlbumProjectSnapshot,
): void {
  const projectListeners = listeners.get(projectId);
  if (!projectListeners?.size) return;

  queueMicrotask(() => {
    projectListeners.forEach((listener) => listener(snapshot));
  });
}

export function getAlbumProjectSnapshot(projectId: string): AlbumProjectSnapshot | undefined {
  return snapshots.get(projectId);
}

export function publishAlbumProjectSnapshot(
  projectId: string,
  snapshot: AlbumProjectSnapshot
): void {
  snapshots.set(projectId, snapshot);
  notifyAlbumProjectSnapshotListeners(projectId, snapshot);
}

export function patchAlbumProjectSnapshot(
  projectId: string,
  patch: Partial<AlbumProjectSnapshot>
): void {
  const current = snapshots.get(projectId) ?? {
    pageValuesMap: {},
    instances: [],
    images: [],
  };

  publishAlbumProjectSnapshot(projectId, {
    pageValuesMap: patch.pageValuesMap ?? current.pageValuesMap,
    instances: patch.instances ?? current.instances,
    images: patch.images ?? current.images,
  });
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
    queueMicrotask(() => listener(existing));
  }

  return () => {
    listeners.get(projectId)?.delete(listener);
  };
}
