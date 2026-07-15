import type { AlbumPageSchema } from '@/types/album-page-schema';

export function schemaHasMultiPhotoVariants(schema: AlbumPageSchema | undefined): boolean {
  return (schema?.photoBlocks ?? []).some((block) =>
    (block.variants ?? []).some((variant) => (variant.slots ?? 0) > 1),
  );
}

/**
 * Per-photo подписи: caption_photo_page / blank-шаблоны / free_photo_caption,
 * либо designed-страницы с captionEnabled и коллаж-вариантами (pregnancy «Для фото» и т.п.).
 */
export function shouldShowPerPhotoCaptions(
  schema: AlbumPageSchema | undefined,
  templateHasPerPhotoCaptions = false,
): boolean {
  if (!schema) return false;
  if (
    schema.pageType === 'caption_photo_page' ||
    schema.pageType === 'birthday_free_page' ||
    schema.pageType === 'free_photo_caption'
  ) {
    return true;
  }
  if (templateHasPerPhotoCaptions) return true;
  if (schema.captionEnabled === true && schemaHasMultiPhotoVariants(schema)) {
    return true;
  }
  return false;
}

/** Рендер подписей под слотами фото (без line-slots / template textBlocks). */
export function shouldRenderPhotoSlotCaptions(schema: AlbumPageSchema | undefined): boolean {
  if (!schema) return false;
  return (
    schema.pageType === 'caption_photo_page' ||
    schema.pageType === 'birthday_free_page' ||
    schema.pageType === 'free_photo_caption' ||
    schema.captionEnabled === true
  );
}

/** Seed из legacy `caption`, если `photoCaptions` ещё пустые. */
export function resolvePhotoCaptionsForMigration(
  photoCaptions: (string | null)[] | undefined,
  caption: string | null | undefined,
): (string | null)[] | undefined {
  if (photoCaptions?.some((item) => typeof item === 'string' && item.trim())) {
    return photoCaptions;
  }
  const trimmed = typeof caption === 'string' ? caption.trim() : '';
  if (trimmed) return [trimmed];
  return photoCaptions;
}

export function effectivePhotoCaptions(params: {
  photoCaptions?: (string | null)[] | null;
  caption?: string | null;
}): (string | null)[] {
  const { photoCaptions, caption } = params;
  if (photoCaptions?.some((item) => typeof item === 'string' && item.trim())) {
    return photoCaptions;
  }
  const trimmed = typeof caption === 'string' ? caption.trim() : '';
  if (trimmed) return [trimmed];
  return photoCaptions ?? [];
}
