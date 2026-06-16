import type { PageInstance } from '@/types/album-page-schema';

/**
 * Фон страницы привязан к шаблону (sourcePageNumber), а не к позиции в альбоме.
 * После «+ Добавить страницу» imageIndex смещается, но PDF-шаблон остаётся прежним.
 */
export function resolveInstancePageImageUri(
  images: string[],
  instance: PageInstance,
): string | undefined {
  if (!instance.addedByUser && instance.sourcePageNumber >= 1) {
    const canonical = images[instance.sourcePageNumber - 1];
    if (canonical) return canonical;
  }

  return images[instance.imageIndex];
}
