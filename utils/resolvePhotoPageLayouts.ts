import type { PhotoPageLayouts } from '@/constants/photo-slots';
import { DEFAULT_PHOTO_PAGE_LAYOUTS, PHOTO_SLOTS } from '@/constants/photo-slots';
import {
  buildPageLayoutsFromTemplates,
  type SafeZone,
} from '@/constants/photo-layout-templates';
import { getTemplatePhotoLayouts } from '@/utils/resolveTemplatePageLayout';
import { getPdfPhotoPageLayouts } from '@/utils/pdfPhotoSlots';
import { getPdfCirclePhotoPageLayouts } from '@/utils/pdfCircleSlots';

const COLLAGE_TEMPLATE_SETS: Record<string, string[]> = {
  one_horizontal: ['one_horizontal', 'two_horizontal', 'four_grid'],
  one_large: ['one_large', 'two_photos', 'four_grid'],
  default: ['one_horizontal', 'two_horizontal', 'four_grid'],
};

/** Weekly + memory photo pages: use calibrated PHOTO_SLOTS, not OCR PDF zones. */
function prefersManualPhotoLayout(lineGuideId: string, page: number): boolean {
  if (lineGuideId === 'pregnancy_60') {
    if (page >= 56 && page <= 59) return true;
    return (
      (page >= 9 && page <= 17) ||
      (page >= 19 && page <= 32) ||
      (page >= 34 && page <= 47)
    );
  }
  if (lineGuideId === 'pregnancy_a5') {
    return (
      (page >= 5 && page <= 13) ||
      (page >= 15 && page <= 28) ||
      (page >= 30 && page <= 43)
    );
  }
  return false;
}

function slotToSafeZone(slot: {
  x: number;
  y: number;
  width: number;
  height: number;
}): SafeZone {
  return {
    x: slot.x,
    y: slot.y - slot.height / 2,
    width: slot.width,
    height: slot.height,
  };
}

/** Добавляет раскладки 2 и 4 фото внутри зоны «Место для фото» из PDF. */
export function expandCollageVariants(layouts: PhotoPageLayouts): PhotoPageLayouts {
  if (layouts.variants.length > 1) return layouts;

  const primaryVariant = layouts.variants[0];
  const primarySlot = primaryVariant?.slots[0];
  if (!primarySlot || primarySlot.height < 0.18 || primarySlot.width < 0.35) {
    return layouts;
  }

  const templateIds =
    COLLAGE_TEMPLATE_SETS[primaryVariant.variantId] ?? COLLAGE_TEMPLATE_SETS.default;
  const expanded = buildPageLayoutsFromTemplates(
    slotToSafeZone(primarySlot),
    templateIds,
  );

  if (expanded.variants.length <= 1) return layouts;
  return expanded;
}

function finalizeLayouts(
  layouts: PhotoPageLayouts | undefined,
  options?: { skipCollageExpand?: boolean },
): PhotoPageLayouts | undefined {
  if (!layouts?.variants?.length) return layouts;
  if (options?.skipCollageExpand) return layouts;
  return expandCollageVariants(layouts);
}

/** Calibrated multi-variant layouts in PHOTO_SLOTS win only without PDF; иначе PDF «Место для фото». */
export function resolvePhotoPageLayouts(
  lineGuideId: string,
  page: number,
  templateLibraryId?: string,
): PhotoPageLayouts {
  const templateLayouts = getTemplatePhotoLayouts(templateLibraryId, lineGuideId);
  if (templateLayouts?.variants?.length) {
    return templateLayouts;
  }

  const circle = getPdfCirclePhotoPageLayouts(lineGuideId, page);
  if (circle?.variants?.length) {
    return circle;
  }

  const manual = PHOTO_SLOTS[lineGuideId]?.[String(page)];
  const pdf = getPdfPhotoPageLayouts(lineGuideId, page);

  if (manual?.variants?.length && prefersManualPhotoLayout(lineGuideId, page)) {
    return manual;
  }
  // Calibrated multi-variant layouts win over PDF zones that overlap text lines.
  if (manual?.variants && manual.variants.length > 1) {
    return manual;
  }
  if (pdf?.variants?.length) {
    return finalizeLayouts(pdf) ?? pdf;
  }
  if (manual?.variants?.length) {
    const skipCollageExpand = lineGuideId === 'holidays_birthday_60';
    return finalizeLayouts(manual, { skipCollageExpand }) ?? manual;
  }
  return DEFAULT_PHOTO_PAGE_LAYOUTS;
}

export function resolvePhotoPageLayoutsOrUndefined(
  lineGuideId: string,
  page: number,
  templateLibraryId?: string,
): PhotoPageLayouts | undefined {
  const templateLayouts = getTemplatePhotoLayouts(templateLibraryId, lineGuideId);
  if (templateLayouts?.variants?.length) {
    return templateLayouts;
  }

  const circle = getPdfCirclePhotoPageLayouts(lineGuideId, page);
  if (circle?.variants?.length) {
    return circle;
  }

  const manual = PHOTO_SLOTS[lineGuideId]?.[String(page)];
  const pdf = getPdfPhotoPageLayouts(lineGuideId, page);

  if (manual?.variants?.length && prefersManualPhotoLayout(lineGuideId, page)) {
    return manual;
  }
  if (manual?.variants && manual.variants.length > 1) {
    return manual;
  }
  if (pdf?.variants?.length) {
    return finalizeLayouts(pdf);
  }
  if (manual?.variants?.length) {
    const skipCollageExpand = lineGuideId === 'holidays_birthday_60';
    return finalizeLayouts(manual, { skipCollageExpand });
  }
  return undefined;
}
