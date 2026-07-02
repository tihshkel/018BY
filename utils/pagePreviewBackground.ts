import {
  resolveDesignPreviewUri,
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
};

/** Global layout chip PNGs (one_large.png etc.) are UI thumbnails, not page backgrounds. */
function usesGlobalLayoutChipPreviews(lineGuideId: string): boolean {
  return hasSparsePhotoConfig(lineGuideId) && !usesBlankPagePhotoFallback(lineGuideId);
}

/**
 * Picks preview background. In-app always uses full PDF page PNG when available.
 * Low-res design_previews (~½ size) are only for thumbnail chips, not editor preview.
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
  } = params;

  if (!lineGuideId || !sourcePageNumber || sourcePageNumber < 1) {
    return baseImageUri ?? null;
  }

  if (baseImageUri) return baseImageUri;

  if (quality !== 'thumbnail') {
    return null;
  }

  const designUri = resolveDesignPreviewUri({ lineGuideId, sourcePageNumber });
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
