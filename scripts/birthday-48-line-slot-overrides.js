/**
 * Line-slot overrides for holidays_birthday_60 (48-page 21×21 «Дни рождения»).
 * OCR from the legacy 60-page PDF does not match the new 48-page TZ map.
 *
 * BLOCK(x, y, …): y is the vertical CENTER of the white pill
 * (runtime maps top = y − height/2). Geometry from PNG assets — iOS e24a739.
 */

const BLOCK = (x, y, width, height, continuationGroup = 1) => ({
  x,
  y,
  width,
  height,
  hasLabel: false,
  inputKind: 'block',
  continuationGroup,
});

/** Lined text row — `strokeY` is the printed rule; band sits above it. */
const LINE = (x, strokeY, width, height, continuationGroup = 1) => ({
  x,
  y: Number((strokeY - height).toFixed(5)),
  width,
  height,
  hasLabel: false,
  inputKind: 'line',
  continuationGroup,
  lineStrokeAtBottom: true,
});

const PILL_H = 0.0459;
const OWNER_NAME_LINE_H = 0.045;

/** Page 2 — «Привет, мир!»: 4 top pills + place-of-birth pill. */
const HELLO_WORLD_PAGE_SLOTS = [
  BLOCK(0.0593, 0.3125, 0.2547, PILL_H, 1),
  BLOCK(0.3394, 0.3125, 0.2152, PILL_H, 2),
  BLOCK(0.5847, 0.3125, 0.163, PILL_H, 3),
  BLOCK(0.7745, 0.3125, 0.1614, PILL_H, 4),
  BLOCK(0.2555, 0.9059, 0.6756, PILL_H, 5),
];

/** Page 1 — owner name sits on the printed line in the peach blob. */
const OWNER_PAGE_SLOTS = [
  BLOCK(0, 0.16676, 0.6869, 0.04014, 1),
  LINE(0.23482, 0.589, 0.53319, OWNER_NAME_LINE_H, 2),
  BLOCK(0.18359, 0.76974, 0.59469, 0.065, 3),
];

/** Printed title band placeholder (not a form field — fields start at slot 1). */
const AGE_TITLE_SLOT = BLOCK(0.3148, 0.0965, 0.3739, 0.065, 1);

/**
 * Page 4 / asset 6 — «Мне 1 годик»: three pills (вес / рост / зубы).
 */
const AGE_ONE_YEAR_PAGE_SLOTS = [
  AGE_TITLE_SLOT,
  BLOCK(0.2191, 0.2828, 0.1614, PILL_H, 2),
  BLOCK(0.4201, 0.2828, 0.1614, PILL_H, 3),
  BLOCK(0.6195, 0.2828, 0.1614, PILL_H, 4),
];

/**
 * Logical age page (6–38 even) — white-pill center Y from matching PNG asset
 * (asset = logical + 2). X/width are shared for ages 2–18.
 */
const AGE_YEAR_PILL_CENTER_Y = {
  6: 0.2725,
  8: 0.2749,
  10: 0.2725,
  12: 0.2766,
  14: 0.2701,
  16: 0.2717,
  18: 0.2638,
  20: 0.2725,
  22: 0.2688,
  24: 0.2607,
  26: 0.2579,
  28: 0.2646,
  30: 0.2607,
  32: 0.2638,
  34: 0.2638,
  36: 0.2669,
  38: 0.2646,
};

function buildAgeYearPageSlots(logicalPage) {
  const cy = AGE_YEAR_PILL_CENTER_Y[logicalPage] ?? 0.268;
  return [
    AGE_TITLE_SLOT,
    BLOCK(0.322, cy, 0.1614, PILL_H, 2),
    BLOCK(0.5166, cy, 0.1614, PILL_H, 3),
  ];
}

/** Intro free page (p3) — hair / eye color pills. */
const INTRO_FREE_PAGE_SLOTS = [
  BLOCK(0.2081, 0.8972, 0.2785, PILL_H, 1),
  BLOCK(0.6416, 0.8972, 0.2785, PILL_H, 2),
];

/** Year free pages (odd 7–39) — three bottom caption pills. */
const YEAR_FREE_PAGE_SLOTS = [
  BLOCK(0.303, 0.8212, 0.6408, 0.038, 1),
  BLOCK(0.0578, 0.8742, 0.8861, 0.0364, 2),
  BLOCK(0.2176, 0.9272, 0.7263, 0.038, 3),
];

