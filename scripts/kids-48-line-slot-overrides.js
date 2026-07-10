/**
 * Manual geometry fixes for kids_48 — applied after PDF extraction / manual overrides.
 */

const TEETH_DATE_WIDTH = 0.145;
const TEETH_DATE_COUNT = 20;
const TEETH_LINE_BAND = 0.028;

/**
 * Линованное поле: y = верх полосы, штрих на нижнем крае.
 * Baseline в предпросмотре и PDF совпадает с печатной линией.
 */
const LINE = (x, y, width, height, continuationGroup = 1, extra = {}) => ({
  x,
  y,
  width,
  height,
  hasLabel: false,
  continuationGroup,
  inputKind: 'line',
  lineStrokeAtBottom: true,
  textAnchorTop: true,
  ...extra,
});

/** Дата «первая чистка» — линия справа от подписи. */
const TEETH_FIRST_BRUSHING_SLOT = LINE(0.559, 0.8349, 0.174, TEETH_LINE_BAND, 21);

/** Число зубов в год — узкая полоса между «БЫЛО» и «ЗУБОВ». */
const TEETH_COUNT_SLOT = LINE(0.525, 0.895, 0.058, TEETH_LINE_BAND, 22);

const pdfCircleSlots = require('../constants/generated/pdf-circle-slots.json');

/** Высота полосы имени под кругом; y в слоте = верх полосы (textAnchorTop). */
const FAMILY_TREE_NAME_BAND_HEIGHT = 0.028;
const FAMILY_TREE_NAME_GAP = 0.012;

function getKids48Page5CircleSlots() {
  const pageData = pdfCircleSlots.kids_48?.['5'];
  const treeVariant = pageData?.variants?.find((variant) => variant.variantId === 'tree');
  return treeVariant?.slots ?? pageData?.slots ?? [];
}

/** circle.x/y — центр круга (как в pdf-circle-slots). */
function nameSlotBelowCircle(circle, continuationGroup) {
  const diameter = Math.max(circle.width ?? circle.w, circle.height ?? circle.h);
  const centerX = circle.x;
  const centerY = circle.y;
  const bottomY = centerY + diameter / 2;
  const bandTop = bottomY + FAMILY_TREE_NAME_GAP;
  const width = Math.min(Math.max(diameter * 1.12, 0.14), 0.3);
  const x = Math.max(0.04, Math.min(centerX - width / 2, 0.96 - width));
  return {
    x,
    y: bandTop,
    width,
    height: FAMILY_TREE_NAME_BAND_HEIGHT,
    hasLabel: false,
    continuationGroup,
    inputKind: 'block',
    textAnchorTop: true,
  };
}

function buildPage5FamilyTreeSlots() {
  return getKids48Page5CircleSlots().map((circle, index) =>
    nameSlotBelowCircle(circle, index + 1),
  );
}

function widenTeethSlot(slot) {
  const targetWidth = TEETH_DATE_WIDTH;
  const centerX = slot.x + slot.width / 2;
  const x = Math.max(0.04, Math.min(centerX - targetWidth / 2, 0.96 - targetWidth));
  return {
    ...slot,
    x,
    width: targetWidth,
    inputKind: 'line',
    teethDate: true,
  };
}

function buildPage10TeethSlots(existing) {
  if (!existing?.length) return existing;
  const toothSlots = existing
    .slice(0, TEETH_DATE_COUNT)
    .map(widenTeethSlot);
  return [...toothSlots, TEETH_FIRST_BRUSHING_SLOT, TEETH_COUNT_SLOT];
}

/** Bottom date line on event / caption pages */
function bottomDateLine(continuationGroup = 1) {
  return LINE(0.38, 0.91383, 0.5, TEETH_LINE_BAND, continuationGroup);
}

/** Дата под заголовком («ДАТА» слева, линия до правого поля). */
function topEventDateLine(y, continuationGroup = 1) {
  return LINE(0.38, y, 0.5, TEETH_LINE_BAND, continuationGroup);
}

function captionLineSlot() {
  return LINE(0.12, 0.9, 0.76, 0.032, 1);
}

const PAGE_16_SLOTS = [
  LINE(0.52, 0.21164, 0.38, TEETH_LINE_BAND, 1),
  bottomDateLine(2),
];

const PAGE_18_SLOTS = [
  LINE(0.36, 0.19337, 0.14, TEETH_LINE_BAND, 1),
  bottomDateLine(2),
];

