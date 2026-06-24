import {
  resolveDesignPreviewUri,
  resolveVariantPreviewBackgroundUri,
} from '@/utils/albumImages';

type ResolvePagePreviewBackgroundParams = {
  lineGuideId?: string | null;
  sourcePageNumber?: number | null;
  baseImageUri?: string | null;
  variantId?: string | null;
  /** Empty / first-visit preview — show designer PDF layout with photo examples */
  preferDesignLayout?: boolean;
};

/**
 * Picks preview background. Empty pages can show design/variant examples, but filled pages
 * use the base page PNG so text/photo coordinates stay in the same calibrated system.
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
    if (variantId) {
      const variantUri = resolveVariantPreviewBackgroundUri({
        lineGuideId,
        sourcePageNumber,
        variantId,
      });
      if (variantUri) return variantUri;
    }

    const designUri = resolveDesignPreviewUri({ lineGuideId, sourcePageNumber });
    if (designUri) return designUri;

    return (
      resolveVariantPreviewBackgroundUri({
        lineGuideId,
        sourcePageNumber,
        variantId,
      }) ?? baseImageUri ?? null
    );
  }

  if (baseImageUri) return baseImageUri;

  return variantId
    ? resolveVariantPreviewBackgroundUri({
        lineGuideId,
        sourcePageNumber,
        variantId,
      })
    : null;
}
