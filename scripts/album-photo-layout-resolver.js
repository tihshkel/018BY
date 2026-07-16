/**
 * Pure-JS photo layout resolver for audit scripts.
 * Mirrors utils/resolvePhotoPageLayouts.ts + utils/sparseTextPhotoSafeZone.ts
 */
const lineSlotsJson = require('../constants/line-slots.json');
const pdfPhotoSlotsJson = require('../constants/generated/pdf-photo-slots.json');
const { filterFeasiblePhotoLayouts } = require('./photo-layout-feasibility');

const EVENT_PHOTO_TEMPLATES = [
  'one_horizontal',
  'two_horizontal',
  'two_vertical',
  'three_hero',
  'four_vertical',
];

const STANDARD_DESIGNED_ALBUM_TEMPLATE_IDS = ['one_large', 'two_vertical', 'three_hero', 'four_grid'];
const KIDS_LANDSCAPE_EVENT_TEMPLATE_IDS = [
  'one_large',
  'two_horizontal',
  'three_hero',
  'four_grid',
];
const KIDS_SIDE_BY_SIDE_EVENT_TEMPLATE_IDS = [
  'one_large',
  'two_vertical',
  'three_hero',
  'four_grid',
];

function isKidsSideBySideEventPage(page) {
  return page === 19 || page === 20 || (page >= 22 && page <= 33);
}

const FULL_PHOTO_TEMPLATES = STANDARD_DESIGNED_ALBUM_TEMPLATE_IDS;

const COLLAGE_TEMPLATE_SETS = {
  one_horizontal: ['one_large', 'two_vertical', 'four_grid'],
  one_large: ['one_large', 'two_vertical', 'four_grid'],
  default: ['one_large', 'two_vertical', 'four_grid'],
};

const EVENT_PHOTO_SAFE = { x: 0.05, y: 0.18, width: 0.9, height: 0.64 };
const PREGNANCY_PHOTO_SAFE = { x: 0.08, y: 0.26, width: 0.84, height: 0.5 };
const PREGNANCY_MEMORY_PHOTO_SAFE = { x: 0.08, y: 0.14, width: 0.84, height: 0.52 };
const SPARSE_PHOTO_ZOOM_MARGIN_MM = 15;
const PRINT_PHOTO_MARGIN_MM = 10;

function getBlankPagePhotoSafe(widthMm, heightMm) {
  const left = SPARSE_PHOTO_ZOOM_MARGIN_MM / widthMm;
  const top = SPARSE_PHOTO_ZOOM_MARGIN_MM / heightMm;
  return {
    x: left,
    y: top,
    width: 1 - 2 * left,
    height: 1 - 2 * top,
  };
}

const BLANK_PAGE_PHOTO_SAFE_18X24 = getBlankPagePhotoSafe(180, 240);
const BLANK_PAGE_PHOTO_SAFE_21X21 = getBlankPagePhotoSafe(210, 210);
/** @deprecated Prefer format-specific; kept as 18×24 alias for shared call sites. */
const BLANK_PAGE_PHOTO_SAFE = BLANK_PAGE_PHOTO_SAFE_18X24;

