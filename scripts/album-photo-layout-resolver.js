/**
 * Pure-JS photo layout resolver for audit scripts.
 * Mirrors utils/resolvePhotoPageLayouts.ts + utils/sparseTextPhotoSafeZone.ts
 */
const lineSlotsJson = require('../constants/line-slots.json');
const { filterFeasiblePhotoLayouts } = require('./photo-layout-feasibility');

const EVENT_PHOTO_TEMPLATES = [
  'one_horizontal',
  'two_horizontal',
  'two_vertical',
  'three_hero',
  'four_vertical',
];

const STANDARD_DESIGNED_ALBUM_TEMPLATE_IDS = ['one_large', 'two_vertical', 'three_hero', 'four_grid'];

const FULL_PHOTO_TEMPLATES = STANDARD_DESIGNED_ALBUM_TEMPLATE_IDS;

const COLLAGE_TEMPLATE_SETS = {
  one_horizontal: ['one_large', 'two_vertical', 'four_grid'],
  one_large: ['one_large', 'two_vertical', 'four_grid'],
  default: ['one_large', 'two_vertical', 'four_grid'],
};

const PHOTO_ONLY_PAGE_SAFE = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
const EVENT_PHOTO_SAFE = PHOTO_ONLY_PAGE_SAFE;
const PREGNANCY_PHOTO_SAFE = { x: 0.05, y: 0.14, width: 0.9, height: 0.76 };
const PREGNANCY_MEMORY_PHOTO_SAFE = PHOTO_ONLY_PAGE_SAFE;
const BLANK_PAGE_PHOTO_SAFE = PHOTO_ONLY_PAGE_SAFE;

const KIDS_SIDE_BY_SIDE = new Set([1, 3, 4, 8, 13, 21]);
const KIDS_EXCLUDE = new Set([5, 10, 11]);
const BIRTHDAY_EXCLUDE_PAGES = new Set([1, 40, 48]);

const SPARSE_PHOTO_ALBUM_CONFIG = {
  kids_48: {
    eventSafe: EVENT_PHOTO_SAFE,
    gapMm: 4,
    pageSizeMm: 210,
    sparseMaxLineSlots: 4,
    sideBySideTwoPhotoPages: KIDS_SIDE_BY_SIDE,
    excludePages: KIDS_EXCLUDE,
    photoBandMaxBottom: 0.94,
    stackedTwoMinBandHeight: 0.6,
    minFullWidthBandHeight: 0.3,
    minPhotoSafeHeight: 0.14,
  },
  pregnancy_60: {
    eventSafe: PREGNANCY_PHOTO_SAFE,
    gapMm: 4,
    pageSizeMm: 210,
    sparseMaxLineSlots: 4,
    photoBandMaxBottom: 0.94,
    stackedTwoMinBandHeight: 0.6,
    minFullWidthBandHeight: 0.3,
    minPhotoSafeHeight: 0.14,
  },
  pregnancy_a5: {
    eventSafe: PREGNANCY_PHOTO_SAFE,
    gapMm: 4,
    pageSizeMm: 210,
    sparseMaxLineSlots: 4,
    photoBandMaxBottom: 0.94,
    stackedTwoMinBandHeight: 0.6,
    minFullWidthBandHeight: 0.3,
    minPhotoSafeHeight: 0.14,
  },
  holidays_birthday_60: {
    eventSafe: EVENT_PHOTO_SAFE,
    gapMm: 4,
    pageSizeMm: 210,
    sparseMaxLineSlots: 4,
    photoBandMaxBottom: 0.94,
    stackedTwoMinBandHeight: 0.6,
    minFullWidthBandHeight: 0.3,
    minPhotoSafeHeight: 0.14,
    excludePages: BIRTHDAY_EXCLUDE_PAGES,
  },
  diary_interior_brown: {
    eventSafe: EVENT_PHOTO_SAFE,
    gapMm: 4,
    pageSizeMm: 210,
    sparseMaxLineSlots: 4,
    photoBandMaxBottom: 0.94,
    stackedTwoMinBandHeight: 0.6,
    minFullWidthBandHeight: 0.3,
    minPhotoSafeHeight: 0.14,
  },
  diary_interior_purple: {
    eventSafe: EVENT_PHOTO_SAFE,
    gapMm: 3,
    pageSizeMm: 148,
    sparseMaxLineSlots: 4,
    photoBandMaxBottom: 0.94,
    stackedTwoMinBandHeight: 0.6,
    minFullWidthBandHeight: 0.3,
    minPhotoSafeHeight: 0.14,
  },
  family_blank: {
    eventSafe: BLANK_PAGE_PHOTO_SAFE,
    gapMm: 4,
    pageSizeMm: 210,
    sparseMaxLineSlots: 4,
    photoBandMaxBottom: 0.94,
    stackedTwoMinBandHeight: 0.6,
    minFullWidthBandHeight: 0.3,
    minPhotoSafeHeight: 0.14,
  },
  holidays_blank: {
    eventSafe: BLANK_PAGE_PHOTO_SAFE,
    gapMm: 4,
    pageSizeMm: 210,
    sparseMaxLineSlots: 4,
    photoBandMaxBottom: 0.94,
    stackedTwoMinBandHeight: 0.6,
    minFullWidthBandHeight: 0.3,
    minPhotoSafeHeight: 0.14,
  },
  family_blank_21x21: {
    eventSafe: BLANK_PAGE_PHOTO_SAFE,
    gapMm: 4,
    pageSizeMm: 210,
    sparseMaxLineSlots: 4,
    photoBandMaxBottom: 0.94,
    stackedTwoMinBandHeight: 0.6,
    minFullWidthBandHeight: 0.3,
    minPhotoSafeHeight: 0.14,
  },
};

