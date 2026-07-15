/**
 * Reusable photo collage layouts normalized to a safe zone (0–1).
 * x, y = top-left corner of slot; width, height = slot size.
 * Transformed to page coordinates via buildPageLayouts().
 *
 * All multi-photo templates share one 2-column grid (same margins, column width, gaps).
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

const GAP = 0.016;
const MARGIN_X = 0.01;
const MARGIN_Y = 0.02;

const FULL_WIDTH = 1 - MARGIN_X * 2;
const COL_WIDTH = (FULL_WIDTH - GAP) / 2;
const COL_X_LEFT = MARGIN_X;
const COL_X_RIGHT = MARGIN_X + COL_WIDTH + GAP;

const STACK_ROW_HEIGHT = (1 - MARGIN_Y * 2 - GAP) / 2;
const GRID_ROW_HEIGHT = (1 - MARGIN_Y * 2 - GAP) / 2;
const THREE_EQUAL_ROW_HEIGHT = (1 - MARGIN_Y * 2 - GAP * 2) / 3;

function slot(
  x: number,
  y: number,
  width: number,
  height: number,
  aspectRatio?: [number, number],
): TemplatePhotoSlot {
  return { x, y, width, height, aspectRatio };
}

function rowY(rowIndex: number, rowHeight: number): number {
  return MARGIN_Y + rowIndex * (rowHeight + GAP);
}

/** Shared grid metrics for collage templates (safe-zone relative). */
export const COLLAGE_GRID = {
  gap: GAP,
  marginX: MARGIN_X,
  marginY: MARGIN_Y,
  fullWidth: FULL_WIDTH,
  colWidth: COL_WIDTH,
  colXLeft: COL_X_LEFT,
  colXRight: COL_X_RIGHT,
};

/**
 * 1 hero photo: почти вся safe zone (~80–90% страницы после aspect-fit),
 * снизу небольшой запас под caption.
 */
export const TEMPLATE_ONE_LARGE: PhotoLayoutTemplate = {
  variantId: 'one_large',
  slots: [slot(MARGIN_X, 0.01, FULL_WIDTH, 0.94, [4, 3])],
};

/** Alias for event pages — tall 4:3 band (not ultra-narrow strip) */
export const TEMPLATE_ONE_HORIZONTAL: PhotoLayoutTemplate = {
  variantId: 'one_horizontal',
  slots: [slot(MARGIN_X, 0.01, FULL_WIDTH, 0.94, [4, 3])],
};

/** 2 horizontal strips stacked */
export const TEMPLATE_TWO_STACKED: PhotoLayoutTemplate = {
  variantId: 'two_stacked',
  slots: [
    slot(MARGIN_X, rowY(0, STACK_ROW_HEIGHT), FULL_WIDTH, STACK_ROW_HEIGHT, [4, 3]),
    slot(MARGIN_X, rowY(1, STACK_ROW_HEIGHT), FULL_WIDTH, STACK_ROW_HEIGHT, [4, 3]),
  ],
};

/** Pregnancy alias */
export const TEMPLATE_TWO_PHOTOS: PhotoLayoutTemplate = {
  variantId: 'two_photos',
  slots: TEMPLATE_TWO_STACKED.slots,
};

/** 2 horizontal strips stacked (event TZ) */
export const TEMPLATE_TWO_HORIZONTAL: PhotoLayoutTemplate = {
  variantId: 'two_horizontal',
  slots: TEMPLATE_TWO_STACKED.slots,
};

/** Kids event pages: tall stacked pair (~4:3 per cell) */
export const TEMPLATE_KIDS_TWO_STACKED: PhotoLayoutTemplate = {
  variantId: 'kids_two_stacked',
  slots: [
    slot(MARGIN_X, rowY(0, STACK_ROW_HEIGHT), FULL_WIDTH, STACK_ROW_HEIGHT, [4, 3]),
    slot(MARGIN_X, rowY(1, STACK_ROW_HEIGHT), FULL_WIDTH, STACK_ROW_HEIGHT, [4, 3]),
  ],
};