const KIDS_SIDE_BY_SIDE = new Set([
  1, 3, 4, 8, 13, 19, 20, 21,
  22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33,
]);
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
    photoBandMaxBottom: 0.86,
    stackedTwoMinBandHeight: 0.54,
    minFullWidthBandHeight: 0.35,
    minPhotoSafeHeight: 0.12,
  },
  pregnancy_60: {
    eventSafe: PREGNANCY_PHOTO_SAFE,
    gapMm: 4,
    pageSizeMm: 180,
    pageWidthMm: 180,
    pageHeightMm: 240,
    sparseMaxLineSlots: 4,
    photoBandMaxBottom: 0.95,
    stackedTwoMinBandHeight: 0.54,
    minFullWidthBandHeight: 0.35,
    minPhotoSafeHeight: 0.12,
  },
  pregnancy_a5: {
    eventSafe: PREGNANCY_PHOTO_SAFE,
    gapMm: 4,
    pageSizeMm: 210,
    pageWidthMm: 210,
    pageHeightMm: 210,
    sparseMaxLineSlots: 4,
    photoBandMaxBottom: 0.95,
    stackedTwoMinBandHeight: 0.54,
    minFullWidthBandHeight: 0.35,
    minPhotoSafeHeight: 0.12,
  },
  holidays_birthday_60: {
    eventSafe: EVENT_PHOTO_SAFE,
    gapMm: 4,
    pageSizeMm: 210,
    sparseMaxLineSlots: 4,
    photoBandMaxBottom: 0.86,
    stackedTwoMinBandHeight: 0.54,
    minFullWidthBandHeight: 0.35,
    minPhotoSafeHeight: 0.12,
    excludePages: BIRTHDAY_EXCLUDE_PAGES,
  },
  diary_interior_brown: {
    eventSafe: EVENT_PHOTO_SAFE,
    gapMm: 4,
    pageSizeMm: 210,
    sparseMaxLineSlots: 4,
    photoBandMaxBottom: 0.86,
    stackedTwoMinBandHeight: 0.54,
    minFullWidthBandHeight: 0.35,
    minPhotoSafeHeight: 0.12,
  },
  diary_interior_purple: {
    eventSafe: EVENT_PHOTO_SAFE,
    gapMm: 3,
    pageSizeMm: 148,
    sparseMaxLineSlots: 4,
    photoBandMaxBottom: 0.86,
    stackedTwoMinBandHeight: 0.54,
    minFullWidthBandHeight: 0.35,
    minPhotoSafeHeight: 0.12,
  },
  family_blank: {
    eventSafe: BLANK_PAGE_PHOTO_SAFE_18X24,
    gapMm: 4,
    pageSizeMm: 180,
    pageWidthMm: 180,
    pageHeightMm: 240,
    sparseMaxLineSlots: 4,
    photoBandMaxBottom: 1 - SPARSE_PHOTO_ZOOM_MARGIN_MM / 240,
    stackedTwoMinBandHeight: 0.54,
    minFullWidthBandHeight: 0.35,
    minPhotoSafeHeight: 0.12,
  },
  holidays_blank: {
    eventSafe: BLANK_PAGE_PHOTO_SAFE_18X24,
    gapMm: 4,
    pageSizeMm: 180,
    pageWidthMm: 180,
    pageHeightMm: 240,
    sparseMaxLineSlots: 4,
    photoBandMaxBottom: 1 - SPARSE_PHOTO_ZOOM_MARGIN_MM / 240,
    stackedTwoMinBandHeight: 0.54,
    minFullWidthBandHeight: 0.35,
    minPhotoSafeHeight: 0.12,
  },
  family_blank_21x21: {
    eventSafe: BLANK_PAGE_PHOTO_SAFE_21X21,
    gapMm: 4,
    pageSizeMm: 210,
    pageWidthMm: 210,
    pageHeightMm: 210,
    sparseMaxLineSlots: 4,
    photoBandMaxBottom: 1 - SPARSE_PHOTO_ZOOM_MARGIN_MM / 210,
    stackedTwoMinBandHeight: 0.54,
    minFullWidthBandHeight: 0.35,
    minPhotoSafeHeight: 0.12,
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

const MARGIN_X = 0.04;
const MARGIN_Y = 0.04;
const GAP = 0.03;
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
  if (safeZone.height < 0.48) {
    const topH = 0.54;
    const bottomH = Math.max(0.28, 1 - MARGIN_Y * 2 - GAP - topH);
    const topY = MARGIN_Y;
    const bottomY = topY + topH + GAP;
    return [
      slot(MARGIN_X, topY, FULL_WIDTH, topH, [4, 3]),
      slot(COL_X_LEFT, bottomY, COL_WIDTH, bottomH, [1, 1]),
      slot(COL_X_RIGHT, bottomY, COL_WIDTH, bottomH, [1, 1]),
    ];
  }

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
    // Full safe-zone width — PDF pin / eventSafe already include margins.
    slots: [slot(0, 0.03, 1, 0.94, [4, 3])],
  },
  one_horizontal: {
    variantId: 'one_horizontal',
    slots: [slot(0, 0.03, 1, 0.92, [4, 3])],
  },
  two_photos: {
    variantId: 'two_photos',
    slots: [
      slot(0, rowY(0, STACK_ROW_HEIGHT), 1, STACK_ROW_HEIGHT, [4, 3]),
      slot(0, rowY(1, STACK_ROW_HEIGHT), 1, STACK_ROW_HEIGHT, [4, 3]),
    ],
  },
  two_horizontal: {
    variantId: 'two_horizontal',
    slots: [
      slot(0, rowY(0, STACK_ROW_HEIGHT), 1, STACK_ROW_HEIGHT, [4, 3]),
      slot(0, rowY(1, STACK_ROW_HEIGHT), 1, STACK_ROW_HEIGHT, [4, 3]),
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
    slots: null, // runtime: buildFourGridSlots(safeZone)
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

function buildFourGridSlots(safeZone) {
  const marginX = 0.015;
  const marginY = 0.02;
  const gap = 0.022;
  const availW = 1 - marginX * 2;
  const availH = 1 - marginY * 2;

  const colW = (availW - gap) / 2;
  const cellWPage = colW * safeZone.width;
  let cellHRel = (cellWPage * 0.75) / Math.max(safeZone.height, 0.01);

  const neededH = cellHRel * 2 + gap;
  if (neededH > availH) {
    cellHRel = (availH - gap) / 2;
  }

  const gridH = cellHRel * 2 + gap;
  const left = marginX;
  const top = marginY + Math.max(0, (availH - gridH) / 2);
  const right = left + colW + gap;
  const aspectW = cellWPage;
  const aspectH = cellHRel * safeZone.height;
  const aspectRatio = aspectH > 0 && aspectW / aspectH >= 1.45 ? [3, 2] : [4, 3];

  return [
    slot(left, top, colW, cellHRel, aspectRatio),
    slot(right, top, colW, cellHRel, aspectRatio),
    slot(left, top + cellHRel + gap, colW, cellHRel, aspectRatio),
    slot(right, top + cellHRel + gap, colW, cellHRel, aspectRatio),
  ];
}

function buildVariantLayoutFromTemplate(template, safeZone) {
  const templateSlots =
    template.variantId === 'three_hero'
      ? buildThreeHeroSlots(safeZone)
      : template.variantId === 'four_grid'
        ? buildFourGridSlots(safeZone)
        : template.slots;

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
    '46': buildPageLayoutsFromTemplates(PREGNANCY_PHOTO_SAFE, FULL_PHOTO_TEMPLATES),
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
  if (
    (lineGuideId === 'pregnancy_60' || lineGuideId === 'pregnancy_a5') &&
    page === 1
  ) {
    return 'bottom_band';
  }

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

const KIDS_P1_PHOTO_LINE_BAND = 0.028;

function normalizeKids48PhotoConstraintSlot(lineGuideId, page, slot) {
  if (lineGuideId !== 'kids_48' || page !== 1) return slot;
  if (slot.inputKind === 'block') return slot;
  if (slot.height <= KIDS_P1_PHOTO_LINE_BAND + 0.001 && slot.lineStrokeAtBottom) {
    return slot;
  }
  return {
    ...slot,
    y: slot.y - KIDS_P1_PHOTO_LINE_BAND,
    height: KIDS_P1_PHOTO_LINE_BAND,
    textAnchorTop: true,
    lineStrokeAtBottom: true,
  };
}

function getLineSlots(lineGuideId, page) {
  // kids_48 p21: имена крестных следуют за фото — не режут photo safe zone.
  if (lineGuideId === 'kids_48' && page === 21) return [];
  const raw = lineSlotsJson[lineGuideId]?.[String(page)] ?? [];
  if (lineGuideId === 'kids_48' && page === 1) {
    return raw.map((slot) => normalizeKids48PhotoConstraintSlot(lineGuideId, page, slot));
  }
  return raw;
}

function gapNorm(config) {
  return config.gapMm / config.pageSizeMm;
}

function isBottomAnchoredPhotoSlot(primarySlot) {
  return primarySlot.y >= 0.55;
}

/** Band-страницы: не pin к PDF — расширяем layouts в пустоту (в т.ч. mixed с нижней рамкой). */
function shouldExpandSparseBandLayouts(lineGuideId, page, primarySlot) {
  if (isPregnancyUpperBandPage(lineGuideId, page)) return true;
  const strategy = classifyPhotoSafeZoneStrategy(lineGuideId, page);
  if (strategy === 'bottom_band' || strategy === 'upper_band') return true;
  if (strategy === 'mixed' && primarySlot && isBottomAnchoredPhotoSlot(primarySlot)) {
    return true;
  }
  return false;
}

function getMaxLineTextBottom(lineGuideId, page) {
  let slots = getLineSlots(lineGuideId, page);
  if (
    (lineGuideId === 'pregnancy_60' || lineGuideId === 'pregnancy_a5') &&
    page === 1
  ) {
    slots = slots.filter((slot) => slot.y < 0.65);
  }
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
  const minTop = getMaxLineTextBottom(lineGuideId, page) + photoTextGap;
  const fallbackZone = {
    x: config.eventSafe.x,
    y: config.eventSafe.y,
    width: config.eventSafe.width,
    height: config.eventSafe.height,
  };
  const slotZone = primarySlot ? slotToSafeZone(primarySlot) : fallbackZone;
  const heightMm = config.pageHeightMm ?? config.pageSizeMm ?? 210;
  const pageBottom = 1 - SPARSE_PHOTO_ZOOM_MARGIN_MM / heightMm;
  const bandMaxBottom = config.photoBandMaxBottom ?? pageBottom;
  const minHeight = config.minPhotoSafeHeight ?? 0.12;
  const top = minTop;
  // До нижнего поля страницы — не режем по низу узкой PDF-рамки.
  const bottom = Math.min(bandMaxBottom, pageBottom);
  const height = bottom - top;
  if (height < minHeight) {
    return clampSafeZoneToSparseMargins(
      lineGuideId,
      config,
      constrainPhotoSafeZone(lineGuideId, page, slotZone, config),
    );
  }

  return clampSafeZoneToSparseMargins(
    lineGuideId,
    config,
    constrainPhotoSafeZone(
      lineGuideId,
      page,
      { x: config.eventSafe.x, y: top, width: config.eventSafe.width, height },
      config,
    ),
  );
}

function buildUpperBandPhotoSafeZone(lineGuideId, page, config) {
  const photoTextGap = gapNorm(config);
  const heightMm = config.pageHeightMm ?? config.pageSizeMm ?? 210;
  const minTop = SPARSE_PHOTO_ZOOM_MARGIN_MM / heightMm;
  const maxBottom = getMinLineTextTop(lineGuideId, page) - photoTextGap;
  const height = maxBottom - minTop;
  const minHeight = config.minPhotoSafeHeight ?? 0.12;

  if (height < minHeight) {
    return clampSafeZoneToSparseMargins(
      lineGuideId,
      config,
      constrainPhotoSafeZone(lineGuideId, page, config.eventSafe, config),
    );
  }

  return clampSafeZoneToSparseMargins(
    lineGuideId,
    config,
    constrainPhotoSafeZone(
      lineGuideId,
      page,
      { x: config.eventSafe.x, y: minTop, width: config.eventSafe.width, height },
      config,
    ),
  );
}

function clampSafeZoneToSparseMargins(lineGuideId, config, zone) {
  const widthMm = config.pageWidthMm ?? config.pageSizeMm ?? 210;
  const heightMm = config.pageHeightMm ?? config.pageSizeMm ?? 210;
  const leftInset = SPARSE_PHOTO_ZOOM_MARGIN_MM / widthMm;
  const topInset = SPARSE_PHOTO_ZOOM_MARGIN_MM / heightMm;
  const left = Math.max(zone.x, leftInset);
  const top = Math.max(zone.y, topInset);
  const right = Math.min(zone.x + zone.width, 1 - leftInset);
  const bottom = Math.min(zone.y + zone.height, 1 - topInset);
  return {
    x: left,
    y: top,
    width: Math.max(0.01, right - left),
    height: Math.max(0.01, bottom - top),
  };
}

const WEEKLY_PHOTO_LINE_HEIGHT_CAP = 0.045;

function weeklyPhotoConstraintBottom(slot) {
  const height = Math.min(slot.height || 0, WEEKLY_PHOTO_LINE_HEIGHT_CAP);
  if (slot.textAnchorTop || slot.lineStrokeAtBottom) {
    return slot.y + height;
  }
  return slot.y + height / 2;
}

function filterWeeklyPhotoConstraintSlots(lineGuideId, slots, mode = 'layout') {
  return slots.filter((slot, index) => {
    if ((slot.inputKind ?? 'line') === 'block') return false;
    if (lineGuideId === 'pregnancy_60' && index === 5) return false;
    // Zoom/pan: free tall OCR plan overflow so empty underlines above photo are reachable.
    if (mode === 'zoom' && lineGuideId === 'pregnancy_60' && index === 4) return false;
    return true;
  });
}

function buildWeeklyMiddlePhotoSafeZone(lineGuideId, page, config, mode = 'layout') {
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
    return { ...config.eventSafe };
  }

  const isPregnancyWeekly =
    lineGuideId === 'pregnancy_60' || lineGuideId === 'pregnancy_a5';
  const upperBottomFn = isPregnancyWeekly
    ? weeklyPhotoConstraintBottom
    : (slot) =>
        slot.textAnchorTop ? slot.y + slot.height : slot.y + slot.height / 2;

  const minTop = Math.max(...upperLines.map(upperBottomFn)) + photoTextGap;
  const maxBottom =
    Math.min(
      ...lowerLines.map((slot) =>
        slot.textAnchorTop ? slot.y : slot.y - slot.height / 2,
      ),
    ) - photoTextGap;
  const height = maxBottom - minTop;

  if (height < minHeight) {
    return {
      x: config.eventSafe.x,
      y: config.eventSafe.y,
      width: config.eventSafe.width,
      height: Math.max(minHeight, config.eventSafe.height),
    };
  }

  // kids_48 p1: высота — полоса имя↔анкета; ширина — PDF-пин; поля ≥1.5 см.
  if (lineGuideId === 'kids_48' && page === 1) {
    const pdfSlot = pdfPhotoSlotsJson?.[lineGuideId]?.[String(page)]?.variants?.[0]?.slots?.[0];
    const band = pdfSlot
      ? { x: pdfSlot.x, y: minTop, width: pdfSlot.width, height }
      : { x: config.eventSafe.x, y: minTop, width: config.eventSafe.width, height };
    return clampSafeZoneToSparseMargins(lineGuideId, config, band);
  }

  const pdfSlot = pdfPhotoSlotsJson?.[lineGuideId]?.[String(page)]?.variants?.[0]?.slots?.[0];

  // Недели pregnancy: полная полоса между текстом; PDF только для x/width.
  if (isPregnancyWeekly) {
    const tightGap = photoTextGap * 0.35;
    const hardTop = Math.max(...upperLines.map(weeklyPhotoConstraintBottom)) + tightGap;
    const hardBottom =
      Math.min(
        ...lowerLines.map((slot) =>
          slot.textAnchorTop ? slot.y : slot.y - slot.height / 2,
        ),
      ) - tightGap;
    const y = Math.min(hardTop, minTop);
    const bottom = Math.max(hardBottom, maxBottom);
    return {
      x: pdfSlot?.x ?? config.eventSafe.x,
      y,
      width: pdfSlot?.width ?? config.eventSafe.width,
      height: Math.max(minHeight, bottom - y),
    };
  }

  if (pdfSlot) {
    const pdfZone = slotToSafeZone(pdfSlot);
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

function getLineSlotTop(slot) {
  return slot.textAnchorTop ? slot.y : slot.y - slot.height / 2;
}

function getLineSlotBottom(slot) {
  return slot.textAnchorTop ? slot.y + slot.height : slot.y + slot.height / 2;
}

function getPhotoConstraintSlots(lineGuideId, page) {
  let slots = getLineSlots(lineGuideId, page);
  if (
    (lineGuideId === 'pregnancy_60' || lineGuideId === 'pregnancy_a5') &&
    page === 1
  ) {
    slots = slots.filter((slot) => slot.y < 0.65);
  }
  return slots;
}

function constrainPhotoSafeZone(lineGuideId, page, safeZone, config) {
  const slots = getPhotoConstraintSlots(lineGuideId, page);
  if (!slots.length) return safeZone;

  const photoTextGap = gapNorm(config);
  const minHeight = config.minPhotoSafeHeight ?? 0.12;
  const isPregnancyIntro =
    (lineGuideId === 'pregnancy_60' || lineGuideId === 'pregnancy_a5') && page === 1;

  let minTop = safeZone.y;
  let maxBottom = safeZone.y + safeZone.height;

  for (const slot of slots) {
    const top = getLineSlotTop(slot);
    const bottom = getLineSlotBottom(slot);
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
      return constrainPhotoSafeZone(lineGuideId, page, config.eventSafe, config);
    case 'mixed':
      if (isBottomAnchoredPhotoSlot(primarySlot)) {
        return buildBottomAnchoredPhotoSafeZone(lineGuideId, page, primarySlot, config);
      }
      return constrainPhotoSafeZone(lineGuideId, page, config.eventSafe, config);
    default:
      return undefined;
  }
}

function resolveSparsePhotoSafeZone(lineGuideId, page, primarySlot) {
  const config = getSparsePhotoAlbumConfig(lineGuideId);
  if (!config) return slotToSafeZone(primarySlot);

  if (isPregnancyWeeklyMiddlePage(lineGuideId, page)) {
    return buildWeeklyMiddlePhotoSafeZone(lineGuideId, page, config, 'layout');
  }

  if (isPregnancyUpperBandPage(lineGuideId, page)) {
    return buildUpperBandPhotoSafeZone(lineGuideId, page, config);
  }

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

  const expanded = {
    x: config.eventSafe.x,
    y: top,
    width: config.eventSafe.width,
    height: targetHeight,
  };

  return constrainPhotoSafeZone(lineGuideId, page, expanded, config);
}

function resolveSparsePhotoZoomSafeZone(lineGuideId, page) {
  const config = getSparsePhotoAlbumConfig(lineGuideId);
  const bounds = getSparsePhotoZoomBounds(lineGuideId);
  const baseZone = {
    x: bounds.left,
    y: bounds.top,
    width: bounds.right - bounds.left,
    height: bounds.bottom - bounds.top,
  };

  if (!config) return baseZone;

  if (isPregnancyWeeklyMiddlePage(lineGuideId, page)) {
    return buildWeeklyMiddlePhotoSafeZone(lineGuideId, page, config, 'zoom');
  }

  if (isPregnancyUpperBandPage(lineGuideId, page)) {
    const upper = buildUpperBandPhotoSafeZone(lineGuideId, page, config);
    return constrainPhotoSafeZone(lineGuideId, page, upper, config);
  }

  return constrainPhotoSafeZone(lineGuideId, page, baseZone, config);
}

function getCollageTemplateSet(lineGuideId) {
  if (hasSparsePhotoConfig(lineGuideId) && !usesBlankPagePhotoFallback(lineGuideId)) {
    return STANDARD_DESIGNED_ALBUM_TEMPLATE_IDS;
  }
  return EVENT_PHOTO_TEMPLATES;
}

function buildStandardDesignedAlbumLayouts(layouts) {
  const primarySlot = layouts.variants[0]?.slots[0];
  if (!primarySlot || primarySlot.height < 0.12 || primarySlot.width < 0.25) {
    return null;
  }

  const safeZone = slotToSafeZone(primarySlot);
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

  const primarySlot = layouts.variants[0]?.slots[0];
  const expandBand = shouldExpandSparseBandLayouts(lineGuideId, page, primarySlot);

  // Weekly и band: строим из resolveSparsePhotoSafeZone. Остальные — pin к PDF.
  if (!isPregnancyWeeklyMiddlePage(lineGuideId, page) && !expandBand) {
    const standard = buildStandardDesignedAlbumLayouts(layouts);
    if (standard) {
      return { ...standard, source: 'pdf_standard' };
    }
  }

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

function buildDesignedAlbumEventPhotoLayouts(
  lineGuideId,
  page,
  templateIds = STANDARD_DESIGNED_ALBUM_TEMPLATE_IDS,
) {
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
    ...buildPageLayoutsFromTemplates(safeZone, [...templateIds]),
    source: 'designed_event',
  };
}

function isPortraitPhotoPin(slot) {
  if (!slot) return false;
  return slot.height >= slot.width * 1.05;
}

function buildKidsLandscapeEventPhotoLayouts(page) {
  return buildDesignedAlbumEventPhotoLayouts(
    'kids_48',
    page,
    isKidsSideBySideEventPage(page)
      ? KIDS_SIDE_BY_SIDE_EVENT_TEMPLATE_IDS
      : KIDS_LANDSCAPE_EVENT_TEMPLATE_IDS,
  );
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

  if (shouldSkipSparsePhotoExpansion(lineGuideId, page)) {
    return null;
  }

  if (page === 1) {
    return buildKidsLandscapeEventPhotoLayouts(page);
  }

  if (pdf) {
    const primarySlot = pdf.variants[0]?.slots[0];
    if (isPortraitPhotoPin(primarySlot)) {
      return buildKidsLandscapeEventPhotoLayouts(page);
    }
    const standard = buildStandardDesignedAlbumLayouts(pdf);
    if (standard) return { ...standard, source: 'pdf_standard' };
    const expanded = expandDesignedAlbumCollageVariants(lineGuideId, page, pdf);
    if (expanded) return expanded;
  }

  if (page === 12 || (page >= 6 && page <= 47 && page !== 5 && page !== 10 && page !== 11)) {
    return buildKidsLandscapeEventPhotoLayouts(page);
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

  if (
    pdf?.variants?.length &&
    prefersPdfPinnedPhotoLayout(lineGuideId, page) &&
    !isPregnancyWeeklyMiddlePage(lineGuideId, page)
  ) {
    const primarySlot = pdf.variants[0]?.slots[0];
    if (shouldExpandSparseBandLayouts(lineGuideId, page, primarySlot)) {
      const expanded = expandDesignedAlbumCollageVariants(lineGuideId, page, pdf);
      if (expanded) return expanded;
    }
    const standard = buildStandardDesignedAlbumLayouts(pdf);
    if (standard) return { ...standard, source: 'pdf_standard' };
    return { ...expandCollageVariants(pdf, lineGuideId, page), source: 'pdf' };
  }

  if (pdf?.variants?.length) {
    return expandDesignedAlbumCollageVariants(lineGuideId, page, pdf);
  }

  if (manual?.variants?.length) {
    const primarySlot = manual.variants[0]?.slots[0];
    if (shouldExpandSparseBandLayouts(lineGuideId, page, primarySlot)) {
      const expanded = expandDesignedAlbumCollageVariants(lineGuideId, page, manual);
      if (expanded) return expanded;
    }
    const expanded = expandManualSparseLayouts(lineGuideId, page, manual);
    if (expanded) return expanded;
    return { ...manual, source: 'manual' };
  }

  return null;
}

function isBlankPrintAlbum(lineGuideId) {
  return (
    lineGuideId === 'family_blank' ||
    lineGuideId === 'family_blank_21x21' ||
    lineGuideId === 'holidays_blank'
  );
}

function usesSparsePhotoZoomMargins(lineGuideId) {
  return (
    lineGuideId === 'pregnancy_60' ||
    lineGuideId === 'pregnancy_a5' ||
    lineGuideId === 'kids_48'
  );
}

function usesFifteenMmPhotoMargins(lineGuideId) {
  return usesSparsePhotoZoomMargins(lineGuideId) || isBlankPrintAlbum(lineGuideId);
}

function getAlbumPageSizeMm(lineGuideId) {
  const config = SPARSE_PHOTO_ALBUM_CONFIG[lineGuideId];
  if (lineGuideId === 'pregnancy_60') {
    return { widthMm: 180, heightMm: 240 };
  }
  if (config?.pageWidthMm != null && config?.pageHeightMm != null) {
    return { widthMm: config.pageWidthMm, heightMm: config.pageHeightMm };
  }
  const side = config?.pageSizeMm ?? 210;
  return { widthMm: side, heightMm: side };
}

function getDefaultPagePhotoBounds(pageWidthMm = 210, pageHeightMm) {
  const heightMm = pageHeightMm ?? pageWidthMm;
  const insetW = PRINT_PHOTO_MARGIN_MM / pageWidthMm;
  const insetH = PRINT_PHOTO_MARGIN_MM / heightMm;
  return {
    left: insetW,
    top: insetH,
    right: 1 - insetW,
    bottom: 1 - insetH,
  };
}

function getSparsePhotoZoomBounds(lineGuideId) {
  const { widthMm, heightMm } = getAlbumPageSizeMm(lineGuideId);
  const left = SPARSE_PHOTO_ZOOM_MARGIN_MM / widthMm;
  const top = SPARSE_PHOTO_ZOOM_MARGIN_MM / heightMm;
  return {
    left,
    top,
    right: 1 - left,
    bottom: 1 - top,
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

  const isCircle = slot.shape === 'circle';
  if (isCircle) {
    let centerX = slot.x;
    let centerY = slot.y;
    centerX = Math.min(
      Math.max(centerX, bounds.left + width / 2),
      bounds.right - width / 2,
    );
    centerY = Math.min(
      Math.max(centerY, bounds.top + height / 2),
      bounds.bottom - height / 2,
    );
    return { ...slot, x: centerX, y: centerY, width, height };
  }

  // Keep left edge when shrinking — avoid re-centering that shifts photos right.
  let x = slot.x;
  if (x < bounds.left) x = bounds.left;
  if (x + width > bounds.right) x = bounds.right - width;
  if (x < bounds.left) {
    x = bounds.left;
    width = maxWidth;
  }

  const centerY = Math.min(
    Math.max(slot.y, bounds.top + height / 2),
    bounds.bottom - height / 2,
  );

  return {
    ...slot,
    x,
    y: centerY,
    width,
    height,
  };
}

function clampPhotoPageLayoutsToPrintMargins(layouts, lineGuideIdOrSizeMm = 210) {
  const bounds =
    typeof lineGuideIdOrSizeMm === 'string'
      ? usesFifteenMmPhotoMargins(lineGuideIdOrSizeMm)
        ? getSparsePhotoZoomBounds(lineGuideIdOrSizeMm)
        : (() => {
            const size = getAlbumPageSizeMm(lineGuideIdOrSizeMm);
            return getDefaultPagePhotoBounds(size.widthMm, size.heightMm);
          })()
      : getDefaultPagePhotoBounds(lineGuideIdOrSizeMm);
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
  const feasible = filterFeasiblePhotoLayouts(result);
  if (!feasible.variants.length) return { ...result, variants: [] };
  return {
    ...clampPhotoPageLayoutsToPrintMargins(feasible, lineGuideId),
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
  resolveSparsePhotoZoomSafeZone,
  prefersManualPhotoLayout,
  hasSparsePhotoConfig,
  classifyPhotoSafeZoneStrategy,
  SPARSE_PHOTO_ALBUM_CONFIG,
};
