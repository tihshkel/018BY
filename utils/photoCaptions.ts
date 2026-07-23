import type { AlbumPageSchema } from '@/types/album-page-schema';

/** Страницы «только фото» — подписи нужны; на value/text+фото — нет. */
function isPhotoCollageCaptionPage(schema: AlbumPageSchema): boolean {
  return (
    schema.pageType === 'photo' ||
    schema.pageType === 'caption_photo_page' ||
    schema.pageType === 'free_photo_caption'
  );
}

function schemaHasUserValueFields(schema: AlbumPageSchema): boolean {
  return (
    (schema.fields?.length ?? 0) > 0 ||
    (schema.customFieldDefs?.length ?? 0) > 0
  );
}

/**
 * Per-photo подписи: caption_photo_page / free_photo_caption / blank layout.perPhotoCaptions
 * / designed (передаётся через templateHasPerPhotoCaptions).
 * Не включать «любой multi-photo + captionEnabled» — иначе FourPhotos (1 подпись) ломается.
 */
export function shouldShowPerPhotoCaptions(
  schema: AlbumPageSchema | undefined,
  templateHasPerPhotoCaptions = false,
): boolean {
  if (!schema) return false;
  // kids date+photo / holidays value+photo / pregnancy weekly — без подписей.
  if (schemaHasUserValueFields(schema) && !isPhotoCollageCaptionPage(schema)) {
    return false;
  }
  if (schema.pageType === 'birthday_free_page') {
    return false;
  }
  if (
    schema.pageType === 'caption_photo_page' ||
    schema.pageType === 'free_photo_caption'
  ) {
    return true;
  }
  if (templateHasPerPhotoCaptions) return true;
  return false;
}

/** Рендер подписей под слотами фото (без line-slots / template textBlocks). */
export function shouldRenderPhotoSlotCaptions(schema: AlbumPageSchema | undefined): boolean {
  if (!schema) return false;
  if (schemaHasUserValueFields(schema) && !isPhotoCollageCaptionPage(schema)) {
    return false;
  }
  if (schema.pageType === 'birthday_free_page') {
    return false;
  }
  return (
    schema.pageType === 'caption_photo_page' ||
    schema.pageType === 'free_photo_caption' ||
    (schema.pageType === 'photo' && schema.captionEnabled === true) ||
    (schema.captionEnabled === true && isPhotoCollageCaptionPage(schema))
  );
}

/**
 * Единый gate для UI и экспорта: смешанные страницы (value-поля + фото) — без подписей;
 * photo-only / blank perPhotoCaptions — подписи оставить.
 */
export function shouldShowAnyPhotoCaption(
  schema: AlbumPageSchema | undefined,
  templateHasPerPhotoCaptions = false,
): boolean {
  if (!schema) return false;
  if (schemaHasUserValueFields(schema) && !isPhotoCollageCaptionPage(schema)) {
    return false;
  }
  if (schema.pageType === 'birthday_free_page') {
    return false;
  }
  if (shouldShowPerPhotoCaptions(schema, templateHasPerPhotoCaptions)) {
    return true;
  }
  return shouldRenderPhotoSlotCaptions(schema);
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
