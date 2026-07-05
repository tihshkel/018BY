import type { AlbumPageSchema, PageValues } from '@/types/album-page-schema';
import {
  resolveDesignPreviewUri,
  resolvePerPageVariantBackgroundUri,
  resolveVariantPreviewBackgroundUri,
} from '@/utils/albumImages';
import { hasSparsePhotoConfig, usesBlankPagePhotoFallback } from '@/constants/sparse-photo-album-config';

type ResolvePagePreviewBackgroundParams = {
  lineGuideId?: string | null;
  sourcePageNumber?: number | null;
  baseImageUri?: string | null;
  variantId?: string | null;
  /** @deprecated Empty pages use full baseImageUri; design PNGs are thumbnail-only. */
  preferDesignLayout?: boolean;
  /**
   * full — editor/preview: only full PDF page raster (page_XXX.png).
   * thumbnail — page list chips: may use lighter design_previews.
   */
  quality?: 'full' | 'thumbnail';
  /**
   * Финальный предпросмотр/экспорт: per-page variant PNG без «Место для фото».
   */
  preferCleanPhotoBackground?: boolean;
};

/** Global layout chip PNGs (one_large.png etc.) are UI thumbnails, not page backgrounds. */
function usesGlobalLayoutChipPreviews(lineGuideId: string): boolean {
  return hasSparsePhotoConfig(lineGuideId) && !usesBlankPagePhotoFallback(lineGuideId);
}

export function resolvePrimaryPhotoVariantId(
  values: PageValues | undefined,
  schema: AlbumPageSchema | undefined,
): string | null {
  const block = schema?.photoBlocks?.[0];
  if (!block) return null;
  const blockValues = values?.photoBlocks?.[block.blockId];
  return blockValues?.variantId ?? block.variants[0]?.variantId ?? null;
}

/**
 * Чистый фон страницы с фото: per-page variant PNG (второй лист PDF без рамки).
 */
export function resolvePhotoPageCleanBackgroundUri(params: {
  lineGuideId?: string | null;
  sourcePageNumber?: number | null;
  variantId?: string | null;
  fallbackUri?: string | null;
}): string | null {
  const { lineGuideId, sourcePageNumber, variantId, fallbackUri } = params;
  if (!lineGuideId || !sourcePageNumber || sourcePageNumber < 1) {
    return fallbackUri ?? null;
  }

  const variantUri = resolvePerPageVariantBackgroundUri({
    lineGuideId,
    sourcePageNumber,
    variantId,
  });
  if (variantUri) return variantUri;

  return fallbackUri ?? null;
}

/**
 * Picks preview background.
 * - thumbnail: bundled design_previews (надёжно офлайн), затем full page PNG.
 * - full + preferCleanPhotoBackground: per-page variant PNG без рамки фото.
 * - full: full PDF page raster, при отсутствии — design_previews.
 */
export function resolvePagePreviewBackgroundUri(
  params: ResolvePagePreviewBackgroundParams,
): string | null {
  const {
    lineGuideId,
    sourcePageNumber,
    baseImageUri,
    variantId,
    quality = 'full',
    preferCleanPhotoBackground = false,
  } = params;

  if (!lineGuideId || !sourcePageNumber || sourcePageNumber < 1) {
    return baseImageUri ?? null;
  }

  if (preferCleanPhotoBackground) {
    return (
      resolvePhotoPageCleanBackgroundUri({
        lineGuideId,
        sourcePageNumber,
        variantId,
        fallbackUri: baseImageUri,
      }) ?? baseImageUri
    );
  }

  const designUri = resolveDesignPreviewUri({ lineGuideId, sourcePageNumber });

  if (quality === 'thumbnail') {
    if (designUri) return designUri;
    if (baseImageUri) return baseImageUri;
    if (variantId && !usesGlobalLayoutChipPreviews(lineGuideId)) {
      return resolveVariantPreviewBackgroundUri({
        lineGuideId,
        sourcePageNumber,
        variantId,
      });
    }
    return null;
  }

  if (baseImageUri) return baseImageUri;
  if (designUri) return designUri;

  if (variantId && !usesGlobalLayoutChipPreviews(lineGuideId)) {
    return resolveVariantPreviewBackgroundUri({
      lineGuideId,
      sourcePageNumber,
      variantId,
    });
  }

  return null;
}
