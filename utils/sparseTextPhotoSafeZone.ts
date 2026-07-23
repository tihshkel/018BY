import { LINE_SLOTS, type NormalizedLineSlot } from '@/constants/line-slots';
import type { PhotoPageLayouts } from '@/constants/photo-slots';
import {
  EVENT_PHOTO_TEMPLATES,
  eventPhotoLayouts,
} from '@/constants/photo-slots';
import {
  buildPageLayoutsFromTemplates,
  isKidsSideBySideEventPage,
  KIDS_LANDSCAPE_EVENT_TEMPLATE_IDS,
  KIDS_SIDE_BY_SIDE_EVENT_TEMPLATE_IDS,
  STANDARD_DESIGNED_ALBUM_TEMPLATE_IDS,
  type SafeZone,
} from '@/constants/photo-layout-templates';
import {
  BLANK_PAGE_PHOTO_SAFE,
  classifyPhotoSafeZoneStrategy,
  EVENT_PHOTO_SAFE,
  getSparsePhotoAlbumConfig,
  hasSparsePhotoConfig,
  isBirthdayCaptionPhotoPage,
  isPregnancyUpperBandPage,
  isPregnancyWeeklyMiddlePage,
  shouldSkipSparsePhotoExpansion,
  usesBlankPagePhotoFallback,
  type AlbumSparsePhotoConfig,
} from '@/constants/sparse-photo-album-config';
import { getSparsePhotoZoomBounds, SPARSE_PHOTO_ZOOM_MARGIN_MM, getAlbumPageSizeMm } from '@/constants/photo-print-margins';
import { filterFeasiblePhotoLayouts } from '@/utils/photoLayoutFeasibility';
import { getPdfPhotoPageLayouts } from '@/utils/pdfPhotoSlots';

const FULL_PHOTO_TEMPLATES = [...STANDARD_DESIGNED_ALBUM_TEMPLATE_IDS];

const COLLAGE_TEMPLATE_SETS: Record<string, string[]> = {
  one_horizontal: ['one_large', 'two_vertical', 'four_grid'],
  one_large: ['one_large', 'two_vertical', 'four_grid'],
  default: ['one_large', 'two_vertical', 'four_grid'],
};

