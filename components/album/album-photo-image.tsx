import { Image, type ImageContentFit, type ImageStyle } from 'expo-image';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { stripPhotoCacheBust } from '@/utils/persistAlbumPhoto';

/**
 * file:// для локальных путей — на Android expo-image иначе грузит медленно или с артефактами.
 * Важно: убираем `?v=` cache-bust у локальных URI — Glide/Image.getSize на Android
 * не открывают `file://…/photo.jpg?v=123` → белый/«размытый» слот после добавления фото.
 */
export function normalizeAlbumPhotoUri(uri: string): string {
  const trimmed = uri.trim();
  if (!trimmed) return trimmed;

  const isRemote =
    trimmed.startsWith('http://') || trimmed.startsWith('https://');
  const withoutBust = isRemote ? trimmed : stripPhotoCacheBust(trimmed);

  if (
    withoutBust.startsWith('file://') ||
    withoutBust.startsWith('http://') ||
    withoutBust.startsWith('https://') ||
    withoutBust.startsWith('content://')
  ) {
    return withoutBust;
  }
  if (withoutBust.startsWith('/')) {
    return `file://${withoutBust}`;
  }
  return withoutBust;
}

export function prefetchAlbumPhotoUri(uri: string | null | undefined): void {
  if (!uri?.trim()) return;
  const normalized = normalizeAlbumPhotoUri(uri);
  // Только disk: memory-disk держит decoded bitmap в RAM и давит Android после многих альбомов.
  void Image.prefetch(normalized, { cachePolicy: 'disk' }).catch(() => {});
}

/** Ждём кэш перед показом — фото появляется сразу чётким, без «размытого» первого кадра. */
export async function prefetchAlbumPhotoUriAsync(
  uri: string | null | undefined,
): Promise<void> {
  if (!uri?.trim()) return;
  const normalized = normalizeAlbumPhotoUri(uri);
  await Image.prefetch(normalized, { cachePolicy: 'disk' }).catch(() => {});
}

export const ALBUM_PHOTO_IMAGE_PROPS = {
  contentFit: 'cover' as const,
  contentPosition: 'center' as const,
  cachePolicy: 'disk' as const,
  transition: 0,
  fadeDuration: 0,
  // Android: без downscale декодируется полный 2048px кадр под маленький слот → OOM/лаги.
  allowDownscaling: true,
  priority: 'high' as const,
};

type AlbumPhotoImageBaseProps = {
  uri: string;
  recyclingKey?: string;
  contentFit?: ImageContentFit;
  onLoad?: () => void;
  onError?: () => void;
  prefetch?: boolean;
};

/** Image без обёртки — для жестов / transform внутри Animated.View. */
export function AlbumPhotoImageRaw({
  uri,
  recyclingKey,
  contentFit = 'cover',
  onLoad,
  onError,
  prefetch = true,
  style,
}: AlbumPhotoImageBaseProps & { style?: StyleProp<ImageStyle> }) {
  const normalizedUri = useMemo(() => normalizeAlbumPhotoUri(uri), [uri]);

  useEffect(() => {
    if (!prefetch) return;
    prefetchAlbumPhotoUri(normalizedUri);
  }, [normalizedUri, prefetch]);

  // recyclingKey может нести `?v=` для сброса кэша после replace; source — чистый путь.
  const imageRecyclingKey = recyclingKey ?? uri;

  return (
    <Image
      source={{ uri: normalizedUri }}
      style={[styles.image, style]}
      {...ALBUM_PHOTO_IMAGE_PROPS}
      contentFit={contentFit}
      recyclingKey={imageRecyclingKey}
      onLoad={onLoad}
      onError={onError}
    />
  );
}

type AlbumPhotoImageProps = AlbumPhotoImageBaseProps & {
  style?: StyleProp<ViewStyle>;
};

/**
 * Единый рендер фото альбома — те же настройки, что в экспорте / ReadOnlyPageAnnotations.
 * Устраняет медленную загрузку и «letterbox» на Android в превью страниц.
 */
export function AlbumPhotoImage({
  uri,
  recyclingKey,
  contentFit = 'cover',
  style,
  onLoad,
  onError,
  prefetch = true,
}: AlbumPhotoImageProps) {
  return (
    <View style={[styles.clip, style]}>
      <AlbumPhotoImageRaw
        uri={uri}
        recyclingKey={recyclingKey}
        contentFit={contentFit}
        onLoad={onLoad}
        onError={onError}
        prefetch={prefetch}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
    width: '100%',
    height: '100%',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
});
