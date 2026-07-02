import * as ImageManipulator from 'expo-image-manipulator';

export type NormalizePhotoOrientationOptions = {
  /** JPEG quality when re-encoding is required (1 = без потерь для хранения в приложении). */
  compress?: number;
};

function isRemotePhotoUri(uri: string): boolean {
  return uri.startsWith('https://') || uri.startsWith('http://');
}

function normalizeFileUri(path: string): string {
  if (path.startsWith('file://')) return path;
  return `file://${path}`;
}

/**
 * Bakes EXIF orientation into pixel data (ImageManipulator auto-fix on iOS/Android).
 * pdf-lib embeds raw pixels — without this, photos may appear rotated in export.
 */
export async function normalizePhotoOrientation(
  sourceUri: string,
  options: NormalizePhotoOrientationOptions = {},
): Promise<string> {
  if (!sourceUri.trim() || isRemotePhotoUri(sourceUri)) {
    return sourceUri;
  }

  const compress = options.compress ?? 0.98;

  try {
    const result = await ImageManipulator.manipulateAsync(sourceUri, [], {
      compress,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    if (result?.uri) {
      return normalizeFileUri(result.uri);
    }
  } catch (error) {
    console.warn('[normalizePhotoOrientation] failed, keeping source URI', error);
  }

  return sourceUri;
}
