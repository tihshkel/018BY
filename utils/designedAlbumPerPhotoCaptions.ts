import type { AlbumPageSchema, PageValues } from '@/types/album-page-schema';

/**
 * Per-slot captions under collage photos.
 *
 * Android: смешанные страницы (значения + фото) с подписями — ТОЛЬКО holidays_birthday_60.
 * Pregnancy/kids: подписи только на photo-only страницах (как раньше).
 * Blank templates: layout.perPhotoCaptions отдельно.
 */
export function usesDesignedAlbumPerPhotoCaptions(
  schema: Pick<AlbumPageSchema, 'captionEnabled' | 'pageType' | 'lineGuideId'>,
  lineGuideId?: string,
): boolean {
  if (schema.captionEnabled !== true) return false;

  const guide = lineGuideId ?? schema.lineGuideId;
  // Единственное исключение для value+фото: «Праздники и события».
  if (guide === 'holidays_birthday_60') return true;

  const pageType = schema.pageType;
  // Photo-only legacy types (не смешанные value+фото).
  if (pageType === 'caption_photo_page' || pageType === 'free_photo_caption') {
    return true;
  }

  if (pageType !== 'photo') return false;

  return (
    guide === 'pregnancy_60' ||
    guide === 'pregnancy_a5' ||
    guide === 'kids_48'
  );
}

/**
 * Нужен запас под подпись: holidays (pill) или designed photo-only / уже есть текст подписи.
 * Не включать любой captionEnabled — иначе ужимаем кадры в альбомах без under-photo UI.
 */
export function pageNeedsPhotoCaptionRoom(
  schema: Pick<AlbumPageSchema, 'captionEnabled' | 'pageType' | 'lineGuideId'>,
  lineGuideId: string,
  values: Pick<PageValues, 'photoCaptions' | 'caption'>,
): boolean {
  if (lineGuideId === 'holidays_birthday_60' && schema.captionEnabled === true) {
    return true;
  }
  if (usesDesignedAlbumPerPhotoCaptions(schema, lineGuideId)) return true;
  if (values.photoCaptions?.some((caption) => Boolean(caption?.trim()))) return true;
  if (values.caption?.trim()) return true;
  return false;
}