export function slotToSafeZone(slot: {
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

/** kids_48 p1: OCR даёт высокий бокс имени (~0.12) — для photo gap y = штрих. */
const KIDS_P1_PHOTO_LINE_BAND = 0.028;

function normalizeKids48PhotoConstraintSlot(
  lineGuideId: string,
  page: number,
  slot: NormalizedLineSlot,
): NormalizedLineSlot {
  if (lineGuideId !== 'kids_48' || page !== 1) return slot;
  if (slot.inputKind === 'block') return slot;
  if (slot.height <= KIDS_P1_PHOTO_LINE_BAND + 0.001 && slot.lineStrokeAtBottom) {
    return slot;
  }
  // LINE_SLOTS/LINE_GUIDES.y — печатный штрих; полоса над ним.
  return {
    ...slot,
    y: slot.y - KIDS_P1_PHOTO_LINE_BAND,
    height: KIDS_P1_PHOTO_LINE_BAND,
    textAnchorTop: true,
    lineStrokeAtBottom: true,
  };
}

function getLineSlots(lineGuideId: string, page: number): readonly NormalizedLineSlot[] {
  // kids_48 p21: имена крестных следуют за фото — не режут photo safe zone.
  if (lineGuideId === 'kids_48' && page === 21) return [];
  const raw =
    (LINE_SLOTS as Record<string, Record<string, readonly NormalizedLineSlot[]>>)[lineGuideId]?.[
      String(page)
    ] ?? [];
  if (lineGuideId === 'kids_48' && page === 1) {
    return raw.map((slot) => normalizeKids48PhotoConstraintSlot(lineGuideId, page, slot));
  }
  return raw;
}

function getLineSlotTop(slot: NormalizedLineSlot): number {
  return slot.textAnchorTop ? slot.y : slot.y - slot.height / 2;
}

function getLineSlotBottom(slot: NormalizedLineSlot): number {
  return slot.textAnchorTop ? slot.y + slot.height : slot.y + slot.height / 2;
}

/** OCR иногда даёт третьей строке планов h≈0.08 — без cap фото уезжает вниз. */
const WEEKLY_PHOTO_LINE_HEIGHT_CAP = 0.045;

function getWeeklyPhotoConstraintBottom(slot: NormalizedLineSlot): number {
  const height = Math.min(slot.height, WEEKLY_PHOTO_LINE_HEIGHT_CAP);
  if (slot.textAnchorTop || slot.lineStrokeAtBottom) {
    return slot.y + height;
  }
  return slot.y + height / 2;
}

/**
 * Weekly pages: ignore side measurement blocks and pregnancy_60 plan overflow.
 * - layout: skip phantom index 5 (empty band above photo; not used by plans field)
 * - zoom: also skip tall OCR index 4 so pinch/pan can enter the empty plan underlines
 */
function filterWeeklyPhotoConstraintSlots(
  lineGuideId: string,
  slots: readonly NormalizedLineSlot[],
  mode: 'layout' | 'zoom' = 'layout',
): NormalizedLineSlot[] {
  return slots.filter((slot, index) => {
    // Pregnancy: боковые block-ячейки (замеры) не режут полосу фото.
    // holidays_birthday_60 «Привет, мир!» / возраст: вес/рост/место — тоже block,
    // но обязаны ограничивать зону, иначе two_vertical налазает на поля (eventSafe 0.18–0.82).
    if ((slot.inputKind ?? 'line') === 'block') {
      if (lineGuideId !== 'holidays_birthday_60') return false;
    }
    if (lineGuideId === 'pregnancy_60' && index === 5) return false;
    if (mode === 'zoom' && lineGuideId === 'pregnancy_60' && index === 4) return false;
    return true;
  });
}

function gapNorm(config: AlbumSparsePhotoConfig): number {
  const pageWidthMm = config.pageWidthMm ?? config.pageSizeMm;
  return config.gapMm / pageWidthMm;
}

/** PDF «Место для фото» в нижней части страницы (анкеты беременности p1/p3 и др.). */
function isBottomAnchoredPhotoSlot(primarySlot: { y: number }): boolean {
  return primarySlot.y >= 0.55;
}

/** Band-страницы: не pin к PDF — расширяем layouts в пустоту (в т.ч. mixed с нижней рамкой). */
export function shouldExpandSparseBandLayouts(
  lineGuideId: string,
  page: number,
  primarySlot?: { y: number } | null,
): boolean {
  if (isPregnancyUpperBandPage(lineGuideId, page)) return true;
  const strategy = classifyPhotoSafeZoneStrategy(lineGuideId, page);
  if (strategy === 'bottom_band' || strategy === 'upper_band') return true;
  if (strategy === 'mixed' && primarySlot && isBottomAnchoredPhotoSlot(primarySlot)) {
    return true;
  }
  return false;
}

function getMaxLineTextBottom(lineGuideId: string, page: number): number {
  let slots = getLineSlots(lineGuideId, page);
  // pregnancy_a5 p1: OCR-шум внизу страницы (y≈0.87) — не должен толкать фото вниз.
  if (
    (lineGuideId === 'pregnancy_60' || lineGuideId === 'pregnancy_a5') &&
    page === 1
  ) {
    slots = slots.filter((slot) => slot.y < 0.65);
  }
  if (!slots.length) return 0;
  return Math.max(...slots.map((slot) => getLineSlotBottom(slot)));
}

function getMinLineTextTop(lineGuideId: string, page: number): number {
  const slots = getLineSlots(lineGuideId, page);
  if (!slots.length) return 1;
  return Math.min(...slots.map((slot) => getLineSlotTop(slot)));
}

/** Недельные страницы: фото между верхним блоком полей и нижними строками заметок. */
function buildWeeklyMiddlePhotoSafeZone(
  lineGuideId: string,
  page: number,
  config: AlbumSparsePhotoConfig,
  mode: 'layout' | 'zoom' = 'layout',
): SafeZone {
  const slots = filterWeeklyPhotoConstraintSlots(
    lineGuideId,
    getLineSlots(lineGuideId, page),
    mode,
  );
  const photoTextGap = gapNorm(config);
  const minHeight = config.minPhotoSafeHeight ?? 0.12;

  const upperLines = slots.filter((slot) => slot.y < 0.45);
  const lowerLines = slots.filter((slot) => slot.y > 0.65);

  if (!upperLines.length || !lowerLines.length) {
    return {
      x: config.eventSafe.x,
      y: config.eventSafe.y,
      width: config.eventSafe.width,
      height: config.eventSafe.height,
    };
  }

  const upperBottomFn =
    lineGuideId === 'pregnancy_60' || lineGuideId === 'pregnancy_a5'
      ? getWeeklyPhotoConstraintBottom
      : getLineSlotBottom;
  const minTop = Math.max(...upperLines.map(upperBottomFn)) + photoTextGap;
  const maxBottom = Math.min(...lowerLines.map(getLineSlotTop)) - photoTextGap;
  const height = maxBottom - minTop;

  if (height < minHeight) {
    return {
      x: config.eventSafe.x,
      y: config.eventSafe.y,
      width: config.eventSafe.width,
      height: Math.max(minHeight, config.eventSafe.height),
    };
  }

  // kids_48 p1: вертикаль — вся полоса между именем и анкетой;
  // горизонталь — PDF «Место для фото» (~54% ширины), не eventSafe 90%
  // (иначе фото «гигант» почти без боковых полей). Поля ≥ 1.5 см.
  if (lineGuideId === 'kids_48' && page === 1) {
    const pdf = getPdfPhotoPageLayouts(lineGuideId, page)?.variants?.[0]?.slots?.[0];
    const band: SafeZone = pdf
      ? { x: pdf.x, y: minTop, width: pdf.width, height }
      : { x: config.eventSafe.x, y: minTop, width: config.eventSafe.width, height };
    return clampSafeZoneToSparseMargins(lineGuideId, band);
  }

  const pdf = getPdfPhotoPageLayouts(lineGuideId, page)?.variants?.[0]?.slots?.[0];

  // Недели pregnancy: вся полоса между «Планами» и «Ощущениями».
  // PDF-пин по высоте оставлял мелкое фото с пустотой сверху/снизу.
  if (lineGuideId === 'pregnancy_60' || lineGuideId === 'pregnancy_a5') {
    const tightGap = photoTextGap * 0.35;
    const hardTop = Math.max(...upperLines.map(getWeeklyPhotoConstraintBottom)) + tightGap;
    const hardBottom = Math.min(...lowerLines.map(getLineSlotTop)) - tightGap;
    const y = Math.min(hardTop, minTop);
    const bottom = Math.max(hardBottom, maxBottom);
    const bandHeight = Math.max(minHeight, bottom - y);
    return {
      x: pdf?.x ?? config.eventSafe.x,
      y,
      width: pdf?.width ?? config.eventSafe.width,
      height: bandHeight,
    };
  }

  if (pdf) {
    const pdfZone = slotToSafeZone(pdf);
    const top = Math.max(minTop, pdfZone.y);
    const bottom = Math.min(maxBottom, pdfZone.y + pdfZone.height);
    const pdfHeight = bottom - top;
    if (pdfHeight >= minHeight) {
      return {
        x: pdfZone.x,
        y: top,
        width: pdfZone.width,
        height: pdfHeight,
      };
    }
  }

  return {
    x: config.eventSafe.x,
    y: minTop,
    width: config.eventSafe.width,
    height,
  };
}

/** Текст внизу страницы — фото в верхней полосе (p54, pregnancy_a5 p46). */
function buildUpperBandPhotoSafeZone(
  lineGuideId: string,
  page: number,
  config: AlbumSparsePhotoConfig,
): SafeZone {
  const photoTextGap = gapNorm(config);
  const { heightMm } = getAlbumPageSizeMm(lineGuideId);
  const minTop = SPARSE_PHOTO_ZOOM_MARGIN_MM / heightMm;
  const maxBottom = getMinLineTextTop(lineGuideId, page) - photoTextGap;
  const height = maxBottom - minTop;
  const minHeight = config.minPhotoSafeHeight ?? 0.12;

  if (height < minHeight) {
    return clampSafeZoneToSparseMargins(
      lineGuideId,
      constrainPhotoSafeZone(
        lineGuideId,
        page,
        {
          x: config.eventSafe.x,
          y: config.eventSafe.y,
          width: config.eventSafe.width,
          height: config.eventSafe.height,
        },
        config,
      ),
    );
  }

  return clampSafeZoneToSparseMargins(
    lineGuideId,
    constrainPhotoSafeZone(
      lineGuideId,
      page,
      { x: config.eventSafe.x, y: minTop, width: config.eventSafe.width, height },
      config,
    ),
  );
}

/**
 * Полоса фото под текстом анкеты (p1/p3/p6).
 * Вверх — до текста+gap; вниз — до поля 1.5 см (не режем по низу узкой PDF-рамки).
 * Вширь — PREGNANCY_PHOTO_SAFE.
 */
function buildBottomAnchoredPhotoSafeZone(
  lineGuideId: string,
  page: number,
  primarySlot: { x: number; y: number; width: number; height: number } | null | undefined,
  config: AlbumSparsePhotoConfig,
): SafeZone {
  const photoTextGap = gapNorm(config);
  const minTop = getMaxLineTextBottom(lineGuideId, page) + photoTextGap;
  const fallbackZone: SafeZone = {
    x: config.eventSafe.x,
    y: config.eventSafe.y,
    width: config.eventSafe.width,
    height: config.eventSafe.height,
  };
  const slotZone = primarySlot ? slotToSafeZone(primarySlot) : fallbackZone;
  const { heightMm } = getAlbumPageSizeMm(lineGuideId);
  const pageBottom = 1 - SPARSE_PHOTO_ZOOM_MARGIN_MM / heightMm;
  const bandMaxBottom = config.photoBandMaxBottom ?? pageBottom;
  const minHeight = config.minPhotoSafeHeight ?? 0.12;

  // Под текстом → до нижнего поля страницы (заполняем пустоту над и под PDF-рамкой).
  const top = minTop;
  const bottom = Math.min(bandMaxBottom, pageBottom);
  const height = bottom - top;

  if (height < minHeight) {
    return clampSafeZoneToSparseMargins(
      lineGuideId,
      constrainPhotoSafeZone(lineGuideId, page, slotZone, config),
    );
  }

  const expanded: SafeZone = {
    x: config.eventSafe.x,
    y: top,
    width: config.eventSafe.width,
    height,
  };

  return clampSafeZoneToSparseMargins(
    lineGuideId,
    constrainPhotoSafeZone(lineGuideId, page, expanded, config),
  );
}

function clampSafeZoneToSparseMargins(lineGuideId: string, zone: SafeZone): SafeZone {
  const bounds = getSparsePhotoZoomBounds(lineGuideId);
  const left = Math.max(zone.x, bounds.left);
  const top = Math.max(zone.y, bounds.top);
  const right = Math.min(zone.x + zone.width, bounds.right);
  const bottom = Math.min(zone.y + zone.height, bounds.bottom);
  return {
    x: left,
    y: top,
    width: Math.max(0.01, right - left),
    height: Math.max(0.01, bottom - top),
  };
}

function getPhotoConstraintSlots(
  lineGuideId: string,
  page: number,
): readonly NormalizedLineSlot[] {
  let slots = getLineSlots(lineGuideId, page);
  // p1: отбрасываем OCR-шум внизу и не даём полям анкеты (~y0.49) резать полосу как «нижний» текст.
  if (
    (lineGuideId === 'pregnancy_60' || lineGuideId === 'pregnancy_a5') &&
    page === 1
  ) {
    slots = slots.filter((slot) => slot.y < 0.65);
  }
  return slots;
}

function constrainPhotoSafeZone(
  lineGuideId: string,
  page: number,
  safeZone: SafeZone,
  config: AlbumSparsePhotoConfig,
): SafeZone {
  const slots = getPhotoConstraintSlots(lineGuideId, page);
  if (!slots.length) return safeZone;

  const photoTextGap = gapNorm(config);
  const minHeight = config.minPhotoSafeHeight ?? 0.12;
  const isPregnancyIntro =
    (lineGuideId === 'pregnancy_60' || lineGuideId === 'pregnancy_a5') && page === 1;

  let minTop = safeZone.y;
  let maxBottom = safeZone.y + safeZone.height;

  for (const slot of slots) {
    // textAnchorTop / lineStrokeAtBottom: низ слота = штрих, не center±h/2.
    const top = getLineSlotTop(slot);
    const bottom = getLineSlotBottom(slot);
    // На p1 вся анкета сверху — только поднимаем верх зоны, низ не режем слотами.
    if (isPregnancyIntro || (top + bottom) / 2 < 0.5) {
      minTop = Math.max(minTop, bottom + photoTextGap);
    } else {
      maxBottom = Math.min(maxBottom, top - photoTextGap);
    }
  }

  const height = maxBottom - minTop;
  if (height < minHeight) {
    return buildBandAroundTextBlock(lineGuideId, page, safeZone, config);
  }

  return { x: safeZone.x, y: minTop, width: safeZone.width, height };
}

function expandVerticalPhotoBand(
  lineGuideId: string,
  page: number,
  safeZone: SafeZone,
  config: AlbumSparsePhotoConfig,
): SafeZone {
  const slots = getLineSlots(lineGuideId, page);
  if (!slots.length) return safeZone;

  const upperLines = slots.filter((slot) => slot.y < 0.45);
  if (upperLines.length === 0 || upperLines.length !== slots.length) return safeZone;

  const photoTextGap = gapNorm(config);
  const maxTextBottom = Math.max(...upperLines.map((slot) => slot.y + slot.height / 2));
  const minTop = Math.max(safeZone.y, maxTextBottom + photoTextGap);
  const bandMaxBottom = config.photoBandMaxBottom ?? 0.9;
  const maxBottom = Math.min(
    bandMaxBottom,
    config.eventSafe.y + config.eventSafe.height + 0.12,
  );
  const height = maxBottom - minTop;

  if (height <= safeZone.height + 0.02) return safeZone;

  return { x: safeZone.x, y: minTop, width: safeZone.width, height };
}

/** Текст внизу страницы — расширяем фото-полосу вниз до зазора 4 мм (p3 «Мы ждём тебя» и др.). */
function expandPhotoBandDownToLowerText(
  lineGuideId: string,
  page: number,
  safeZone: SafeZone,
  config: AlbumSparsePhotoConfig,
): SafeZone {
  const slots = getLineSlots(lineGuideId, page);
  if (!slots.length) return safeZone;

  const photoTextGap = gapNorm(config);
  const lowerTextSlots = slots.filter((slot) => slot.y >= 0.45);
  if (!lowerTextSlots.length) return safeZone;

  const nearestTextTop = Math.min(
    ...lowerTextSlots.map((slot) => slot.y - slot.height / 2),
  );
  const maxBottom = nearestTextTop - photoTextGap;
  const currentBottom = safeZone.y + safeZone.height;
  if (maxBottom <= currentBottom + 0.005) return safeZone;

  const newHeight = maxBottom - safeZone.y;
  const minHeight = config.minPhotoSafeHeight ?? 0.12;
  if (newHeight < minHeight) return safeZone;

  return { ...safeZone, height: newHeight };
}

function applyFullWidthIfSparse(
  lineGuideId: string,
  page: number,
  safeZone: SafeZone,
  config: AlbumSparsePhotoConfig,
): SafeZone {
  if (config.sideBySideTwoPhotoPages?.has(page)) {
    return {
      x: config.eventSafe.x,
      y: safeZone.y,
      width: config.eventSafe.width,
      height: safeZone.height,
    };
  }

  const lineCount = getLineSlots(lineGuideId, page).length;
  const sparseTextPage = lineCount === 0 || lineCount <= config.sparseMaxLineSlots;
  const minBandHeight = config.minFullWidthBandHeight ?? 0.35;

  if (sparseTextPage && safeZone.height >= minBandHeight) {
    return {
      x: config.eventSafe.x,
      y: safeZone.y,
      width: config.eventSafe.width,
      height: safeZone.height,
    };
  }

  return safeZone;
}

function buildBandAroundTextBlock(
  lineGuideId: string,
  page: number,
  safeZone: SafeZone,
  config: AlbumSparsePhotoConfig,
): SafeZone {
  const slots = getLineSlots(lineGuideId, page);
  if (!slots.length) return safeZone;

  const photoTextGap = gapNorm(config);
  const minHeight = config.minPhotoSafeHeight ?? 0.12;
  const minTopBound = safeZone.y;
  const maxBottomBound = Math.min(
    config.photoBandMaxBottom ?? 0.9,
    safeZone.y + safeZone.height,
  );

  const minTextTop = Math.min(...slots.map((slot) => slot.y - slot.height / 2));
  const maxTextBottom = Math.max(...slots.map((slot) => slot.y + slot.height / 2));

  const spaceAbove = minTextTop - photoTextGap - minTopBound;
  const spaceBelow = maxBottomBound - maxTextBottom - photoTextGap;

  let top: number;
  let height: number;

  if (spaceBelow >= spaceAbove && spaceBelow >= minHeight) {
    top = maxTextBottom + photoTextGap;
    height = maxBottomBound - top;
  } else if (spaceAbove >= minHeight) {
    top = minTopBound;
    height = minTextTop - photoTextGap - minTopBound;
  } else if (spaceBelow >= minHeight) {
    top = maxTextBottom + photoTextGap;
    height = maxBottomBound - top;
  } else {
    return safeZone;
  }

  return { x: safeZone.x, y: top, width: safeZone.width, height };
}

function resolveStrategySafeZone(
  lineGuideId: string,
  page: number,
  primarySlot: { x: number; y: number; width: number; height: number },
  config: AlbumSparsePhotoConfig,
): SafeZone | undefined {
  const strategy = classifyPhotoSafeZoneStrategy(lineGuideId, page);

  switch (strategy) {
    case 'weekly_middle':
      return buildWeeklyMiddlePhotoSafeZone(lineGuideId, page, config);
    case 'upper_band':
      return buildUpperBandPhotoSafeZone(lineGuideId, page, config);
    case 'bottom_band':
      return buildBottomAnchoredPhotoSafeZone(lineGuideId, page, primarySlot, config);
    case 'photo_only': {
      const blankSafe =
        lineGuideId === 'family_blank' ||
        lineGuideId === 'holidays_blank' ||
        lineGuideId === 'family_blank_21x21'
          ? config.eventSafe
          : BLANK_PAGE_PHOTO_SAFE;
      let zone = constrainPhotoSafeZone(lineGuideId, page, blankSafe, config);
      // Free photo+caption pages: leave a band under frames so captions sit below photos.
      if (lineGuideId === 'holidays_birthday_60' && isBirthdayCaptionPhotoPage(page)) {
        const captionReserve = 0.065;
        const minHeight = config.minPhotoSafeHeight ?? 0.12;
        zone = {
          ...zone,
          height: Math.max(minHeight, zone.height - captionReserve),
        };
      }
      return zone;
    }
    case 'mixed':
      if (isBottomAnchoredPhotoSlot(primarySlot)) {
        return buildBottomAnchoredPhotoSafeZone(lineGuideId, page, primarySlot, config);
      }
      return constrainPhotoSafeZone(lineGuideId, page, config.eventSafe, config);
    default:
      return undefined;
  }
}

export function resolveSparsePhotoZoomSafeZone(
  lineGuideId: string,
  page: number,
): SafeZone {
  const config = getSparsePhotoAlbumConfig(lineGuideId);
  const bounds = getSparsePhotoZoomBounds(lineGuideId);
  const baseZone: SafeZone = {
    x: bounds.left,
    y: bounds.top,
    width: bounds.right - bounds.left,
    height: bounds.bottom - bounds.top,
  };

  if (!config) {
    return baseZone;
  }

  if (isPregnancyWeeklyMiddlePage(lineGuideId, page)) {
    const weekly = buildWeeklyMiddlePhotoSafeZone(lineGuideId, page, config, 'zoom');
    // Already text-cleared — do not re-shrink with center-based constrainPhotoSafeZone.
    return weekly;
  }

  if (isPregnancyUpperBandPage(lineGuideId, page)) {
    const upper = buildUpperBandPhotoSafeZone(lineGuideId, page, config);
    return constrainPhotoSafeZone(lineGuideId, page, upper, config);
  }

  return constrainPhotoSafeZone(lineGuideId, page, baseZone, config);
}

export function resolveSparsePhotoSafeZone(
  lineGuideId: string,
  page: number,
  primarySlot: { x: number; y: number; width: number; height: number },
): SafeZone {
  const config = getSparsePhotoAlbumConfig(lineGuideId);
  if (!config) return slotToSafeZone(primarySlot);

  if (isPregnancyWeeklyMiddlePage(lineGuideId, page)) {
    return buildWeeklyMiddlePhotoSafeZone(lineGuideId, page, config);
  }

  if (isPregnancyUpperBandPage(lineGuideId, page)) {
    return buildUpperBandPhotoSafeZone(lineGuideId, page, config);
  }

  // kids_48: strategy обычно не раздувает рамку layout (pinch — через zoom safe zone).
  // p1 — исключение: между именем и анкетой нужна широкая middle-полоса, не PDF-пин.
  const strategyZone = resolveStrategySafeZone(lineGuideId, page, primarySlot, config);
  if (
    strategyZone &&
    (lineGuideId !== 'kids_48' || (page === 1 && strategyZone.height >= 0.35))
  ) {
    return strategyZone;
  }

  let safeZone = constrainPhotoSafeZone(lineGuideId, page, slotToSafeZone(primarySlot), config);
  safeZone = expandVerticalPhotoBand(lineGuideId, page, safeZone, config);
  safeZone = expandPhotoBandDownToLowerText(lineGuideId, page, safeZone, config);
  safeZone = applyFullWidthIfSparse(lineGuideId, page, safeZone, config);

  if (config.sideBySideTwoPhotoPages?.has(page)) {
    return safeZone;
  }

  if (isBottomAnchoredPhotoSlot(primarySlot)) {
    return buildBottomAnchoredPhotoSafeZone(lineGuideId, page, primarySlot, config);
  }

  const stackedMin = config.stackedTwoMinBandHeight ?? 0.54;
  if (safeZone.height >= stackedMin) {
    return safeZone;
  }

  const targetHeight = Math.min(stackedMin, config.eventSafe.height);
  let top = primarySlot.y - targetHeight / 2;
  top = Math.max(
    config.eventSafe.y,
    Math.min(top, config.eventSafe.y + config.eventSafe.height - targetHeight),
  );

  const expanded: SafeZone = {
    x: config.eventSafe.x,
    y: top,
    width: config.eventSafe.width,
    height: targetHeight,
  };

  return constrainPhotoSafeZone(lineGuideId, page, expanded, config);
}

export function getCollageTemplateSet(lineGuideId: string): readonly string[] {
  if (hasSparsePhotoConfig(lineGuideId) && !usesBlankPagePhotoFallback(lineGuideId)) {
    return STANDARD_DESIGNED_ALBUM_TEMPLATE_IDS;
  }
  return EVENT_PHOTO_TEMPLATES;
}

/** 4 standard variants scaled to PDF «Место для фото» bbox (no sparse expansion). */
export function buildStandardDesignedAlbumLayouts(
  layouts: PhotoPageLayouts,
): PhotoPageLayouts | undefined {
  const primarySlot = layouts.variants[0]?.slots[0];
  if (!primarySlot || primarySlot.height < 0.12 || primarySlot.width < 0.25) {
    return undefined;
  }

  const safeZone = slotToSafeZone(primarySlot);
  const expanded = buildPageLayoutsFromTemplates(safeZone, [...STANDARD_DESIGNED_ALBUM_TEMPLATE_IDS]);
  if (expanded.variants.length === 0) return undefined;
  const feasible = filterFeasiblePhotoLayouts(expanded);
  if (!feasible.variants.length) return undefined;
  return feasible;
}

export function buildTwoHorizontalVariant(
  _lineGuideId: string,
  _page: number,
  safeZone: SafeZone,
): PhotoPageLayouts['variants'][number] | null {
  const built = buildPageLayoutsFromTemplates(safeZone, ['two_vertical']);
  const variant = built.variants[0];
  if (!variant) return null;
  return { ...variant, variantId: 'two_vertical' };
}

export function applyTwoPhotoLayouts(
  lineGuideId: string,
  page: number,
  safeZone: SafeZone,
  layouts: PhotoPageLayouts,
): PhotoPageLayouts {
  const twoPhoto = buildTwoHorizontalVariant(lineGuideId, page, safeZone);
  if (!twoPhoto) return layouts;

  const targetIds = new Set(['two_horizontal', 'two_photos', 'two_vertical']);
  const variants = layouts.variants.map((variant) =>
    targetIds.has(variant.variantId) ? twoPhoto : variant,
  );

  if (!variants.some((variant) => variant.variantId === twoPhoto.variantId)) {
    variants.push(twoPhoto);
  }

  return { variants };
}

export function expandDesignedAlbumCollageVariants(
  lineGuideId: string,
  page: number,
  layouts: PhotoPageLayouts,
): PhotoPageLayouts | undefined {
  if (shouldSkipSparsePhotoExpansion(lineGuideId, page)) return undefined;

  const primarySlot = layouts.variants[0]?.slots[0];
  const expandBand = shouldExpandSparseBandLayouts(lineGuideId, page, primarySlot);

  // Weekly и band: строим из resolveSparsePhotoSafeZone. Остальные — pin к PDF.
  if (!isPregnancyWeeklyMiddlePage(lineGuideId, page) && !expandBand) {
    const standard = buildStandardDesignedAlbumLayouts(layouts);
    if (standard) return standard;
  }

  if (!primarySlot || primarySlot.height < 0.12 || primarySlot.width < 0.25) {
    return undefined;
  }

  const safeZone = resolveSparsePhotoSafeZone(lineGuideId, page, primarySlot);
  const templateSet = getCollageTemplateSet(lineGuideId);
  const expanded = buildPageLayoutsFromTemplates(safeZone, [...templateSet]);
  if (expanded.variants.length === 0) return undefined;

  return applyTwoPhotoLayouts(lineGuideId, page, safeZone, expanded);
}

/** Event pages без PDF-слота: safe zone по текстовым линиям + стандартные шаблоны. */
function buildDesignedAlbumEventPhotoLayouts(
  lineGuideId: string,
  page: number,
  templateIds: readonly string[] = STANDARD_DESIGNED_ALBUM_TEMPLATE_IDS,
): PhotoPageLayouts {
  const eventSafe = getSparsePhotoAlbumConfig(lineGuideId)?.eventSafe ?? EVENT_PHOTO_SAFE;
  const syntheticPrimary = {
    x: eventSafe.x + eventSafe.width / 2,
    y: eventSafe.y + eventSafe.height / 2,
    width: eventSafe.width,
    height: eventSafe.height * 0.85,
  };

  const safeZone = resolveSparsePhotoSafeZone(lineGuideId, page, syntheticPrimary);
  return buildPageLayoutsFromTemplates(safeZone, [...templateIds]);
}

function isPortraitPhotoPin(slot: { width: number; height: number } | undefined): boolean {
  if (!slot) return false;
  return slot.height >= slot.width * 1.05;
}

/** Широкая зона между заголовком и датой — стопка или два в ряд (p19/p20/месяцы). */
function buildKidsLandscapeEventPhotoLayouts(page: number): PhotoPageLayouts {
  return buildDesignedAlbumEventPhotoLayouts(
    'kids_48',
    page,
    isKidsSideBySideEventPage(page)
      ? KIDS_SIDE_BY_SIDE_EVENT_TEMPLATE_IDS
      : KIDS_LANDSCAPE_EVENT_TEMPLATE_IDS,
  );
}

export function expandManualSparseLayouts(
  lineGuideId: string,
  page: number,
  manual: PhotoPageLayouts,
): PhotoPageLayouts | undefined {
  if (shouldSkipSparsePhotoExpansion(lineGuideId, page)) return undefined;

  const primarySlot = manual.variants[0]?.slots[0];
  if (!primarySlot) return undefined;

  const safeZone = resolveSparsePhotoSafeZone(lineGuideId, page, primarySlot);
  const templateSet = getCollageTemplateSet(lineGuideId);
  const expanded = buildPageLayoutsFromTemplates(safeZone, [...templateSet]);
  if (expanded.variants.length <= 1) return undefined;

  return applyTwoPhotoLayouts(lineGuideId, page, safeZone, expanded);
}

/** Добавляет раскладки 2 и 4 фото внутри расширенной safe zone при sparse-тексте. */
export function expandCollageVariantsWithSparse(
  layouts: PhotoPageLayouts,
  lineGuideId: string,
  page: number,
): PhotoPageLayouts {
  if (layouts.variants.length > 1) return layouts;

  const primaryVariant = layouts.variants[0];
  const primarySlot = primaryVariant?.slots[0];
  if (!primarySlot || primarySlot.height < 0.18 || primarySlot.width < 0.35) {
    return layouts;
  }

  let safeZone = slotToSafeZone(primarySlot);
  if (!shouldSkipSparsePhotoExpansion(lineGuideId, page) && hasSparsePhotoConfig(lineGuideId)) {
    safeZone = resolveSparsePhotoSafeZone(lineGuideId, page, primarySlot);
  }

  const templateIds =
    COLLAGE_TEMPLATE_SETS[primaryVariant.variantId] ??
    (lineGuideId.startsWith('pregnancy_')
      ? [...FULL_PHOTO_TEMPLATES]
      : COLLAGE_TEMPLATE_SETS.default);

  const expanded = buildPageLayoutsFromTemplates(safeZone, templateIds);
  if (expanded.variants.length <= 1) return layouts;

  if (!shouldSkipSparsePhotoExpansion(lineGuideId, page)) {
    return applyTwoPhotoLayouts(lineGuideId, page, safeZone, expanded);
  }

  return expanded;
}

/**
 * kids_48 layouts: PDF «Место для фото» (standard), без strategy-expand на весь лист.
 * Узкий портретный pin → широкая landscape-зона (иначе «башни»).
 * p1 — middle-band по высоте (имя↔анкета), ширина как PDF-пин, поля ≥1.5 см.
 * Максимум пространства для pinch/pan — в photoBlockSafeZone (zoom safe zone).
 */
export function resolveKidsPhotoPageLayouts(
  page: number,
  pdf: PhotoPageLayouts | undefined,
): PhotoPageLayouts | undefined {
  const lineGuideId = 'kids_48';

  if (shouldSkipSparsePhotoExpansion(lineGuideId, page)) {
    return undefined;
  }

  // «Этот альбом принадлежит» — фото между именем и датой/весом/ростом.
  if (page === 1) {
    return filterFeasiblePhotoLayouts(buildKidsLandscapeEventPhotoLayouts(page));
  }

  if (pdf?.variants?.length) {
    const primarySlot = pdf.variants[0]?.slots[0];
    if (isPortraitPhotoPin(primarySlot)) {
      return filterFeasiblePhotoLayouts(buildKidsLandscapeEventPhotoLayouts(page));
    }
    const standard =
      buildStandardDesignedAlbumLayouts(pdf) ??
      expandDesignedAlbumCollageVariants(lineGuideId, page, pdf);
    if (standard) return filterFeasiblePhotoLayouts(standard);
  }

  if (page === 12 || (page >= 6 && page <= 47 && page !== 5 && page !== 10 && page !== 11)) {
    return filterFeasiblePhotoLayouts(buildKidsLandscapeEventPhotoLayouts(page));
  }

  return undefined;
}