const PREGNANCY_60_MEMORY = [56, 57, 58, 59];

const HOLIDAYS_AGE_PAGES = [
  4,
  ...Array.from({ length: 17 }, (_, index) => 6 + index * 2),
];

const BIRTHDAY_FREE_PAGES = [
  3,
  5,
  ...Array.from({ length: 17 }, (_, index) => 7 + index * 2),
];

const BIRTHDAY_CAPTION_PAGES = Array.from({ length: 7 }, (_, index) => 41 + index);

const BIRTHDAY_AGE_PHOTO_LAYOUT = {
  variants: [
    {
      variantId: 'one_large',
      slots: [{ x: 0.09, y: 0.75, width: 0.82, height: 0.35, aspectRatio: [4, 3] }],
    },
  ],
};

const BIRTHDAY_HELLO_PHOTO_LAYOUT = {
  variants: [
    {
      variantId: 'one_horizontal',
      slots: [{ x: 0.08, y: 0.515, width: 0.84, height: 0.37, aspectRatio: [4, 3] }],
    },
  ],
};

const MARGIN_X = 0.02;
const MARGIN_Y = 0.03;
const GAP = 0.024;
const FULL_WIDTH = 1 - MARGIN_X * 2;
const COL_WIDTH = (FULL_WIDTH - GAP) / 2;
const COL_X_LEFT = MARGIN_X;
const COL_X_RIGHT = MARGIN_X + COL_WIDTH + GAP;
const STACK_ROW_HEIGHT = (1 - MARGIN_Y * 2 - GAP) / 2;
const GRID_ROW_HEIGHT = (1 - MARGIN_Y * 2 - GAP) / 2;
const THREE_EQUAL_ROW_HEIGHT = (1 - MARGIN_Y * 2 - GAP * 2) / 3;

function rowY(rowIndex, rowHeight) {
  return MARGIN_Y + rowIndex * (rowHeight + GAP);
}

const THREE_HERO_EVENT_SAFE = { x: 0, y: 0, width: 0.84, height: 0.6 };

