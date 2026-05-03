import { Asset } from 'expo-asset';
import { Image as RNImage } from 'react-native';
import type { ImageSourcePropType } from 'react-native';

function shouldUpgradeToHttps(uri: string): boolean {
  if (!uri.startsWith('http://')) return false;

  try {
    const { hostname } = new URL(uri);
    return !(
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
    );
  } catch {
    return false;
  }
}

function normalizeUri(uri: string | null | undefined): string | null {
  if (!uri) return null;
  // Не трогаем локальный Metro/dev-server: в Xcode debug assets часто приходят по http://localhost.
  return shouldUpgradeToHttps(uri) ? `https://${uri.slice('http://'.length)}` : uri;
}

export async function resolveImageSourceUri(
  source: ImageSourcePropType | null | undefined
): Promise<string | null> {
  if (!source) return null;

  if (typeof source === 'string') {
    return normalizeUri(source);
  }

  // `require()` возвращает число (module id) — на iOS в некоторых сборках
  // `expo-image` может не отрисовать его напрямую, поэтому конвертируем в URI.
  if (typeof source === 'number') {
    const resolved = RNImage.resolveAssetSource(source);
    const resolvedUri = normalizeUri(resolved?.uri);
    if (resolvedUri) return resolvedUri;

    const asset = Asset.fromModule(source);
    await asset.downloadAsync();
    return normalizeUri(asset.localUri || asset.uri);
  }

  // { uri } и другие варианты
  const uri =
    typeof (source as any)?.uri === 'string' ? ((source as any).uri as string) : null;
  return normalizeUri(uri);
}

