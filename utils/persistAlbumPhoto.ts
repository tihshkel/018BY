import * as FileSystem from 'expo-file-system/legacy';

import type { FreePageElement, PageValues } from '@/types/album-page-schema';
import { normalizePhotoOrientation } from '@/utils/normalizePhotoOrientation';

const ALBUM_PHOTOS_DIR = `${FileSystem.documentDirectory}album-photos/`;

function normalizeFileUri(path: string): string {
  if (path.startsWith('file://')) return path;
  return `file://${path}`;
}

function stripFileScheme(uri: string): string {
  return uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
}

function inferPhotoExtension(sourceUri: string): 'jpg' | 'png' | 'heic' {
  const lower = sourceUri.toLowerCase();
  if (lower.includes('.png')) return 'png';
  if (lower.includes('.heic') || lower.includes('.heif')) return 'heic';
  return 'jpg';
}

function sanitizeStorageKey(relativeKey: string): string {
  return relativeKey.replace(/[^a-zA-Z0-9._-]+/g, '_');
}

export function isRemotePhotoUri(uri: string): boolean {
  return uri.startsWith('https://') || uri.startsWith('http://');
}

export function isManagedAlbumPhotoUri(uri: string): boolean {
  const normalizedDir = stripFileScheme(ALBUM_PHOTOS_DIR);
  const normalizedUri = stripFileScheme(uri);
  return normalizedUri.startsWith(normalizedDir);
}

export function buildAlbumPhotoStorageKey(parts: {
  projectId: string;
  instanceId: string;
  blockId?: string;
  slotIndex?: number;
  freeElementId?: string;
}): string {
  const { projectId, instanceId, blockId, slotIndex, freeElementId } = parts;
  if (freeElementId) {
    return sanitizeStorageKey(`${projectId}/${instanceId}/free/${freeElementId}`);
  }
  return sanitizeStorageKey(
    `${projectId}/${instanceId}/${blockId ?? 'photo'}/slot_${slotIndex ?? 0}`,
  );
}

export async function photoUriExists(uri: string): Promise<boolean> {
  if (!uri.trim()) return false;
  if (isRemotePhotoUri(uri)) return true;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists && !info.isDirectory;
  } catch {
    return false;
  }
}

/**
 * Копирует фото из галереи/кэша в documentDirectory — URI переживает перезапуск.
 * Имя файла всегда уникально (`_timestamp`), иначе replace пишет в тот же путь,
 * expo-image с cachePolicy:'disk' продолжает показывать старые байты.
 */
export async function persistAlbumPhotoUri(
  sourceUri: string,
  relativeKey: string,
): Promise<string> {
  if (!sourceUri.trim()) return sourceUri;
  if (isRemotePhotoUri(sourceUri)) return sourceUri;
  if (isManagedAlbumPhotoUri(sourceUri)) return normalizeFileUri(sourceUri);

  await FileSystem.makeDirectoryAsync(ALBUM_PHOTOS_DIR, { intermediates: true });

  const ext = inferPhotoExtension(sourceUri);
  const destPath = `${ALBUM_PHOTOS_DIR}${sanitizeStorageKey(relativeKey)}_${Date.now()}.${ext}`;
  const destUri = normalizeFileUri(destPath);

  if (stripFileScheme(sourceUri) === stripFileScheme(destPath)) {
    return destUri;
  }

  try {
    await FileSystem.copyAsync({ from: sourceUri, to: destPath });
    const normalizedUri = await normalizePhotoOrientation(destUri);
    if (normalizedUri !== destUri) {
      try {
        await FileSystem.copyAsync({
          from: normalizedUri,
          to: destPath,
        });
      } catch {
        return normalizedUri;
      }
    }
    return destUri;
  } catch (error) {
    console.warn('[persistAlbumPhotoUri] copy failed, keeping source URI', error);
    return sourceUri.startsWith('file://') || sourceUri.startsWith('/')
      ? normalizeFileUri(sourceUri)
      : sourceUri;
  }
}

/** Удаляет локальный файл альбома (после replace/remove), без ошибок если файла нет. */
export async function deleteManagedAlbumPhotoUri(uri: string | null | undefined): Promise<void> {
  if (!uri?.trim() || !isManagedAlbumPhotoUri(uri)) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // ignore
  }
}

async function resolveStoredPhotoUri(
  uri: string,
  relativeKey: string,
): Promise<string | null> {
  // HTTPS из облака — всегда оставляем.
  if (isRemotePhotoUri(uri)) {
    return uri;
  }

  // Локальный файл есть на этом устройстве — при необходимости копируем в album-photos/.
  if (await photoUriExists(uri)) {
    if (isManagedAlbumPhotoUri(uri)) {
      return uri;
    }
    return persistAlbumPhotoUri(uri, relativeKey);
  }

  // Локальный URI с другого устройства / уже удалённый кэш: НЕ обнуляем.
  // Иначе Android после pull затрёт слоты и следующим push убьёт облако.
  return uri;
}

export type SanitizePageValuesPhotosParams = {
  projectId: string;
  instanceId: string;
  values: PageValues;
};

/** Убирает битые URI; оставшиеся временные копирует в album-photos/. */
export async function sanitizePageValuesPhotos({
  projectId,
  instanceId,
  values,
}: SanitizePageValuesPhotosParams): Promise<{ values: PageValues; changed: boolean }> {
  let changed = false;
  const photoBlocks = { ...values.photoBlocks };

  for (const [blockId, block] of Object.entries(photoBlocks)) {
    if (!block) continue;
    const slots = [...block.slots];
    let blockChanged = false;

    for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
      const uri = slots[slotIndex];
      if (!uri) continue;

      const resolved = await resolveStoredPhotoUri(
        uri,
        buildAlbumPhotoStorageKey({ projectId, instanceId, blockId, slotIndex }),
      );

      if (resolved !== uri) {
        slots[slotIndex] = resolved;
        blockChanged = true;
      }
    }

    if (blockChanged) {
      photoBlocks[blockId] = { ...block, slots };
      changed = true;
    }
  }

  let freeElements = values.freeElements;
  if (freeElements?.length) {
    const nextElements: FreePageElement[] = [];

    for (const element of freeElements) {
      if (element.type !== 'image' || !element.content?.trim()) {
        nextElements.push(element);
        continue;
      }

      const resolved = await resolveStoredPhotoUri(
        element.content,
        buildAlbumPhotoStorageKey({
          projectId,
          instanceId,
          freeElementId: element.id,
        }),
      );

      if (!resolved) {
        changed = true;
        continue;
      }

      if (resolved !== element.content) {
        changed = true;
        nextElements.push({ ...element, content: resolved });
      } else {
        nextElements.push(element);
      }
    }

    if (nextElements.length !== freeElements.length || changed) {
      freeElements = nextElements;
    }
  }

  if (!changed) {
    return { values, changed: false };
  }

  return {
    values: {
      ...values,
      photoBlocks,
      ...(freeElements !== undefined ? { freeElements } : {}),
    },
    changed: true,
  };
}

export async function sanitizePageValuesMapPhotos(
  projectId: string,
  pageValuesMap: Record<string, PageValues>,
): Promise<{ pageValuesMap: Record<string, PageValues>; changed: boolean }> {
  let changed = false;
  const nextMap = { ...pageValuesMap };

  for (const [instanceId, values] of Object.entries(pageValuesMap)) {
    const result = await sanitizePageValuesPhotos({ projectId, instanceId, values });
    if (result.changed) {
      nextMap[instanceId] = result.values;
      changed = true;
    }
  }

  return { pageValuesMap: changed ? nextMap : pageValuesMap, changed };
}
