import { PixelRatio, Platform } from 'react-native';

/** Потолок decode на экране редактора — не раздувать bitmap под зум 3.5×. */
const ANDROID_DECODE_CAP = 1536;

/**
 * Подсказка Glide: декодировать фото под размер слота, а не полный 2048px кадр.
 * Без width/height allowDownscaling на Android часто даёт мыло — поэтому раньше
 * отключали downscale и ловили OOM/фризы.
 */
export function androidDecodeSize(
  layoutWidth: number,
  layoutHeight: number,
  zoomHeadroom = 2,
): { width: number; height: number } | undefined {
  if (Platform.OS !== 'android') return undefined;
  if (!(layoutWidth > 0) || !(layoutHeight > 0)) return undefined;
  const scale = PixelRatio.get() * zoomHeadroom;
  return {
    width: Math.min(ANDROID_DECODE_CAP, Math.max(64, Math.round(layoutWidth * scale))),
    height: Math.min(ANDROID_DECODE_CAP, Math.max(64, Math.round(layoutHeight * scale))),
  };
}

export function albumImageSource(
  uri: string,
  layoutWidth: number,
  layoutHeight: number,
  zoomHeadroom = 1.25,
): { uri: string; width?: number; height?: number } {
  const decoded = androidDecodeSize(layoutWidth, layoutHeight, zoomHeadroom);
  if (!decoded) return { uri };
  return { uri, width: decoded.width, height: decoded.height };
}