/** Names overlay on photo area — no printed underline on PDF */
const PAGE_21_GODPARENTS_SLOTS = [
  {
    x: 0.1,
    y: 0.5,
    width: 0.38,
    height: 0.04,
    hasLabel: false,
    continuationGroup: 1,
    inputKind: 'block',
  },
  {
    x: 0.52,
    y: 0.5,
    width: 0.38,
    height: 0.04,
    hasLabel: false,
    continuationGroup: 2,
    inputKind: 'block',
  },
];

const PAGE_48_SLOTS = [bottomDateLine(1)];

/**
 * Стр. 3 «Мы ждем тебя» — PDF даёт короткие сегменты линий (~24% ширины).
 * Печатная линия ответа тянется от конца подписи до правого поля (~0.87).
 * y в LINE = верх полосы; штрихи — ручная разметка page_003_design.png.
 */
const PAGE_3_PDR_STROKE_Y = 0.65438;
const PAGE_3_KICKS_STROKE_Y = 0.70937;
const PAGE_3_SLOTS = [
  LINE(0.418, PAGE_3_PDR_STROKE_Y - TEETH_LINE_BAND, 0.455, TEETH_LINE_BAND, 1),
  LINE(0.508, PAGE_3_KICKS_STROKE_Y - TEETH_LINE_BAND, 0.362, TEETH_LINE_BAND, 2),
];

/** kids_48 p8 — штрих «ДАТА» (ручная разметка page_008_300dpi.png). */
const PAGE_8_EVENT_DATE_SLOT = LINE(
  1031 / 2481,
  2223 / 2481 - TEETH_LINE_BAND,
  582 / 2481,
  TEETH_LINE_BAND,
  1,
);

/** Дата внизу страницы (не путать со стр. 8, 9, 20 — отдельная геометрия). */
const EVENT_DATE_PAGES = new Set([
  '14',
  '15',
  '17',
  '19',
  '34',
  '36',
  '37',
  '38',
  '39',
  '40',
]);

const TOP_EVENT_DATE_PAGES = {
  '9': topEventDateLine(0.18584),
  '20': topEventDateLine(0.23648),
};

const CAPTION_PAGES = new Set(['42', '43', '44', '45', '46', '47']);

function slotGuideY(slot) {
  if (slot.teethDate) return slot.y + slot.height;
  if (slot.lineStrokeAtBottom && slot.textAnchorTop) return slot.y + slot.height;
  return slot.y + slot.height / 2;
}

function applyKids48LineSlotOverrides(slotsByPage, guidesByPage) {
  const slots = { ...slotsByPage };
  const guides = { ...guidesByPage };

  slots['5'] = buildPage5FamilyTreeSlots();
  guides['5'] = slots['5'].map(slotGuideY);

  slots['3'] = PAGE_3_SLOTS;
  guides['3'] = PAGE_3_SLOTS.map(slotGuideY);

  if (slots['10']?.length) {
    slots['10'] = buildPage10TeethSlots(slots['10']);
    guides['10'] = slots['10'].map(slotGuideY);
  }

  slots['8'] = [PAGE_8_EVENT_DATE_SLOT];
  guides['8'] = [slotGuideY(PAGE_8_EVENT_DATE_SLOT)];

  for (const page of EVENT_DATE_PAGES) {
    slots[page] = [bottomDateLine(1)];
    guides[page] = slots[page].map(slotGuideY);
  }

  for (const [page, slot] of Object.entries(TOP_EVENT_DATE_PAGES)) {
    slots[page] = [slot];
    guides[page] = [slotGuideY(slot)];
  }

  slots['16'] = PAGE_16_SLOTS;
  guides['16'] = PAGE_16_SLOTS.map(slotGuideY);

  slots['18'] = PAGE_18_SLOTS;
  guides['18'] = PAGE_18_SLOTS.map(slotGuideY);

  slots['21'] = PAGE_21_GODPARENTS_SLOTS;
  guides['21'] = PAGE_21_GODPARENTS_SLOTS.map(slotGuideY);

  for (const page of CAPTION_PAGES) {
    slots[page] = [captionLineSlot()];
    guides[page] = slots[page].map(slotGuideY);
  }

  slots['41'] = [captionLineSlot()];
  guides['41'] = slots['41'].map(slotGuideY);

  slots['48'] = PAGE_48_SLOTS;
  guides['48'] = PAGE_48_SLOTS.map(slotGuideY);

  return { slots, guides };
}

module.exports = {
  applyKids48LineSlotOverrides,
  buildPage5FamilyTreeSlots,
  buildPage10TeethSlots,
};
