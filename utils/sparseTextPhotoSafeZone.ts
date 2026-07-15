import { LINE_SLOTS, type NormalizedLineSlot } from '@/constants/line-slots';
import type { PhotoPageLayouts } from '@/constants/photo-slots';
import {
  EVENT_PHOTO_TEMPLATES,
  eventPhotoLayouts,
} from '@/constants/photo-slots';
import {
  buildPageLayoutsFromTemplates,
  STANDARD_DESIGNED_ALBUM_TEMPLATE_IDS,
  type SafeZone,
} from '@/constants/photo-layout-templates';
import {
  classifyPhotoSafeZoneStrategy,
  PHOTO_ONLY_PAGE_SAFE,
  getSparsePhotoAlbumConfig,
  hasSparsePhotoConfig,
  isPregnancyUpperBandPage,
  isPregnancyWeeklyMiddlePage,
  shouldSkipSparsePhotoExpansion,
  usesBlankPagePhotoFallback,
  type AlbumSparsePhotoConfig,
} from '@/constants/sparse-photo-album-config';
import { filterFeasiblePhotoLayouts } from '@/utils/photoLayoutFeasibility';
import { getPageAspectRatio } from '@/utils/photoSlotAspect';

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

function getLineSlots(lineGuideId: string, page: number): readonly NormalizedLineSlot[] {
  return (
    (LINE_SLOTS as Record<string, Record<string, readonly NormalizedLineSlot[]>>)[lineGuideId]?.[
      String(page)
    ] ?? []
  );
}

function gapNorm(config: AlbumSparsePhotoConfig): number {
  return config.gapMm / config.pageSizeMm;
}

/** PDF «Место для фото» в нижней части страницы (анкеты беременности p1/p3 и др.). */
function isBottomAnchoredPhotoSlot(primarySlot: { y: number }): boolean {
  return primarySlot.y >= 0.55;
}

function getMaxLineTextBottom(lineGuideId: string, page: number): number {
  const slots = getLineSlots(lineGuideId, page);
  if (!slots.length) return 0;
  return Math.max(...slots.map((slot) => slot.y + slot.height / 2));
}

function getMinLineTextTop(lineGuideId: string, page: number): number {
  const slots = getLineSlots(lineGuideId, page);
  if (!slots.length) return 1;
  return Math.min(...slots.map((slot) => slot.y - slot.height / 2));
}

/** Недельные страницы: фото между верхним блоком полей и нижними строками заметок. */
function buildWeeklyMiddlePhotoSafeZone(
  lineGuideId: string,
  page: number,
  config: AlbumSparsePhotoConfig,
): SafeZone {
  const slots = getLineSlots(lineGuideId, page);
  const photoTextGap = gapNorm(config);
  const minHeight = config.minPhotoSafeHeight ?? 0.12;

  const upperLines = slots.filter((slot) => slot.y < 0.45);
  const lowerLines = slots.filter((slot) => slot.y > 0.65);

  if (!upperLines.length || !lowerLines.length) {
    return constrainPhotoSafeZone(
      lineGuideId,
      page,
      { x: config.eventSafe.x, y: config.eventSafe.y, width: config.eventSafe.width, height: config.eventSafe.height },
      config,
    );
  }

  const minTop = Math.max(...upperLines.map((slot) => slot.y + slot.height / 2)) + photoTextGap;
  const maxBottom = Math.min(...lowerLines.map((slot) => slot.y - slot.height / 2)) - photoTextGap;
  const height = maxBottom - minTop;

  if (height < minHeight) {
    return constrainPhotoSafeZone(lineGuideId, page, config.eventSafe, config);
  }

  return constrainPhotoSafeZone(
    lineGuideId,
    page,
    { x: config.eventSafe.x, y: minTop, width: config.eventSafe.width, height },
    config,
  );
}

/** Текст внизу страницы — фото в верхней полосе (p54, pregnancy_a5 p48). */
function buildUpperBandPhotoSafeZone(
  lineGuideId: string,
  page: number,
  config: AlbumSparsePhotoConfig,
): SafeZone {
  const photoTextGap = gapNorm(config);
  const minTop = 0.12;
  const maxBottom = getMinLineTextTop(lineGuideId, page) - photoTextGap;
  const height = maxBottom - minTop;
  const minHeight = config.minPhotoSafeHeight ?? 0.12;

  if (height < minHeight) {
    return constrainPhotoSafeZone(
      lineGuideId,
      page,
      { x: config.eventSafe.x, y: config.eventSafe.y, width: config.eventSafe.width, height: config.eventSafe.height },
      config,
    );
  }

  return constrainPhotoSafeZone(
    lineGuideId,
    page,
    { x: config.eventSafe.x, y: minTop, width: config.eventSafe.width, height },
    config,
  );
}

