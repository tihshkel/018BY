import { Asset } from 'expo-asset';
import type { ImageSourcePropType } from 'react-native';

export async function resolveImageSourceUri(
  source: ImageSourcePropType | null | undefined
): Promise<string | null> {
  if (!source) return null;

  if (typeof source === 'string') {
    // iOS ATS может блокировать http://. Делаем upgrade до https:// если возможно.
    return source.startsWith('http://') ? `https://${source.slice('http://'.length)}` : source;
  }

  // `require()` возвращает число (module id) — на iOS в некоторых сборках
  // `expo-image` может не отрисовать его напрямую, поэтому конвертируем в URI.
  if (typeof source === 'number') {
    const asset = Asset.fromModule(source);
    await asset.downloadAsync();
    return asset.localUri || asset.uri || null;
  }

  // { uri } и другие варианты
  const uri =
    typeof (source as any)?.uri === 'string' ? ((source as any).uri as string) : null;
  if (uri && uri.startsWith('http://')) {
    return `https://${uri.slice('http://'.length)}`;
  }
  return uri;
}

