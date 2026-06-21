import type { PageInstance } from '@/types/album-page-schema';

/**
 * Фон страницы привязан к шаблону (sourcePageNumber), а не к позиции в альбоме.
 * После «+ Добавить страницу» imageIndex смещается, но PDF-шаблон остаётся прежним.
 */
export function resolveInstancePageImageUri(
  images: string[],
  instance: PageInstance,
): string | undefined {
  // imageIndex — актуальная позиция в массиве проекта (с учётом добавленных страниц).
  const atIndex = images[instance.imageIndex];
  if (atIndex) return atIndex;

  if (!instance.addedByUser && instance.sourcePageNumber >= 1) {
    return images[instance.sourcePageNumber - 1];
  }

  return undefined;
}