/** Полоса фото под текстом анкеты — ширина eventSafe (~80% страницы), низ до bandMaxBottom. */
function buildBottomAnchoredPhotoSafeZone(
  lineGuideId: string,
  page: number,
  primarySlot: { x: number; y: number; width: number; height: number },
  config: AlbumSparsePhotoConfig,
): SafeZone {
  const photoTextGap = gapNorm(config);
  const textBottom = getMaxLineTextBottom(lineGuideId, page);
  const slotZone = slotToSafeZone(primarySlot);
  const bandMaxBottom = config.photoBandMaxBottom ?? 0.9;
  const wideX = config.eventSafe.x;
  const wideW = config.eventSafe.width;
  const minHeight = config.minPhotoSafeHeight ?? 0.12;

  // Поднимаем верх к тексту анкеты (не к узкой PDF-рамке), чтобы 4:3 могло занять ~80% ширины.
  // Декоративные подписи на PDF («Совместное фото») остаются под фото по z-order маски.
  const top =
    textBottom > 0
      ? Math.min(slotZone.y, Math.max(config.eventSafe.y, textBottom + photoTextGap))
      : Math.min(slotZone.y, config.eventSafe.y + 0.08);
  const bottom = Math.max(slotZone.y + slotZone.height, bandMaxBottom);
  const height = bottom - top;

  if (height < minHeight) {
    return constrainPhotoSafeZone(
      lineGuideId,
      page,
      { x: wideX, y: slotZone.y, width: wideW, height: slotZone.height },
      config,
    );
  }

  return {
    x: wideX,
    y: top,
    width: wideW,
    height,
  };
}

