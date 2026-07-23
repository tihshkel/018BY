import type { PhotoPageLayouts } from '@/constants/photo-slots';
import {
  DEFAULT_PHOTO_PAGE_LAYOUTS,
  PHOTO_SLOTS,
} from '@/constants/photo-slots';
import { buildPageLayoutsFromTemplates } from '@/constants/photo-layout-templates';
import {
  hasSparsePhotoConfig,
  isPregnancyWeeklyMiddlePage,
  prefersManualPhotoLayout,
  prefersPdfPinnedPhotoLayout,
  shouldSkipSparsePhotoExpansion,
  usesBlankPagePhotoFallback,
  getSparsePhotoAlbumConfig,
} from '@/constants/sparse-photo-album-config';
import {
  buildStandardDesignedAlbumLayouts,
  expandCollageVariantsWithSparse,
  expandDesignedAlbumCollageVariants,
  expandManualSparseLayouts,
  resolveKidsPhotoPageLayouts,
  shouldExpandSparseBandLayouts,
  slotToSafeZone,
} from '@/utils/sparseTextPhotoSafeZone';
import { getTemplatePhotoLayouts } from '@/utils/resolveTemplatePageLayout';
import { getPdfPhotoPageLayouts } from '@/utils/pdfPhotoSlots';
import { clampPhotoPageLayoutsToPrintMargins } from '@/constants/photo-print-margins';
import { getPdfCirclePhotoPageLayouts } from '@/utils/pdfCircleSlots';
import { filterFeasiblePhotoLayouts } from '@/utils/photoLayoutFeasibility';

function manualLayoutsArePlausible(manual: PhotoPageLayouts): boolean {
  const primarySlot = manual.variants[0]?.slots[0];
  if (!primarySlot) return false;
  return primarySlot.height >= 0.18 && primarySlot.width >= 0.35;
}

/** Добавляет раскладки 2 и 4 фото внутри зоны «Место для фото» из PDF. */
export function expandCollageVariants(
  layouts: PhotoPageLayouts,
  lineGuideId?: string,
  page?: number,
): PhotoPageLayouts {
  if (lineGuideId !== undefined && page !== undefined && hasSparsePhotoConfig(lineGuideId)) {
    return expandCollageVariantsWithSparse(layouts, lineGuideId, page);
  }

  if (layouts.variants.length > 1) return layouts;

  const primaryVariant = layouts.variants[0];
  const primarySlot = primaryVariant?.slots[0];
  if (!primarySlot || primarySlot.height < 0.18 || primarySlot.width < 0.35) {
    return layouts;
  }

  const COLLAGE_TEMPLATE_SETS: Record<string, string[]> = {
    one_horizontal: ['one_large', 'two_vertical', 'four_grid'],
    one_large: ['one_large', 'two_vertical', 'four_grid'],
    default: ['one_large', 'two_vertical', 'four_grid'],
  };

  const templateIds =
    COLLAGE_TEMPLATE_SETS[primaryVariant.variantId] ?? COLLAGE_TEMPLATE_SETS.default;
  const expanded = buildPageLayoutsFromTemplates(slotToSafeZone(primarySlot), templateIds);

  if (expanded.variants.length <= 1) return layouts;
  return expanded;
}

function finalizeLayouts(
  layouts: PhotoPageLayouts | undefined,
  lineGuideId: string,
  page: number,
): PhotoPageLayouts | undefined {
  if (!layouts?.variants?.length) return layouts;
  const expanded = expandCollageVariants(layouts, lineGuideId, page);
  const feasible = filterFeasiblePhotoLayouts(expanded);
  if (!feasible.variants.length) return { variants: [] };
  return clampPhotoPageLayoutsToPrintMargins(feasible, lineGuideId);
}

