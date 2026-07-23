import type { AlbumPageSchema } from '@/types/album-page-schema';

/**
 * Per-slot captions under each collage photo (pregnancy «Памятные моменты» / kids p35–47).
 * Blank templates use layout.perPhotoCaptions separately.
 */
export function usesDesignedAlbumPerPhotoCaptions(
  schema: Pick<AlbumPageSchema, 'captionEnabled' | 'pageType' | 'lineGuideId'>,
  lineGuideId?: string,
): boolean {
  if (schema.captionEnabled !== true) return false;

  const pageType = schema.pageType;
  // Legacy kids page types before migration to pageType: 'photo'.
  if (pageType === 'caption_photo_page' || pageType === 'free_photo_caption') {
    return true;
  }

  if (pageType !== 'photo') return false;

  const guide = lineGuideId ?? schema.lineGuideId;
  return (
    guide === 'pregnancy_60' ||
    guide === 'pregnancy_a5' ||
    guide === 'kids_48'
  );
}