/** 2 vertical columns on shared grid */
export const TEMPLATE_TWO_VERTICAL: PhotoLayoutTemplate = {
  variantId: 'two_vertical',
  slots: [
    slot(COL_X_LEFT, MARGIN_Y, COL_WIDTH, 1 - MARGIN_Y * 2, [3, 4]),
    slot(COL_X_RIGHT, MARGIN_Y, COL_WIDTH, 1 - MARGIN_Y * 2, [3, 4]),
  ],
};

/** Full-width top row + 2 square cells on bottom grid row (1:1), внутри safe zone */
function buildThreeHeroSlots(safeZone: SafeZone): TemplatePhotoSlot[] {
  const idealSquareH = (COL_WIDTH * safeZone.width) / safeZone.height;
  const stackHeight = 1 - MARGIN_Y * 2;
  const topBandOffset = 0.025;
  const minTopH = 0.42;

  let bottomH = Math.min(idealSquareH, stackHeight - GAP - minTopH - topBandOffset);
  let topH = stackHeight - GAP - bottomH - topBandOffset;

  if (topH < minTopH) {
    topH = minTopH;
    bottomH = Math.min(idealSquareH, stackHeight - GAP - topH - topBandOffset);
  }

  bottomH = Math.min(bottomH, 1 - MARGIN_Y - (MARGIN_Y + topBandOffset + topH + GAP));
  topH = Math.max(minTopH, stackHeight - GAP - bottomH - topBandOffset);

  const topY = MARGIN_Y + topBandOffset;
  const bottomY = topY + topH + GAP;
  const colW =
    bottomH >= idealSquareH - 0.001
      ? COL_WIDTH
      : (bottomH * safeZone.height) / safeZone.width;
  const pairWidth = colW * 2 + GAP;
  const colLeft = MARGIN_X + Math.max(0, (FULL_WIDTH - pairWidth) / 2);

  return [
    slot(colLeft, topY, pairWidth, topH, [4, 3]),
    slot(colLeft, bottomY, colW, bottomH, [1, 1]),
    slot(colLeft + colW + GAP, bottomY, colW, bottomH, [1, 1]),
  ];
}

/** Static fallback for grid previews (EVENT safe zone proportions). */
export const TEMPLATE_THREE_HERO: PhotoLayoutTemplate = {
  variantId: 'three_hero',
  slots: buildThreeHeroSlots({ x: 0, y: 0, width: 0.84, height: 0.6 }),
};

/** 3 equal horizontal bands on full-width columns */
export const TEMPLATE_THREE_EQUAL: PhotoLayoutTemplate = {
  variantId: 'three_equal',
  slots: [
    slot(MARGIN_X, rowY(0, THREE_EQUAL_ROW_HEIGHT), FULL_WIDTH, THREE_EQUAL_ROW_HEIGHT, [4, 3]),
    slot(MARGIN_X, rowY(1, THREE_EQUAL_ROW_HEIGHT), FULL_WIDTH, THREE_EQUAL_ROW_HEIGHT, [4, 3]),
    slot(MARGIN_X, rowY(2, THREE_EQUAL_ROW_HEIGHT), FULL_WIDTH, THREE_EQUAL_ROW_HEIGHT, [4, 3]),
  ],
};

/** 2×2 grid — 4:3 cells */
export const TEMPLATE_FOUR_GRID: PhotoLayoutTemplate = {
  variantId: 'four_grid',
  slots: [
    slot(COL_X_LEFT, rowY(0, GRID_ROW_HEIGHT), COL_WIDTH, GRID_ROW_HEIGHT, [4, 3]),
    slot(COL_X_RIGHT, rowY(0, GRID_ROW_HEIGHT), COL_WIDTH, GRID_ROW_HEIGHT, [4, 3]),
    slot(COL_X_LEFT, rowY(1, GRID_ROW_HEIGHT), COL_WIDTH, GRID_ROW_HEIGHT, [4, 3]),
    slot(COL_X_RIGHT, rowY(1, GRID_ROW_HEIGHT), COL_WIDTH, GRID_ROW_HEIGHT, [4, 3]),
  ],
};