function resolveDesignedAlbumLayouts(
  lineGuideId: string,
  page: number,
  pdf: PhotoPageLayouts | undefined,
  manual: PhotoPageLayouts | undefined,
): PhotoPageLayouts | undefined {
  if (lineGuideId === 'kids_48') {
    const kids = resolveKidsPhotoPageLayouts(page, pdf);
    return kids ? finalizeLayouts(kids, lineGuideId, page) : undefined;
  }

  if (!hasSparsePhotoConfig(lineGuideId) || usesBlankPagePhotoFallback(lineGuideId)) {
    return undefined;
  }

  if (pdf?.variants?.length && prefersPdfPinnedPhotoLayout(lineGuideId, page)) {
    if (!isPregnancyWeeklyMiddlePage(lineGuideId, page)) {
      const primarySlot = pdf.variants[0]?.slots[0];
      // bottom/upper band (+ mixed с нижней PDF-рамкой): expand в пустоту, не pin.
      if (shouldExpandSparseBandLayouts(lineGuideId, page, primarySlot)) {
        const expanded = expandDesignedAlbumCollageVariants(lineGuideId, page, pdf);
        if (expanded) return finalizeLayouts(expanded, lineGuideId, page);
      }
      const standard = buildStandardDesignedAlbumLayouts(pdf);
      if (standard) return finalizeLayouts(standard, lineGuideId, page);
      return finalizeLayouts(pdf, lineGuideId, page);
    }
  }

  if (pdf?.variants?.length) {
    const expanded = expandDesignedAlbumCollageVariants(lineGuideId, page, pdf);
    if (expanded) return finalizeLayouts(expanded, lineGuideId, page);
  }

  if (manual?.variants?.length) {
    const primarySlot = manual.variants[0]?.slots[0];
    if (shouldExpandSparseBandLayouts(lineGuideId, page, primarySlot)) {
      const expanded = expandDesignedAlbumCollageVariants(lineGuideId, page, manual);
      if (expanded) return finalizeLayouts(expanded, lineGuideId, page);
    }
    const expanded = expandManualSparseLayouts(lineGuideId, page, manual);
    if (expanded) return finalizeLayouts(expanded, lineGuideId, page);
  }

  // Birthday / diary: нет PDF-пина — primary из eventSafe, зона режется по line-slots.
  if (!shouldSkipSparsePhotoExpansion(lineGuideId, page)) {
    const eventSafe = getSparsePhotoAlbumConfig(lineGuideId)?.eventSafe;
    if (eventSafe) {
      const syntheticPrimary: PhotoPageLayouts = {
        variants: [
          {
            variantId: 'one_large',
            slots: [
              {
                x: eventSafe.x,
                y: eventSafe.y + eventSafe.height / 2,
                width: eventSafe.width,
                height: Math.max(0.2, eventSafe.height * 0.85),
              },
            ],
          },
        ],
      };
      const expanded = expandManualSparseLayouts(lineGuideId, page, syntheticPrimary);
      if (expanded) return finalizeLayouts(expanded, lineGuideId, page);
    }
  }

  return undefined;
}

/** Calibrated multi-variant layouts in PHOTO_SLOTS win only without PDF; иначе PDF «Место для фото». */
export function resolvePhotoPageLayouts(
  lineGuideId: string,
  page: number,
  templateLibraryId?: string,
): PhotoPageLayouts {
  const templateLayouts = getTemplatePhotoLayouts(templateLibraryId, lineGuideId, page);
  if (templateLayouts?.variants?.length) {
    return clampPhotoPageLayoutsToPrintMargins(templateLayouts, lineGuideId);
  }

  const circle = getPdfCirclePhotoPageLayouts(lineGuideId, page);
  if (circle?.variants?.length) {
    return clampPhotoPageLayoutsToPrintMargins(circle, lineGuideId);
  }

  const manual = PHOTO_SLOTS[lineGuideId]?.[String(page)];
  const pdf = getPdfPhotoPageLayouts(lineGuideId, page);

  const designed = resolveDesignedAlbumLayouts(lineGuideId, page, pdf, manual);
  if (designed) return designed;

  if (manual?.variants?.length && prefersManualPhotoLayout(lineGuideId, page)) {
    return clampPhotoPageLayoutsToPrintMargins(manual, lineGuideId);
  }
  if (manual?.variants && manual.variants.length > 1 && manualLayoutsArePlausible(manual)) {
    return clampPhotoPageLayoutsToPrintMargins(manual, lineGuideId);
  }
  if (pdf?.variants?.length) {
    return finalizeLayouts(pdf, lineGuideId, page) ?? pdf;
  }
  if (manual?.variants?.length) {
    return finalizeLayouts(manual, lineGuideId, page) ?? manual;
  }
  if (shouldSkipSparsePhotoExpansion(lineGuideId, page)) {
    return { variants: [] };
  }
  if (!usesBlankPagePhotoFallback(lineGuideId)) {
    return { variants: [] };
  }
  return clampPhotoPageLayoutsToPrintMargins(
    expandCollageVariants(DEFAULT_PHOTO_PAGE_LAYOUTS, lineGuideId, page),
    lineGuideId,
  );
}

export function resolvePhotoPageLayoutsOrUndefined(
  lineGuideId: string,
  page: number,
  templateLibraryId?: string,
): PhotoPageLayouts | undefined {
  const templateLayouts = getTemplatePhotoLayouts(templateLibraryId, lineGuideId, page);
  if (templateLayouts?.variants?.length) {
    return clampPhotoPageLayoutsToPrintMargins(templateLayouts, lineGuideId);
  }

  const circle = getPdfCirclePhotoPageLayouts(lineGuideId, page);
  if (circle?.variants?.length) {
    return clampPhotoPageLayoutsToPrintMargins(circle, lineGuideId);
  }

  const manual = PHOTO_SLOTS[lineGuideId]?.[String(page)];
  const pdf = getPdfPhotoPageLayouts(lineGuideId, page);

  const designed = resolveDesignedAlbumLayouts(lineGuideId, page, pdf, manual);
  if (designed) return designed;

  if (manual?.variants?.length && prefersManualPhotoLayout(lineGuideId, page)) {
    return clampPhotoPageLayoutsToPrintMargins(manual, lineGuideId);
  }
  if (manual?.variants && manual.variants.length > 1 && manualLayoutsArePlausible(manual)) {
    return clampPhotoPageLayoutsToPrintMargins(manual, lineGuideId);
  }
  if (pdf?.variants?.length) {
    return finalizeLayouts(pdf, lineGuideId, page);
  }
  if (manual?.variants?.length) {
    return finalizeLayouts(manual, lineGuideId, page);
  }
  return undefined;
}
