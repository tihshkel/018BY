import { Image } from 'expo-image';
import { Platform } from 'react-native';

/**
 * Android держит decoded bitmaps в RAM и начинает GC-фризы после долгого заполнения.
 * iOS выгружает их сам — поэтому там сессия остаётся гладкой.
 *
 * InteractionManager здесь не используем: он откладывал навигацию и сталкивался
 * с первым кадром preview.
 */
let scheduled: ReturnType<typeof setTimeout> | null = null;

export function releaseAndroidImageMemory(delayMs = 280): void {
  if (Platform.OS !== 'android') return;
  if (scheduled) clearTimeout(scheduled);
  scheduled = setTimeout(() => {
    scheduled = null;
    void Image.clearMemoryCache();
  }, delayMs);
}

export function releaseAndroidImageMemoryNow(): void {
  if (Platform.OS !== 'android') return;
  if (scheduled) {
    clearTimeout(scheduled);
    scheduled = null;
  }
  void Image.clearMemoryCache();
}
