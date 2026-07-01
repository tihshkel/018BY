import * as ImageManipulator from 'expo-image-manipulator';

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
export async function normalizePhotoOrientation(sourceUri: string): Promise<string> {
  if (!sourceUri.trim() || isRemotePhotoUri(sourceUri)) {
    return sourceUri;
  }

  try {
    const result = await ImageManipulator.manipulateAsync(sourceUri, [], {
      compress: 0.92,
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
