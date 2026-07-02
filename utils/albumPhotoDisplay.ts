import { isManagedAlbumPhotoUri, isRemotePhotoUri } from '@/utils/persistAlbumPhoto';

/** User-uploaded album photos (not bundled template assets). */
export function isAlbumUserPhotoUri(uri: string | undefined | null): boolean {
  if (!uri?.trim()) return false;
  if (isManagedAlbumPhotoUri(uri)) return true;
  if (isRemotePhotoUri(uri)) return true;
  return uri.startsWith('file://');
}

/** Sharp in-app rendering for user photos; templates may downscale. */
export const ALBUM_USER_PHOTO_DISPLAY_PROPS = {
  cachePolicy: 'disk' as const,
  transition: 0,
  fadeDuration: 0,
  allowDownscaling: false,
} as const;

/** Full-resolution PDF page raster in editor/preview (not downscaled by expo-image). */
export const ALBUM_TEMPLATE_DISPLAY_PROPS = {
  cachePolicy: 'disk' as const,
  transition: 0,
  fadeDuration: 0,
  allowDownscaling: false,
  priority: 'high' as const,
} as const;

export function getAlbumPhotoDisplayProps(uri: string | undefined | null): {
  cachePolicy: 'disk';
  transition: number;
  fadeDuration: number;
  allowDownscaling: boolean;
} {
  if (isAlbumUserPhotoUri(uri)) {
    return ALBUM_USER_PHOTO_DISPLAY_PROPS;
  }

  return {
    cachePolicy: 'disk',
    transition: 0,
    fadeDuration: 0,
    allowDownscaling: true,
  };
}
