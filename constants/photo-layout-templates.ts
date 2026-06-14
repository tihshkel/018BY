/**
 * Reusable photo collage layouts normalized to a safe zone (0–1).
 * x, y = top-left corner of slot; width, height = slot size.
 * Transformed to page coordinates via buildPageLayouts().
 */

export type TemplatePhotoSlot = {
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio?: [number, number];
};

export type PhotoLayoutTemplate = {
  variantId: string;
  slots: TemplatePhotoSlot[];
};

const GAP = 0.03;
const MARGIN_X = 0.02;

function slot(
  x: number,
  y: number,
  width: number,
  height: number,
  aspectRatio?: [number, number],
): TemplatePhotoSlot {
  return { x, y, width, height, aspectRatio };
}

/** 1 hero photo centered in safe zone */
export const TEMPLATE_ONE_LARGE: PhotoLayoutTemplate = {
  variantId: 'one_large',
  slots: [slot(MARGIN_X, 0.08, 1 - MARGIN_X * 2, 0.84, [4, 3])],
};

/** Alias for event pages */
export const TEMPLATE_ONE_HORIZONTAL: PhotoLayoutTemplate = {
  variantId: 'one_horizontal',
  slots: [slot(MARGIN_X, 0.1, 1 - MARGIN_X * 2, 0.8, [4, 3])],
};

/** 2 horizontal strips stacked */
export const TEMPLATE_TWO_STACKED: PhotoLayoutTemplate = {
  variantId: 'two_stacked',
  slots: [
    slot(MARGIN_X, 0.04, 1 - MARGIN_X * 2, 0.44, [4, 3]),
    slot(MARGIN_X, 0.52, 1 - MARGIN_X * 2, 0.44, [4, 3]),
  ],
};

/** Pregnancy alias */
export const TEMPLATE_TWO_PHOTOS: PhotoLayoutTemplate = {
  variantId: 'two_photos',
  slots: TEMPLATE_TWO_STACKED.slots,
};

/** 2 horizontal strips with gap (event TZ) */
export const TEMPLATE_TWO_HORIZONTAL: PhotoLayoutTemplate = {
  variantId: 'two_horizontal',
  slots: [
    slot(MARGIN_X, 0.06, 1 - MARGIN_X * 2, 0.42, [4, 3]),
    slot(MARGIN_X, 0.52, 1 - MARGIN_X * 2, 0.42, [4, 3]),
  ],
};

/** 2 vertical columns */
export const TEMPLATE_TWO_VERTICAL: PhotoLayoutTemplate = {
  variantId: 'two_vertical',
  slots: [
    slot(0.02, 0.08, 0.46, 0.84, [3, 4]),
    slot(0.52, 0.08, 0.46, 0.84, [3, 4]),
  ],
};

/** 1 large top + 2 small bottom (magazine collage) */
export const TEMPLATE_THREE_HERO: PhotoLayoutTemplate = {
  variantId: 'three_hero',
  slots: [
    slot(MARGIN_X, 0.02, 1 - MARGIN_X * 2, 0.52, [4, 3]),
    slot(MARGIN_X, 0.58, 0.46, 0.38, [3, 4]),
    slot(0.52, 0.58, 0.46, 0.38, [3, 4]),
  ],
};

/** 3 equal horizontal strips */
export const TEMPLATE_THREE_EQUAL: PhotoLayoutTemplate = {
  variantId: 'three_equal',
  slots: [
    slot(MARGIN_X, 0.02, 1 - MARGIN_X * 2, 0.28, [4, 3]),
    slot(MARGIN_X, 0.34, 1 - MARGIN_X * 2, 0.28, [4, 3]),
    slot(MARGIN_X, 0.66, 1 - MARGIN_X * 2, 0.28, [4, 3]),
  ],
};

/** 2×2 symmetric grid */
export const TEMPLATE_FOUR_GRID: PhotoLayoutTemplate = {
  variantId: 'four_grid',
  slots: [
    slot(0.02, 0.02, 0.46, 0.46, [1, 1]),
    slot(0.52, 0.02, 0.46, 0.46, [1, 1]),
    slot(0.02, 0.52, 0.46, 0.46, [1, 1]),
    slot(0.52, 0.52, 0.46, 0.46, [1, 1]),
  ],
};

/** 2×2 vertical-oriented cells (kids TZ) */
export const TEMPLATE_FOUR_VERTICAL: PhotoLayoutTemplate = {
  variantId: 'four_vertical',
  slots: [
    slot(0.02, 0.02, 0.46, 0.46, [3, 4]),
    slot(0.52, 0.02, 0.46, 0.46, [3, 4]),
    slot(0.02, 0.52, 0.46, 0.46, [3, 4]),
    slot(0.52, 0.52, 0.46, 0.46, [3, 4]),
  ],
};

/** Structured page: single horizontal strip at top */
export const TEMPLATE_STRUCTURED_ONE: PhotoLayoutTemplate = {
  variantId: 'one_horizontal',
  slots: [slot(0.05, 0.1, 0.9, 0.8, [4, 3])],
};

/** Structured page: two vertical side by side */
export const TEMPLATE_STRUCTURED_TWO_VERTICAL: PhotoLayoutTemplate = {
  variantId: 'two_vertical',
  slots: [
    slot(0.05, 0.1, 0.42, 0.8, [3, 4]),
    slot(0.53, 0.1, 0.42, 0.8, [3, 4]),
  ],
};

export const PHOTO_LAYOUT_TEMPLATES: Record<string, PhotoLayoutTemplate> = {
  one_large: TEMPLATE_ONE_LARGE,
  one_horizontal: TEMPLATE_ONE_HORIZONTAL,
  two_stacked: TEMPLATE_TWO_STACKED,
  two_photos: TEMPLATE_TWO_PHOTOS,
  two_horizontal: TEMPLATE_TWO_HORIZONTAL,
  two_vertical: TEMPLATE_TWO_VERTICAL,
  three_hero: TEMPLATE_THREE_HERO,
  three_equal: TEMPLATE_THREE_EQUAL,
  four_grid: TEMPLATE_FOUR_GRID,
  four_vertical: TEMPLATE_FOUR_VERTICAL,
};

export type SafeZone = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Map template slots (safe-zone relative) to absolute page-normalized coords (y = center). */
export function buildVariantLayoutFromTemplate(
  template: PhotoLayoutTemplate,
  safeZone: SafeZone,
): { variantId: string; slots: Array<{
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio?: [number, number];
}> } {
  const slots = template.slots.map((s) => {
    const absX = safeZone.x + s.x * safeZone.width;
    const absW = s.width * safeZone.width;
    const absH = s.height * safeZone.height;
    const topY = safeZone.y + s.y * safeZone.height;
    const centerY = topY + absH / 2;
    return {
      x: absX,
      y: centerY,
      width: absW,
      height: absH,
      aspectRatio: s.aspectRatio,
    };
  });

  return { variantId: template.variantId, slots };
}

export function buildPageLayoutsFromTemplates(
  safeZone: SafeZone,
  templateIds: string[],
): { variants: ReturnType<typeof buildVariantLayoutFromTemplate>[] } {
  const variants = templateIds
    .map((id) => PHOTO_LAYOUT_TEMPLATES[id])
    .filter(Boolean)
    .map((t) => buildVariantLayoutFromTemplate(t, safeZone));
  return { variants };
}