function buildThreeHeroSlots(safeZone) {
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

function slot(x, y, width, height, aspectRatio) {
  return { x, y, width, height, aspectRatio };
}

const PHOTO_LAYOUT_TEMPLATES = {
  one_large: {
    variantId: 'one_large',
    slots: [slot(MARGIN_X, 0.02, FULL_WIDTH, 0.9, [4, 3])],
  },
  one_horizontal: {
    variantId: 'one_horizontal',
    slots: [slot(MARGIN_X, 0.02, FULL_WIDTH, 0.9, [4, 3])],
  },
  two_photos: {
    variantId: 'two_photos',
    slots: [
      slot(MARGIN_X, rowY(0, STACK_ROW_HEIGHT), FULL_WIDTH, STACK_ROW_HEIGHT, [4, 3]),
      slot(MARGIN_X, rowY(1, STACK_ROW_HEIGHT), FULL_WIDTH, STACK_ROW_HEIGHT, [4, 3]),
    ],
  },
  two_horizontal: {
    variantId: 'two_horizontal',
    slots: [
      slot(MARGIN_X, rowY(0, STACK_ROW_HEIGHT), FULL_WIDTH, STACK_ROW_HEIGHT, [4, 3]),
      slot(MARGIN_X, rowY(1, STACK_ROW_HEIGHT), FULL_WIDTH, STACK_ROW_HEIGHT, [4, 3]),
    ],
  },
  kids_two_stacked: {
    variantId: 'kids_two_stacked',
    slots: [
      slot(MARGIN_X, rowY(0, STACK_ROW_HEIGHT), FULL_WIDTH, STACK_ROW_HEIGHT, [4, 3]),
      slot(MARGIN_X, rowY(1, STACK_ROW_HEIGHT), FULL_WIDTH, STACK_ROW_HEIGHT, [4, 3]),
    ],
  },
  two_vertical: {
    variantId: 'two_vertical',
    slots: [
      slot(COL_X_LEFT, MARGIN_Y, COL_WIDTH, 1 - MARGIN_Y * 2, [3, 4]),
      slot(COL_X_RIGHT, MARGIN_Y, COL_WIDTH, 1 - MARGIN_Y * 2, [3, 4]),
    ],
  },
  three_hero: {
    variantId: 'three_hero',
    slots: buildThreeHeroSlots(THREE_HERO_EVENT_SAFE),
  },
  four_grid: {
    variantId: 'four_grid',
    slots: [
      slot(COL_X_LEFT, rowY(0, GRID_ROW_HEIGHT), COL_WIDTH, GRID_ROW_HEIGHT, [4, 3]),
      slot(COL_X_RIGHT, rowY(0, GRID_ROW_HEIGHT), COL_WIDTH, GRID_ROW_HEIGHT, [4, 3]),
      slot(COL_X_LEFT, rowY(1, GRID_ROW_HEIGHT), COL_WIDTH, GRID_ROW_HEIGHT, [4, 3]),
      slot(COL_X_RIGHT, rowY(1, GRID_ROW_HEIGHT), COL_WIDTH, GRID_ROW_HEIGHT, [4, 3]),
    ],
  },
  four_vertical: {
    variantId: 'four_vertical',
    slots: [
      slot(COL_X_LEFT, rowY(0, GRID_ROW_HEIGHT), COL_WIDTH, GRID_ROW_HEIGHT, [3, 4]),
      slot(COL_X_RIGHT, rowY(0, GRID_ROW_HEIGHT), COL_WIDTH, GRID_ROW_HEIGHT, [3, 4]),
      slot(COL_X_LEFT, rowY(1, GRID_ROW_HEIGHT), COL_WIDTH, GRID_ROW_HEIGHT, [3, 4]),
      slot(COL_X_RIGHT, rowY(1, GRID_ROW_HEIGHT), COL_WIDTH, GRID_ROW_HEIGHT, [3, 4]),
    ],
  },
};

function buildVariantLayoutFromTemplate(template, safeZone) {
  const templateSlots =
    template.variantId === 'three_hero' ? buildThreeHeroSlots(safeZone) : template.slots;

  const slots = templateSlots.map((s) => {
    const absX = safeZone.x + s.x * safeZone.width;
    let absW = s.width * safeZone.width;
    const isSquare = s.aspectRatio?.[0] === 1 && s.aspectRatio?.[1] === 1;
    let absH = isSquare ? Math.min(absW, s.height * safeZone.height) : s.height * safeZone.height;
    if (isSquare) {
      absW = absH;
    }
    const topY = safeZone.y + s.y * safeZone.height;
    const centerY = topY + absH / 2;
    const colOffsetX = isSquare ? (s.width * safeZone.width - absW) / 2 : 0;
    return {
      x: absX + colOffsetX,
      y: centerY,
      width: absW,
      height: absH,
      aspectRatio: s.aspectRatio,
    };
  });
  return { variantId: template.variantId, slots };
}

function buildPageLayoutsFromTemplates(safeZone, templateIds) {
  const variants = templateIds
    .map((id) => PHOTO_LAYOUT_TEMPLATES[id])
    .filter(Boolean)
    .map((t) => buildVariantLayoutFromTemplate(t, safeZone));
  return { variants };
}

function buildHolidaysManualSlots() {
  const slots = {
    2: BIRTHDAY_HELLO_PHOTO_LAYOUT,
  };
  for (const page of HOLIDAYS_AGE_PAGES) {
    slots[String(page)] = BIRTHDAY_AGE_PHOTO_LAYOUT;
  }
  for (const page of BIRTHDAY_FREE_PAGES) {
    slots[String(page)] = buildPageLayoutsFromTemplates(BLANK_PAGE_PHOTO_SAFE, FULL_PHOTO_TEMPLATES);
  }
  for (const page of BIRTHDAY_CAPTION_PAGES) {
    slots[String(page)] = buildPageLayoutsFromTemplates(BLANK_PAGE_PHOTO_SAFE, FULL_PHOTO_TEMPLATES);
  }
  return slots;
}

const MANUAL_PHOTO_SLOTS = {
  pregnancy_60: Object.fromEntries([
    ...PREGNANCY_60_MEMORY.map((p) => [
      String(p),
      buildPageLayoutsFromTemplates(PREGNANCY_MEMORY_PHOTO_SAFE, FULL_PHOTO_TEMPLATES),
    ]),
    ['48', buildPageLayoutsFromTemplates(BLANK_PAGE_PHOTO_SAFE, FULL_PHOTO_TEMPLATES)],
    ['49', buildPageLayoutsFromTemplates(BLANK_PAGE_PHOTO_SAFE, FULL_PHOTO_TEMPLATES)],
  ]),
  pregnancy_a5: {
    '47': buildPageLayoutsFromTemplates(PREGNANCY_PHOTO_SAFE, FULL_PHOTO_TEMPLATES),
    '48': buildPageLayoutsFromTemplates(PREGNANCY_PHOTO_SAFE, FULL_PHOTO_TEMPLATES),
  },
  holidays_birthday_60: buildHolidaysManualSlots(),
  diary_interior_brown: {
    '5': buildPageLayoutsFromTemplates(BLANK_PAGE_PHOTO_SAFE, FULL_PHOTO_TEMPLATES),
  },
};

function slotToSafeZone(s) {
  return {
    x: s.x,
    y: s.y - s.height / 2,
    width: s.width,
    height: s.height,
  };
}

function getSparsePhotoAlbumConfig(lineGuideId) {
  return SPARSE_PHOTO_ALBUM_CONFIG[lineGuideId];
}

function hasSparsePhotoConfig(lineGuideId) {
  return lineGuideId in SPARSE_PHOTO_ALBUM_CONFIG;
}

function usesBlankPagePhotoFallback(lineGuideId) {
  return (
    lineGuideId === 'family_blank' ||
    lineGuideId === 'holidays_blank' ||
    lineGuideId === 'family_blank_21x21'
  );
}

function isPregnancyWeeklyMiddlePage(lineGuideId, page) {
  if (lineGuideId === 'pregnancy_60') {
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

function isPregnancyUpperBandPage(lineGuideId, page) {
  if (lineGuideId === 'pregnancy_60') return page === 54;
  if (lineGuideId === 'pregnancy_a5') return page === 46 || page === 48;
  return false;
}

function prefersPdfPinnedPhotoLayout(lineGuideId, page) {
  if (prefersManualPhotoLayout(lineGuideId, page)) return false;
  if (shouldSkipSparsePhotoExpansion(lineGuideId, page)) return false;
  if (usesBlankPagePhotoFallback(lineGuideId)) return false;
  return hasSparsePhotoConfig(lineGuideId);
}

function prefersManualPhotoLayout(lineGuideId, page) {
  if (lineGuideId === 'pregnancy_60') {
    return page >= 56 && page <= 59;
  }
  return false;
}

function shouldSkipSparsePhotoExpansion(lineGuideId, page) {
  if (prefersManualPhotoLayout(lineGuideId, page)) return true;
  const config = getSparsePhotoAlbumConfig(lineGuideId);
  if (!config) return true;
  if (config.excludePages?.has(page)) return true;
  return false;
}

function classifyPhotoSafeZoneStrategy(lineGuideId, page) {
  if (isPregnancyWeeklyMiddlePage(lineGuideId, page)) return 'weekly_middle';
  if (isPregnancyUpperBandPage(lineGuideId, page)) return 'upper_band';

  const slots = getLineSlots(lineGuideId, page);
  if (!slots.length) return 'photo_only';

  const upperLines = slots.filter((slot) => slot.y < 0.45);
  const lowerLines = slots.filter((slot) => slot.y > 0.65);
  if (upperLines.length > 0 && lowerLines.length > 0) return 'weekly_middle';

  const minTextTop = Math.min(...slots.map((slot) => slot.y - slot.height / 2));
  if (minTextTop > 0.55) return 'upper_band';

  const maxTextBottom = Math.max(...slots.map((slot) => slot.y + slot.height / 2));
  if (maxTextBottom < 0.55) return 'bottom_band';

  return 'mixed';
}

function getLineSlots(lineGuideId, page) {
  return lineSlotsJson[lineGuideId]?.[String(page)] ?? [];
}

function gapNorm(config) {
  return config.gapMm / config.pageSizeMm;
}

function isBottomAnchoredPhotoSlot(primarySlot) {
  return primarySlot.y >= 0.55;
}

function getMaxLineTextBottom(lineGuideId, page) {
  const slots = getLineSlots(lineGuideId, page);
  if (!slots.length) return 0;
  return Math.max(...slots.map((slot) => slot.y + slot.height / 2));
}

function getMinLineTextTop(lineGuideId, page) {
  const slots = getLineSlots(lineGuideId, page);
  if (!slots.length) return 1;
  return Math.min(...slots.map((slot) => slot.y - slot.height / 2));
}

function buildBottomAnchoredPhotoSafeZone(lineGuideId, page, primarySlot, config) {
  const photoTextGap = gapNorm(config);
  const textBottom = getMaxLineTextBottom(lineGuideId, page);
  const slotZone = slotToSafeZone(primarySlot);
  const bandMaxBottom = config.photoBandMaxBottom ?? 0.9;
  const wideX = config.eventSafe.x;
  const wideW = config.eventSafe.width;
  const minHeight = config.minPhotoSafeHeight ?? 0.12;

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

function buildWeeklyMiddlePhotoSafeZone(lineGuideId, page, config) {
  const slots = getLineSlots(lineGuideId, page);
  const photoTextGap = gapNorm(config);
  const minHeight = config.minPhotoSafeHeight ?? 0.12;

  const upperLines = slots.filter((slot) => slot.y < 0.45);
  const lowerLines = slots.filter((slot) => slot.y > 0.65);

  if (!upperLines.length || !lowerLines.length) {
    return constrainPhotoSafeZone(lineGuideId, page, config.eventSafe, config);
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

function buildUpperBandPhotoSafeZone(lineGuideId, page, config) {
  const photoTextGap = gapNorm(config);
  const minTop = 0.12;
  const maxBottom = getMinLineTextTop(lineGuideId, page) - photoTextGap;
  const height = maxBottom - minTop;
  const minHeight = config.minPhotoSafeHeight ?? 0.12;

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

function constrainPhotoSafeZone(lineGuideId, page, safeZone, config) {
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

function buildBandAroundTextBlock(lineGuideId, page, safeZone, config) {
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

  let top;
  let height;

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

function expandVerticalPhotoBand(lineGuideId, page, safeZone, config) {
  const slots = getLineSlots(lineGuideId, page);
  if (!slots.length) return safeZone;

  const upperLines = slots.filter((s) => s.y < 0.45);
  if (upperLines.length === 0 || upperLines.length !== slots.length) return safeZone;

  const photoTextGap = gapNorm(config);
  const maxTextBottom = Math.max(...upperLines.map((s) => s.y + s.height / 2));
  const minTop = Math.max(safeZone.y, maxTextBottom + photoTextGap);
  const maxBottom = Math.min(
    config.photoBandMaxBottom ?? 0.9,
    config.eventSafe.y + config.eventSafe.height + 0.12,
  );
  const height = maxBottom - minTop;

  if (height <= safeZone.height + 0.02) return safeZone;

  return { x: safeZone.x, y: minTop, width: safeZone.width, height };
}

function expandPhotoBandDownToLowerText(lineGuideId, page, safeZone, config) {
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

function applyFullWidthIfSparse(lineGuideId, page, safeZone, config) {
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

function resolveStrategySafeZone(lineGuideId, page, primarySlot, config) {
  const strategy = classifyPhotoSafeZoneStrategy(lineGuideId, page);

  switch (strategy) {
    case 'weekly_middle':
      return buildWeeklyMiddlePhotoSafeZone(lineGuideId, page, config);
    case 'upper_band':
      return buildUpperBandPhotoSafeZone(lineGuideId, page, config);
    case 'bottom_band':
      return buildBottomAnchoredPhotoSafeZone(lineGuideId, page, primarySlot, config);
    case 'photo_only':
      return constrainPhotoSafeZone(lineGuideId, page, BLANK_PAGE_PHOTO_SAFE, config);
    case 'mixed':
      return constrainPhotoSafeZone(lineGuideId, page, config.eventSafe, config);
    default:
      return undefined;
  }
}

function resolveSparsePhotoSafeZone(lineGuideId, page, primarySlot) {
  const config = getSparsePhotoAlbumConfig(lineGuideId);
  if (!config) return slotToSafeZone(primarySlot);

  if (isPregnancyWeeklyMiddlePage(lineGuideId, page)) {
    return buildWeeklyMiddlePhotoSafeZone(lineGuideId, page, config);
  }

  if (isPregnancyUpperBandPage(lineGuideId, page)) {
    return buildUpperBandPhotoSafeZone(lineGuideId, page, config);
  }

  const strategyZone = resolveStrategySafeZone(lineGuideId, page, primarySlot, config);
  if (strategyZone && lineGuideId !== 'kids_48') {
    return strategyZone;
  }

  let safeZone = constrainPhotoSafeZone(lineGuideId, page, slotToSafeZone(primarySlot), config);
  safeZone = expandVerticalPhotoBand(lineGuideId, page, safeZone, config);
  safeZone = expandPhotoBandDownToLowerText(lineGuideId, page, safeZone, config);
  safeZone = applyFullWidthIfSparse(lineGuideId, page, safeZone, config);

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

  const expanded = {
    x: config.eventSafe.x,
    y: top,
    width: config.eventSafe.width,
    height: targetHeight,
  };

  return constrainPhotoSafeZone(lineGuideId, page, expanded, config);
}

function getCollageTemplateSet(lineGuideId) {
  if (hasSparsePhotoConfig(lineGuideId) && !usesBlankPagePhotoFallback(lineGuideId)) {
    return STANDARD_DESIGNED_ALBUM_TEMPLATE_IDS;
  }
  return EVENT_PHOTO_TEMPLATES;
}

function buildStandardDesignedAlbumLayouts(layouts, lineGuideId, page) {
  const primarySlot = layouts.variants[0]?.slots[0];
  if (!primarySlot || primarySlot.height < 0.12 || primarySlot.width < 0.25) {
    return null;
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

  const expanded = buildPageLayoutsFromTemplates(safeZone, [...STANDARD_DESIGNED_ALBUM_TEMPLATE_IDS]);
  if (expanded.variants.length === 0) return null;
  const feasible = filterFeasiblePhotoLayouts(expanded);
  if (!feasible.variants.length) return null;
  return feasible;
}

function twoPhotoTemplateId() {
  return 'two_vertical';
}

function buildTwoHorizontalVariant(_lineGuideId, _page, safeZone) {
  const built = buildPageLayoutsFromTemplates(safeZone, ['two_vertical']);
  const variant = built.variants[0];
  if (!variant) return null;
  return { ...variant, variantId: 'two_vertical' };
}

function applyTwoPhotoLayouts(lineGuideId, page, safeZone, layouts) {
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

function expandDesignedAlbumCollageVariants(lineGuideId, page, layouts) {
  if (shouldSkipSparsePhotoExpansion(lineGuideId, page)) return null;

  const standard = buildStandardDesignedAlbumLayouts(layouts, lineGuideId, page);
  if (standard) {
    return { ...standard, source: 'pdf_standard' };
  }

  const primarySlot = layouts.variants[0]?.slots[0];
  if (!primarySlot || primarySlot.height < 0.12 || primarySlot.width < 0.25) {
    return null;
  }

  const safeZone = resolveSparsePhotoSafeZone(lineGuideId, page, primarySlot);
  const templateSet = getCollageTemplateSet(lineGuideId);
  const expanded = buildPageLayoutsFromTemplates(safeZone, [...templateSet]);
  if (expanded.variants.length === 0) return null;

  return {
    ...applyTwoPhotoLayouts(lineGuideId, page, safeZone, expanded),
    source: 'pdf_expanded',
  };
}

function expandManualSparseLayouts(lineGuideId, page, manual) {
  if (shouldSkipSparsePhotoExpansion(lineGuideId, page)) return null;

  const primarySlot = manual.variants[0]?.slots[0];
  if (!primarySlot) return null;

  const safeZone = resolveSparsePhotoSafeZone(lineGuideId, page, primarySlot);
  const templateSet = getCollageTemplateSet(lineGuideId);
  const expanded = buildPageLayoutsFromTemplates(safeZone, [...templateSet]);
  if (expanded.variants.length <= 1) return null;

  return {
    ...applyTwoPhotoLayouts(lineGuideId, page, safeZone, expanded),
    source: 'manual_expanded',
  };
}

function buildDesignedAlbumEventPhotoLayouts(lineGuideId, page) {
  const config = getSparsePhotoAlbumConfig(lineGuideId);
  const eventSafe = config?.eventSafe ?? EVENT_PHOTO_SAFE;
  const syntheticPrimary = {
    x: eventSafe.x + eventSafe.width / 2,
    y: eventSafe.y + eventSafe.height / 2,
    width: eventSafe.width,
    height: eventSafe.height * 0.85,
  };

  const safeZone = resolveSparsePhotoSafeZone(lineGuideId, page, syntheticPrimary);
  return {
    ...buildPageLayoutsFromTemplates(safeZone, [...STANDARD_DESIGNED_ALBUM_TEMPLATE_IDS]),
    source: 'designed_event',
  };
}

function eventPhotoLayouts() {
  return {
    ...buildPageLayoutsFromTemplates(EVENT_PHOTO_SAFE, EVENT_PHOTO_TEMPLATES),
    source: 'event_fallback',
  };
}

function resolveKidsPhotoPageLayouts(page, pdfAlbum, circlePageRaw) {
  const circleAlbum = normalizeCirclePage(circlePageRaw);
  if (circleAlbum?.variants?.length && page === 5) {
    return circleAlbum;
  }

  const pdf = pdfAlbum?.variants?.length ? pdfAlbum : null;
  const lineGuideId = 'kids_48';

  if (pdf && !shouldSkipSparsePhotoExpansion(lineGuideId, page)) {
    const standard = buildStandardDesignedAlbumLayouts(pdf, lineGuideId, page);
    if (standard) return { ...standard, source: 'pdf_standard' };
    const expanded = expandDesignedAlbumCollageVariants(lineGuideId, page, pdf);
    if (expanded) return expanded;
  }

  if (page === 12 || (page >= 6 && page <= 47 && page !== 5 && page !== 10 && page !== 11)) {
    return buildDesignedAlbumEventPhotoLayouts(lineGuideId, page);
  }

  return null;
}

function normalizeCirclePage(circlePage) {
  if (!circlePage) return null;
  if (circlePage.variants?.length) {
    return { variants: circlePage.variants, source: 'circle' };
  }
  if (circlePage.slots?.length) {
    return {
      variants: [
        {
          variantId: 'tree',
          slots: circlePage.slots.map((s) => ({ ...s, shape: 'circle' })),
        },
      ],
      source: 'circle',
    };
  }
  return null;
}

function manualLayoutsArePlausible(manual) {
  const primarySlot = manual.variants[0]?.slots[0];
  if (!primarySlot) return false;
  return primarySlot.height >= 0.18 && primarySlot.width >= 0.35;
}

function resolveDesignedAlbumLayouts(lineGuideId, page, pdf, manual) {
  if (lineGuideId === 'kids_48') {
    return null;
  }

  if (!hasSparsePhotoConfig(lineGuideId) || usesBlankPagePhotoFallback(lineGuideId)) {
    return null;
  }

  if (pdf?.variants?.length && prefersPdfPinnedPhotoLayout(lineGuideId, page)) {
    const standard = buildStandardDesignedAlbumLayouts(pdf, lineGuideId, page);
    if (standard) return { ...standard, source: 'pdf_standard' };
    return { ...expandCollageVariants(pdf, lineGuideId, page), source: 'pdf' };
  }

  if (pdf?.variants?.length) {
    return expandDesignedAlbumCollageVariants(lineGuideId, page, pdf);
  }

  if (manual?.variants?.length) {
    return expandManualSparseLayouts(lineGuideId, page, manual);
  }

  return null;
}

const PRINT_PHOTO_MARGIN_MM = 10;

function getDefaultPagePhotoBounds(pageSizeMm = 210) {
  const inset = PRINT_PHOTO_MARGIN_MM / pageSizeMm;
  return {
    left: inset,
    top: inset,
    right: 1 - inset,
    bottom: 1 - inset,
  };
}

function clampSlotToBounds(slot, bounds) {
  const maxWidth = bounds.right - bounds.left;
  const maxHeight = bounds.bottom - bounds.top;

  let width = Math.min(slot.width, maxWidth);
  let height = Math.min(slot.height, maxHeight);

  const isSquare = slot.aspectRatio?.[0] === 1 && slot.aspectRatio?.[1] === 1;
  if (isSquare) {
    const side = Math.min(width, height, maxWidth, maxHeight);
    width = side;
    height = side;
  }

  const centerX = Math.min(
    Math.max(slot.x + slot.width / 2, bounds.left + width / 2),
    bounds.right - width / 2,
  );
  const centerY = Math.min(
    Math.max(slot.y, bounds.top + height / 2),
    bounds.bottom - height / 2,
  );

  return {
    ...slot,
    x: centerX - width / 2,
    y: centerY,
    width,
    height,
  };
}

function clampPhotoPageLayoutsToPrintMargins(layouts, pageSizeMm = 210) {
  const bounds = getDefaultPagePhotoBounds(pageSizeMm);
  return {
    ...layouts,
    variants: layouts.variants.map((variant) => ({
      ...variant,
      slots: variant.slots.map((slot) => clampSlotToBounds(slot, bounds)),
    })),
  };
}

function buildDefaultSparseLayouts(lineGuideId, page) {
  if (!hasSparsePhotoConfig(lineGuideId) || shouldSkipSparsePhotoExpansion(lineGuideId, page)) {
    return null;
  }
  if (!usesBlankPagePhotoFallback(lineGuideId)) {
    return null;
  }

  const defaultLayouts = buildPageLayoutsFromTemplates(BLANK_PAGE_PHOTO_SAFE, FULL_PHOTO_TEMPLATES);
  const expanded = expandManualSparseLayouts(lineGuideId, page, defaultLayouts);
  if (expanded) return { ...expanded, source: 'default_sparse' };

  const primarySlot = defaultLayouts.variants[0]?.slots[0];
  if (!primarySlot) return null;

  const safeZone = resolveSparsePhotoSafeZone(lineGuideId, page, primarySlot);
  const templateSet = getCollageTemplateSet(lineGuideId);
  const built = buildPageLayoutsFromTemplates(safeZone, [...templateSet]);
  if (!built.variants.length) return null;

  return {
    ...applyTwoPhotoLayouts(lineGuideId, page, safeZone, built),
    source: 'default_sparse',
  };
}

function resolveAlbumPhotoLayoutsRaw(lineGuideId, page, pdfSlots, circleSlots) {
  const pdfPage = pdfSlots?.[String(page)];
  const circlePage = circleSlots?.[String(page)];
  const manualPage = MANUAL_PHOTO_SLOTS[lineGuideId]?.[String(page)];

  if (lineGuideId === 'kids_48') {
    return resolveKidsPhotoPageLayouts(page, pdfPage, circlePage);
  }

  const circle = normalizeCirclePage(circlePage);
  if (circle?.variants?.length) {
    return circle;
  }

  const designed = resolveDesignedAlbumLayouts(lineGuideId, page, pdfPage, manualPage);
  if (designed) return designed;

  if (pdfPage?.variants?.length) {
    const expandedPdf = expandDesignedAlbumCollageVariants(lineGuideId, page, pdfPage);
    if (expandedPdf) return expandedPdf;
  }

  if (manualPage?.variants?.length) {
    const expanded = expandManualSparseLayouts(lineGuideId, page, manualPage);
    if (expanded) return expanded;
    if (prefersManualPhotoLayout(lineGuideId, page)) {
      return { ...manualPage, source: 'manual' };
    }
  }

  return buildDefaultSparseLayouts(lineGuideId, page);
}

function resolveAlbumPhotoLayouts(lineGuideId, page, pdfSlots, circleSlots) {
  const result = resolveAlbumPhotoLayoutsRaw(lineGuideId, page, pdfSlots, circleSlots);
  if (!result?.variants?.length) return result;
  const config = SPARSE_PHOTO_ALBUM_CONFIG[lineGuideId];
  const pageSizeMm = config?.pageSizeMm ?? 210;
  const feasible = filterFeasiblePhotoLayouts(result);
  if (!feasible.variants.length) return { ...result, variants: [] };
  return {
    ...clampPhotoPageLayoutsToPrintMargins(feasible, pageSizeMm),
    source: result.source,
  };
}

function resolveKids48PhotoLayouts(page, pdfSlots, circleSlots) {
  return resolveAlbumPhotoLayouts('kids_48', page, pdfSlots, circleSlots);
}

module.exports = {
  EVENT_PHOTO_TEMPLATES,
  FULL_PHOTO_TEMPLATES,
  resolveAlbumPhotoLayouts,
  resolveKids48PhotoLayouts,
  buildPageLayoutsFromTemplates,
  resolveSparsePhotoSafeZone,
  prefersManualPhotoLayout,
  hasSparsePhotoConfig,
  classifyPhotoSafeZoneStrategy,
  SPARSE_PHOTO_ALBUM_CONFIG,
};