/** 2×2 — portrait-friendly cells on same grid */
export const TEMPLATE_FOUR_VERTICAL: PhotoLayoutTemplate = {
  variantId: 'four_vertical',
  slots: [
    slot(COL_X_LEFT, rowY(0, GRID_ROW_HEIGHT), COL_WIDTH, GRID_ROW_HEIGHT, [3, 4]),
    slot(COL_X_RIGHT, rowY(0, GRID_ROW_HEIGHT), COL_WIDTH, GRID_ROW_HEIGHT, [3, 4]),
    slot(COL_X_LEFT, rowY(1, GRID_ROW_HEIGHT), COL_WIDTH, GRID_ROW_HEIGHT, [3, 4]),
    slot(COL_X_RIGHT, rowY(1, GRID_ROW_HEIGHT), COL_WIDTH, GRID_ROW_HEIGHT, [3, 4]),
  ],
};

/** Structured page: single horizontal strip at top */
export const TEMPLATE_STRUCTURED_ONE: PhotoLayoutTemplate = {
  variantId: 'one_horizontal',
  slots: [slot(0.04, 0.06, 0.92, 0.86, [4, 3])],
};

/** Structured page: two vertical side by side */
export const TEMPLATE_STRUCTURED_TWO_VERTICAL: PhotoLayoutTemplate = {
  variantId: 'two_vertical',
  slots: [
    slot(0.03, 0.06, 0.45, 0.86, [3, 4]),
    slot(0.52, 0.06, 0.45, 0.86, [3, 4]),
  ],
};

export const PHOTO_LAYOUT_TEMPLATES: Record<string, PhotoLayoutTemplate> = {
  one_large: TEMPLATE_ONE_LARGE,
  one_horizontal: TEMPLATE_ONE_HORIZONTAL,
  two_stacked: TEMPLATE_TWO_STACKED,
  two_photos: TEMPLATE_TWO_PHOTOS,
  two_horizontal: TEMPLATE_TWO_HORIZONTAL,
  kids_two_stacked: TEMPLATE_KIDS_TWO_STACKED,
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

import { fitNormalizedSlotToAspect } from '@/utils/photoSlotAspect';

/** Map template slots (safe-zone relative) to absolute page-normalized coords (y = center). */
export function buildVariantLayoutFromTemplate(
  template: PhotoLayoutTemplate,
  safeZone: SafeZone,
  pageAspect = 1,
): { variantId: string; slots: Array<{
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio?: [number, number];
}> } {
  const templateSlots =
    template.variantId === 'three_hero' ? buildThreeHeroSlots(safeZone) : template.slots;

  const slots = templateSlots.map((s) => {
    const cellW = s.width * safeZone.width;
    const cellH = s.height * safeZone.height;
    const { width: absW, height: absH } = fitNormalizedSlotToAspect(
      cellW,
      cellH,
      pageAspect,
      s.aspectRatio,
    );
    const topY = safeZone.y + s.y * safeZone.height;
    const centerY = topY + (cellH - absH) / 2 + absH / 2;
    const colOffsetX = (cellW - absW) / 2;
    return {
      x: safeZone.x + s.x * safeZone.width + colOffsetX,
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
  pageAspect = 1,
): { variants: ReturnType<typeof buildVariantLayoutFromTemplate>[] } {
  const variants = templateIds
    .map((id) => PHOTO_LAYOUT_TEMPLATES[id])
    .filter(Boolean)
    .map((t) => buildVariantLayoutFromTemplate(t, safeZone, pageAspect));
  return { variants };
}

/** Unified collage templates for all designed albums. */
export const STANDARD_DESIGNED_ALBUM_TEMPLATE_IDS = [
  'one_large',
  'two_vertical',
  'three_hero',
  'four_grid',
] as const;
