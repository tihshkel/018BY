import * as ImageManipulator from 'expo-image-manipulator';

/** Достаточно для печати альбома; меньше декод на Android при превью. */
const ALBUM_PHOTO_MAX_EDGE = 2048;

function isRemotePhotoUri(uri: string): boolean {
  return uri.startsWith('https://') || uri.startsWith('http://');
}

function normalizeFileUri(path: string): string {
  if (path.startsWith('file://')) return path;
  return `file://${path}`;
}

async function resizeAlbumPhotoIfNeeded(
  sourceUri: string,
  width: number,
  height: number,
): Promise<string> {
  const maxEdge = Math.max(width, height);
  if (maxEdge <= ALBUM_PHOTO_MAX_EDGE) {
    return sourceUri;
  }

  const resize =
    width >= height
      ? { width: ALBUM_PHOTO_MAX_EDGE }
      : { height: ALBUM_PHOTO_MAX_EDGE };

  const result = await ImageManipulator.manipulateAsync(sourceUri, [{ resize }], {
    compress: 0.88,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  return result?.uri ? normalizeFileUri(result.uri) : sourceUri;
}

/**
 * Bakes EXIF orientation into pixel data (ImageManipulator auto-fix on iOS/Android).
 * pdf-lib embeds raw pixels — without this, photos may appear rotated in export.
 * Large camera rolls are downscaled to ALBUM_PHOTO_MAX_EDGE for fast in-app preview.
 */
export async function normalizePhotoOrientation(sourceUri: string): Promise<string> {
  if (!sourceUri.trim() || isRemotePhotoUri(sourceUri)) {
    return sourceUri;
  }

  try {
    const result = await ImageManipulator.manipulateAsync(sourceUri, [], {
      compress: 0.92,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    if (!result?.uri) {
      return sourceUri;
    }

    const orientedUri = normalizeFileUri(result.uri);
    return await resizeAlbumPhotoIfNeeded(orientedUri, result.width, result.height);
  } catch (error) {
    console.warn('[normalizePhotoOrientation] failed, keeping source URI', error);
  }

  return sourceUri;
}
