import type { AlbumPageSchema, PageValues } from '@/types/album-page-schema';
import {
  resolveDesignPreviewUri,
  resolvePerPageVariantBackgroundUri,
  resolveVariantPreviewBackgroundUri,
} from '@/utils/albumImages';
import { hasSparsePhotoConfig, usesBlankPagePhotoFallback } from '@/constants/sparse-photo-album-config';
import { hasVariantPreviewManifest } from '@/utils/variantPreview';

type ResolvePageOutputBackgroundParams = {
  lineGuideId?: string | null;
  sourcePageNumber?: number | null;
  variantId?: string | null;
  baseImageUri?: string | null;
  hasPhotoBlocks?: boolean;
};

type ResolvePagePreviewBackgroundParams = {
  lineGuideId?: string | null;
  sourcePageNumber?: number | null;
  baseImageUri?: string | null;
  variantId?: string | null;
  /** @deprecated Empty pages use full baseImageUri; design PNGs are thumbnail-only. */
  preferDesignLayout?: boolean;
  /**
   * full — editor/preview: per-page layout PNG when available, else full PDF raster.
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
 * Чистый фон для финального превью и экспорта.
 * Не откатывается на PDF-растр с рамкой «Место для фото», если есть preview_variants.
 */
export function resolvePageOutputBackgroundUri(
  params: ResolvePageOutputBackgroundParams,
): string | null {
  const { lineGuideId, sourcePageNumber, variantId, baseImageUri, hasPhotoBlocks } = params;
  if (!lineGuideId || !sourcePageNumber || sourcePageNumber < 1) {
    return baseImageUri ?? null;
  }

  if (!hasPhotoBlocks) {
    return baseImageUri ?? null;
  }

  const withVariant = resolvePerPageVariantBackgroundUri({
    lineGuideId,
    sourcePageNumber,
    variantId,
  });
  if (withVariant) return withVariant;

  const anyVariant = resolvePerPageVariantBackgroundUri({
    lineGuideId,
    sourcePageNumber,
    variantId: null,
  });
  if (anyVariant) return anyVariant;

  if (hasVariantPreviewManifest(lineGuideId, sourcePageNumber)) {
    return null;
  }

  return baseImageUri ?? null;
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
  return resolvePageOutputBackgroundUri({
    lineGuideId: params.lineGuideId,
    sourcePageNumber: params.sourcePageNumber,
    variantId: params.variantId,
    baseImageUri: params.fallbackUri,
    hasPhotoBlocks: true,
  });
}

/**
 * Picks preview background.
 * - thumbnail: bundled design_previews (надёжно офлайн), затем full page PNG.
 * - full + preferCleanPhotoBackground: per-page variant PNG без рамки фото.
 * - full: per-page variant PNG for sparse photo pages, else full PDF raster, then design_previews.
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
    const outputUri = resolvePageOutputBackgroundUri({
      lineGuideId,
      sourcePageNumber,
      variantId,
      baseImageUri,
      hasPhotoBlocks: true,
    });
    if (outputUri) return outputUri;
    if (!hasVariantPreviewManifest(lineGuideId, sourcePageNumber)) {
      return baseImageUri ?? null;
    }
    return null;
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

  if (
    hasSparsePhotoConfig(lineGuideId) &&
    !usesBlankPagePhotoFallback(lineGuideId) &&
    hasVariantPreviewManifest(lineGuideId, sourcePageNumber)
  ) {
    const layoutUri = resolvePerPageVariantBackgroundUri({
      lineGuideId,
      sourcePageNumber,
      variantId,
    });
    if (layoutUri) return layoutUri;
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