function constrainPhotoSafeZone(
  lineGuideId: string,
  page: number,
  safeZone: SafeZone,
  config: AlbumSparsePhotoConfig,
): SafeZone {
  const slots = getLineSlots(lineGuideId, page);
  if (!slots.length) return safeZone;

  const photoTextGap = gapNorm(config);
  const minHeight = config.minPhotoSafeHeight ?? 0.12;

  let minTop = safeZone.y;
  let maxBottom = safeZone.y + safeZone.height;

  for (const slot of slots) {
    const top = slot.y - slot.height / 2;
    const bottom = slot.y + slot.height / 2;
    if (slot.y < 0.5) {
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

  return {
    x: config.eventSafe.x,
    y: minTop,
    width: config.eventSafe.width,
    height,
  };
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
      // Единый стандарт ~80% страницы во всех альбомах (kids, diary, blank, birthday…).
      return constrainPhotoSafeZone(lineGuideId, page, PHOTO_ONLY_PAGE_SAFE, config);
    }
    case 'mixed':
      return constrainPhotoSafeZone(lineGuideId, page, config.eventSafe, config);
    default:
      return undefined;
  }
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

  const strategy = classifyPhotoSafeZoneStrategy(lineGuideId, page);
  // Photo-only: всегда ~80% во всех альбомах, включая kids_48.
  if (strategy === 'photo_only') {
    return constrainPhotoSafeZone(lineGuideId, page, PHOTO_ONLY_PAGE_SAFE, config);
  }

  const strategyZone = resolveStrategySafeZone(lineGuideId, page, primarySlot, config);
  if (strategyZone && lineGuideId !== 'kids_48') {
    return strategyZone;
  }

  let safeZone = constrainPhotoSafeZone(lineGuideId, page, slotToSafeZone(primarySlot), config);
  safeZone = expandVerticalPhotoBand(lineGuideId, page, safeZone, config);
  safeZone = expandPhotoBandDownToLowerText(lineGuideId, page, safeZone, config);
  safeZone = applyFullWidthIfSparse(lineGuideId, page, safeZone, config);

  // Нижняя PDF-рамка: сначала расширяем полосу (ширина + низ), иначе side-by-side
  // early-return оставляет слишком низкую полосу и 4:3 снова сжимает ширину.
  if (isBottomAnchoredPhotoSlot(primarySlot)) {
    return buildBottomAnchoredPhotoSafeZone(lineGuideId, page, primarySlot, config);
  }

  if (config.sideBySideTwoPhotoPages?.has(page)) {
    return safeZone;
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

/**
 * Стандартные варианты коллажа в расширенной safe zone (~80% ширины для одного фото),
 * а не в узкой PDF-рамке «Место для фото».
 */
export function buildStandardDesignedAlbumLayouts(
  layouts: PhotoPageLayouts,
  lineGuideId?: string,
  page?: number,
): PhotoPageLayouts | undefined {
  const primarySlot = layouts.variants[0]?.slots[0];
  if (!primarySlot || primarySlot.height < 0.12 || primarySlot.width < 0.25) {
    return undefined;
  }

  let safeZone = slotToSafeZone(primarySlot);
  if (
    lineGuideId &&
    page !== undefined &&
    hasSparsePhotoConfig(lineGuideId) &&
    !shouldSkipSparsePhotoExpansion(lineGuideId, page)
  ) {
    safeZone = resolveSparsePhotoSafeZone(lineGuideId, page, primarySlot);
  }

  const pageAspect = getPageAspectRatio(lineGuideId);
  const expanded = buildPageLayoutsFromTemplates(safeZone, [...STANDARD_DESIGNED_ALBUM_TEMPLATE_IDS], pageAspect);
  if (expanded.variants.length === 0) return undefined;
  const feasible = filterFeasiblePhotoLayouts(expanded);
  if (!feasible.variants.length) return undefined;
  return feasible;
}

export function buildTwoHorizontalVariant(
  lineGuideId: string,
  _page: number,
  safeZone: SafeZone,
): PhotoPageLayouts['variants'][number] | null {
  const pageAspect = getPageAspectRatio(lineGuideId);
  const built = buildPageLayoutsFromTemplates(safeZone, ['two_vertical'], pageAspect);
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

  const standard = buildStandardDesignedAlbumLayouts(layouts, lineGuideId, page);
  if (standard) return standard;

  const primarySlot = layouts.variants[0]?.slots[0];
  if (!primarySlot || primarySlot.height < 0.12 || primarySlot.width < 0.25) {
    return undefined;
  }

  const safeZone = resolveSparsePhotoSafeZone(lineGuideId, page, primarySlot);
  const templateSet = getCollageTemplateSet(lineGuideId);
  const pageAspect = getPageAspectRatio(lineGuideId);
  const expanded = buildPageLayoutsFromTemplates(safeZone, [...templateSet], pageAspect);
  if (expanded.variants.length === 0) return undefined;

  return applyTwoPhotoLayouts(lineGuideId, page, safeZone, expanded);
}

/** Event pages без PDF-слота: safe zone ~80% + стандартные шаблоны. */
function buildDesignedAlbumEventPhotoLayouts(lineGuideId: string, page: number): PhotoPageLayouts {
  const eventSafe =
    getSparsePhotoAlbumConfig(lineGuideId)?.eventSafe ?? PHOTO_ONLY_PAGE_SAFE;
  const syntheticPrimary = {
    x: eventSafe.x + eventSafe.width / 2,
    y: eventSafe.y + eventSafe.height / 2,
    width: eventSafe.width,
    height: eventSafe.height * 0.9,
  };

  const safeZone = resolveSparsePhotoSafeZone(lineGuideId, page, syntheticPrimary);
  const pageAspect = getPageAspectRatio(lineGuideId);
  return buildPageLayoutsFromTemplates(safeZone, [...STANDARD_DESIGNED_ALBUM_TEMPLATE_IDS], pageAspect);
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
  const pageAspect = getPageAspectRatio(lineGuideId);
  const expanded = buildPageLayoutsFromTemplates(safeZone, [...templateSet], pageAspect);
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

  const expanded = buildPageLayoutsFromTemplates(
    safeZone,
    templateIds,
    getPageAspectRatio(lineGuideId),
  );
  if (expanded.variants.length <= 1) return layouts;

  if (!shouldSkipSparsePhotoExpansion(lineGuideId, page)) {
    return applyTwoPhotoLayouts(lineGuideId, page, safeZone, expanded);
  }

  return expanded;
}

export function resolveKidsPhotoPageLayouts(
  page: number,
  pdf: PhotoPageLayouts | undefined,
): PhotoPageLayouts | undefined {
  const lineGuideId = 'kids_48';

  if (pdf?.variants?.length && !shouldSkipSparsePhotoExpansion(lineGuideId, page)) {
    const standard =
      buildStandardDesignedAlbumLayouts(pdf, lineGuideId, page) ??
      expandDesignedAlbumCollageVariants(lineGuideId, page, pdf);
    if (standard) return filterFeasiblePhotoLayouts(standard);
  }

  if (page === 12 || (page >= 6 && page <= 47 && page !== 5 && page !== 10 && page !== 11)) {
    return filterFeasiblePhotoLayouts(buildDesignedAlbumEventPhotoLayouts(lineGuideId, page));
  }

  return undefined;
}
