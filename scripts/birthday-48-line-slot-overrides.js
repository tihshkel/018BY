/**
 * Line-slot overrides for holidays_birthday_60 (48-page 21×21 «Дни рождения»).
 * OCR from the legacy 60-page PDF does not match the new 48-page TZ map.
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

/** Page 1 — owner name on the central line inside the decorative area. */
const OWNER_PAGE_SLOTS = [
  BLOCK(0, 0.16676, 0.6869, 0.04014, 1),
  BLOCK(0.23482, 0.59148, 0.53319, 0.065, 2),
  BLOCK(0.18359, 0.76974, 0.59469, 0.065, 3),
];

/** Age main pages — title block + weight + height (+ teeth on page 4). */
const AGE_MAIN_PAGE_SLOTS = [
  BLOCK(0.3148, 0.0965, 0.3739, 0.065, 1),
  BLOCK(0.22646, 0.27896, 0.13979, 0.04381, 2),
  BLOCK(0.43062, 0.27896, 0.13979, 0.04381, 3),
  BLOCK(0.63479, 0.27896, 0.13979, 0.04381, 4),
];

/** Intro free page (p3) — two short fields at the bottom. */
const INTRO_FREE_PAGE_SLOTS = [
  BLOCK(0.21457, 0.90492, 0.25884, 0.04381, 1),
  BLOCK(0.65722, 0.90492, 0.25884, 0.04381, 2),
];

/** Year/travel free pages — wide bottom text bands. */
const YEAR_FREE_PAGE_SLOTS = [
  BLOCK(0.31124, 0.82789, 0.62859, 0.03724, 1),
  BLOCK(0.0625, 0.88178, 0.87732, 0.03724, 2),
  BLOCK(0.22484, 0.93567, 0.71499, 0.03724, 3),
];

/** Page 5 — three custom fields at the bottom. */
const FREE_PAGE_5_SLOTS = [
  BLOCK(0.0625, 0.802, 0.87732, 0.036, 1),
  BLOCK(0.0625, 0.842, 0.87732, 0.036, 2),
  BLOCK(0.0625, 0.882, 0.87732, 0.036, 3),
  BLOCK(0.22484, 0.922, 0.71499, 0.036, 4),
];

/** Page 40 — travel summary fields in the lower part of the page. */
const TRAVEL_MAP_PAGE_SLOTS = [
  BLOCK(0.62, 0.752, 0.12, 0.04, 1),
  BLOCK(0.0625, 0.802, 0.87732, 0.036, 2),
  BLOCK(0.0625, 0.842, 0.87732, 0.036, 3),
  BLOCK(0.0625, 0.882, 0.87732, 0.036, 4),
  BLOCK(0.0625, 0.912, 0.87732, 0.036, 5),
  BLOCK(0.0625, 0.942, 0.87732, 0.036, 6),
];

/** Page 48 — letter lines (from legacy PDF page 60, first 12 rows). */
const LETTER_PAGE_SLOTS = [
  BLOCK(0.10433, 0.23893, 0.79238, 0.04263, 1),
  BLOCK(0.10433, 0.28156, 0.79238, 0.04268, 1),
  BLOCK(0.10433, 0.32429, 0.79238, 0.04268, 1),
  BLOCK(0.10433, 0.36692, 0.79238, 0.04229, 1),
  BLOCK(0.10433, 0.40886, 0.79238, 0.04208, 1),
  BLOCK(0.10433, 0.45107, 0.79238, 0.04242, 1),
  BLOCK(0.10433, 0.4937, 0.79238, 0.04268, 1),
  BLOCK(0.10433, 0.53642, 0.79238, 0.04268, 1),
  BLOCK(0.10433, 0.57905, 0.79238, 0.04229, 1),
  BLOCK(0.10433, 0.621, 0.79238, 0.04195, 1),
  BLOCK(0.10433, 0.66337, 0.79238, 0.04255, 1),
  BLOCK(0.10433, 0.70609, 0.79238, 0.04273, 1),
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
    case 3:
      return INTRO_FREE_PAGE_SLOTS;
    case 4:
      return AGE_MAIN_PAGE_SLOTS;
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
    return AGE_MAIN_PAGE_SLOTS;
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
