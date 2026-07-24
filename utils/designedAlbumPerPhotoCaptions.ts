import type { AlbumPageSchema, PageValues } from '@/types/album-page-schema';

/**
 * Per-slot captions under each collage photo (pregnancy «Памятные моменты» / kids p35–47 /
 * holidays_birthday_60). Blank templates use layout.perPhotoCaptions separately.
 */
export function usesDesignedAlbumPerPhotoCaptions(
  schema: Pick<AlbumPageSchema, 'captionEnabled' | 'pageType' | 'lineGuideId'>,
  lineGuideId?: string,
): boolean {
  if (schema.captionEnabled !== true) return false;

  const guide = lineGuideId ?? schema.lineGuideId;
  // Birthday: structured age pages + free gallery pages all need under-photo captions.
  if (guide === 'holidays_birthday_60') return true;

  const pageType = schema.pageType;
  // Legacy kids page types before migration to pageType: 'photo'.
  if (
    pageType === 'caption_photo_page' ||
    pageType === 'free_photo_caption' ||
    pageType === 'birthday_free_page'
  ) {
    return true;
  }

  if (pageType !== 'photo') return false;

  return (
    guide === 'pregnancy_60' ||
    guide === 'pregnancy_a5' ||
    guide === 'kids_48'
  );
}

/** Shrink photo frames when under-photo captions are expected. */
export function pageNeedsPhotoCaptionRoom(
  schema: Pick<AlbumPageSchema, 'captionEnabled' | 'pageType' | 'lineGuideId'>,
  lineGuideId: string,
  values: Pick<PageValues, 'photoCaptions' | 'caption'>,
): boolean {
  if (usesDesignedAlbumPerPhotoCaptions(schema, lineGuideId)) return true;
  if (schema.captionEnabled === true) return true;
  if (values.photoCaptions?.some((caption) => Boolean(caption?.trim()))) return true;
  if (values.caption?.trim()) return true;
  return false;
}
