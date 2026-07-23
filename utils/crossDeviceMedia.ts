import * as FileSystem from 'expo-file-system/legacy';

import { getAlbumImageUrisForViewing } from '@/utils/albumImages';
import { isRemotePhotoUri, stripPhotoCacheBust } from '@/utils/persistAlbumPhoto';

/** Локальные URI, которые не переживают смену устройства. */
export function isDeviceLocalMediaUri(uri: string): boolean {
  if (!uri || typeof uri !== 'string') return false;
  if (isRemotePhotoUri(uri)) return false;
  const clean = stripPhotoCacheBust(uri);
  return (
    clean.startsWith('file://') ||
    clean.startsWith('/') ||
    clean.startsWith('content://') ||
    clean.startsWith('ph://') ||
    clean.startsWith('assets-library://') ||
    clean.startsWith('ph-upload://')
  );
}

export async function localMediaUriExists(uri: string): Promise<boolean> {
  if (!uri?.trim()) return false;
  if (isRemotePhotoUri(uri)) return true;
  const clean = stripPhotoCacheBust(uri);
  if (
    clean.startsWith('ph://') ||
    clean.startsWith('assets-library://') ||
    clean.startsWith('ph-upload://') ||
    clean.startsWith('content://')
  ) {
    // На другом устройстве / платформе почти наверняка недоступны.
    try {
      const info = await FileSystem.getInfoAsync(
        clean.startsWith('/') ? `file://${clean}` : clean,
      );
      return info.exists && !info.isDirectory;
    } catch {
      return false;
    }
  }
  try {
    const info = await FileSystem.getInfoAsync(clean);
    return info.exists && !info.isDirectory;
  } catch {
    return false;
  }
}

/**
 * После sync с iOS в @project_images_* часто лежат file:// кэша —
 * на Android они мёртвые. Для шаблонных альбомов подменяем на стабильные HTTPS (GitHub).
 */
export async function canonicalizeProjectPageImages(params: {
  albumId: string;
  category?: string;
  imageUris: string[];
}): Promise<{ uris: string[]; changed: boolean }> {
  const { albumId, imageUris } = params;
  if (!Array.isArray(imageUris) || imageUris.length === 0) {
    return { uris: imageUris, changed: false };
  }

  const hasLocal = imageUris.some(
    (uri) => typeof uri === 'string' && isDeviceLocalMediaUri(uri),
  );
  if (!hasLocal) {
    return { uris: imageUris, changed: false };
  }

  // Blank interiors оставляем как есть (нормализуются отдельно).
  if (
    albumId.includes('blank') ||
    albumId.startsWith('diary_interior_')
  ) {
    return { uris: imageUris, changed: false };
  }

  try {
    const viewing = await getAlbumImageUrisForViewing(albumId);
    if (!viewing.length) {
      return { uris: imageUris, changed: false };
    }

    let changed = false;
    const next = imageUris.map((uri, index) => {
      if (typeof uri !== 'string' || !isDeviceLocalMediaUri(uri)) {
        return uri;
      }
      const replacement = viewing[index] ?? viewing[Math.min(index, viewing.length - 1)];
      if (replacement && isRemotePhotoUri(replacement)) {
        changed = true;
        return replacement;
      }
      return uri;
    });

    // Если длины совпали и все локальные — можно целиком взять viewing.
    if (
      viewing.length === imageUris.length &&
      imageUris.every((uri) => typeof uri === 'string' && isDeviceLocalMediaUri(uri))
    ) {
      return { uris: viewing, changed: true };
    }

    return { uris: next, changed };
  } catch (error) {
    console.warn('[canonicalizeProjectPageImages] failed', error);
    return { uris: imageUris, changed: false };
  }
}

/** Prefetch remote user photos so first open after login shows them quickly. */
export async function prefetchRemotePhotoUris(uris: string[]): Promise<void> {
  const remote = uris.filter(
    (uri) => typeof uri === 'string' && isRemotePhotoUri(uri),
  );
  if (!remote.length) return;

  try {
    const { Image } = await import('expo-image');
    // Не блокируем UI на всём списке — пачками.
    const chunk = 8;
    for (let i = 0; i < remote.length; i += chunk) {
      const slice = remote.slice(i, i + chunk);
      await Promise.all(
        slice.map((uri) =>
          Image.prefetch(uri, { cachePolicy: 'disk' }).catch(() => false),
        ),
      );
    }
  } catch {
    // ignore
  }
}