/** Page 5 — free page after «1 годик» (same caption band geometry). */
const FREE_PAGE_5_SLOTS = [
  BLOCK(0.303, 0.8212, 0.6408, 0.038, 1),
  BLOCK(0.0578, 0.8742, 0.8861, 0.0364, 2),
  BLOCK(0.2176, 0.9272, 0.7263, 0.038, 3),
];

/**
 * Page 40 — «Мои путешествия» (asset page_042).
 * BLOCK y = vertical CENTER of the peach pill.
 *   1) short pill between «ПОСЕТИЛ(А)» / «СТРАН»
 *   2–3) memory pills under «МНЕ БОЛЬШЕ ВСЕГО ПОНРАВИЛОСЬ В»
 */
const TRAVEL_MAP_PAGE_SLOTS = [
  BLOCK(0.4573, 0.8463, 0.1748, 0.0392, 1),
  BLOCK(0.4241, 0.894, 0.5233, 0.0396, 2),
  BLOCK(0.0605, 0.9458, 0.8869, 0.0396, 2),
];

/** Page 48 — letter lines (stroke Y from PDF page 60). */
const LETTER_PAGE_SLOTS = [
  LINE(0.10433, 0.23893, 0.79238, 0.04263, 1),
  LINE(0.10433, 0.28156, 0.79238, 0.04268, 1),
  LINE(0.10433, 0.32429, 0.79238, 0.04268, 1),
  LINE(0.10433, 0.36692, 0.79238, 0.04229, 1),
  LINE(0.10433, 0.40886, 0.79238, 0.04208, 1),
  LINE(0.10433, 0.45107, 0.79238, 0.04242, 1),
  LINE(0.10433, 0.4937, 0.79238, 0.04268, 1),
  LINE(0.10433, 0.53642, 0.79238, 0.04268, 1),
  LINE(0.10433, 0.57905, 0.79238, 0.04229, 1),
  LINE(0.10433, 0.621, 0.79238, 0.04195, 1),
  LINE(0.10433, 0.66337, 0.79238, 0.04255, 1),
  LINE(0.10433, 0.70609, 0.79238, 0.04273, 1),
];

function isBirthdayAgeMainPage(pageNumber) {
  if (pageNumber === 4) return true;
  return pageNumber >= 6 && pageNumber <= 38 && pageNumber % 2 === 0;
}

function isBirthdayIntroFreePage(pageNumber) {
  return pageNumber === 3;
}

function isBirthdayYearFreePage(pageNumber) {
  if (pageNumber === 5) return false;
  if (pageNumber >= 7 && pageNumber <= 39 && pageNumber % 2 === 1) return true;
  return false;
}

function isTravelPhotoPage(pageNumber) {
  return pageNumber >= 41 && pageNumber <= 47;
}

/**
 * Returns manual slot overrides for pages that must not rely on legacy OCR.
 */
function getBirthday48LineSlotOverrides(pageNumber) {
  switch (pageNumber) {
    case 1:
      return OWNER_PAGE_SLOTS;
    case 2:
      return HELLO_WORLD_PAGE_SLOTS;
    case 3:
      return INTRO_FREE_PAGE_SLOTS;
    case 4:
      return AGE_ONE_YEAR_PAGE_SLOTS;
    case 5:
      return FREE_PAGE_5_SLOTS;
    case 40:
      return TRAVEL_MAP_PAGE_SLOTS;
    case 48:
      return LETTER_PAGE_SLOTS;
    default:
      break;
  }

  if (isBirthdayAgeMainPage(pageNumber)) {
    return buildAgeYearPageSlots(pageNumber);
  }
  if (isBirthdayIntroFreePage(pageNumber)) {
    return INTRO_FREE_PAGE_SLOTS;
  }
  if (isBirthdayYearFreePage(pageNumber)) {
    return YEAR_FREE_PAGE_SLOTS;
  }
  if (isTravelPhotoPage(pageNumber)) {
    return [];
  }
  return null;
}

/**
 * Trim legacy 60-page OCR output to the 48-page TZ map and apply overrides.
 */
function applyBirthday48LineSlots(slotsByPage, guidesByPage) {
  const trimmedSlots = {};
  const trimmedGuides = {};

  for (let pageNumber = 1; pageNumber <= 48; pageNumber += 1) {
    const pageKey = String(pageNumber);
    const override = getBirthday48LineSlotOverrides(pageNumber);
    const slots = override ?? slotsByPage[pageKey] ?? [];
    trimmedSlots[pageKey] = slots;
    trimmedGuides[pageKey] = slots.map((slot) => slot.y);
  }

  return { slots: trimmedSlots, guides: trimmedGuides };
}

module.exports = {
  applyBirthday48LineSlots,
  getBirthday48LineSlotOverrides,
};
