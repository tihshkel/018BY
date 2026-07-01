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
  /** Empty / first-visit preview — show designer PDF layout with photo examples */
  preferDesignLayout?: boolean;
};

/** Global layout chip PNGs (one_large.png etc.) are UI thumbnails, not page backgrounds. */
function usesGlobalLayoutChipPreviews(lineGuideId: string): boolean {
  return hasSparsePhotoConfig(lineGuideId) && !usesBlankPagePhotoFallback(lineGuideId);
}

/**
 * Picks preview background. Empty pages show the plain PDF page template (baseImageUri).
 * Legacy albums may fall back to full-page design/variant PNGs — never layout chip icons.
 */
export function resolvePagePreviewBackgroundUri(
  params: ResolvePagePreviewBackgroundParams,
): string | null {
  const {
    lineGuideId,
    sourcePageNumber,
    baseImageUri,
    variantId,
    preferDesignLayout = false,
  } = params;

  if (!lineGuideId || !sourcePageNumber || sourcePageNumber < 1) {
    return baseImageUri ?? null;
  }

  if (preferDesignLayout) {
    if (baseImageUri) return baseImageUri;

    const designUri = resolveDesignPreviewUri({ lineGuideId, sourcePageNumber });
    if (designUri) return designUri;

    if (variantId && !usesGlobalLayoutChipPreviews(lineGuideId)) {
      const variantUri = resolveVariantPreviewBackgroundUri({
        lineGuideId,
        sourcePageNumber,
        variantId,
      });
      if (variantUri) return variantUri;
    }

    return null;
  }

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
