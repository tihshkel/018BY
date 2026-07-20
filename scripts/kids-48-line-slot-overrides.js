/**
 * Manual geometry fixes for kids_48 — applied after PDF extraction / manual overrides.
 */

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

/**
 * Штрихи дат зубов — design_previews/page_010_design.png (1191²).
 * width чуть шире печатной черты (~0.12), чтобы «ДД.ММ.ГГГГ» не обрезался.
 * Left: старт у внешнего края черты + сдвиг вправо к кругу; right: от начала черты вправо.
 * Порядок слотов 0–19 как в PDF/OCR (пары L/R по рядам).
 */
const TEETH_DATE_TARGET_WIDTH = 0.165;
/** Сдвиг левых дат вправо (ближе к кругу), без урезания года. */
const TEETH_LEFT_DATE_SHIFT = 0.016;
const teethLeft = (x, y) => ({
  x: x + TEETH_LEFT_DATE_SHIFT,
  y,
  width: TEETH_DATE_TARGET_WIDTH,
});
const teethRight = (x, y) => ({
  x,
  y,
  width: TEETH_DATE_TARGET_WIDTH,
});
const TEETH_DATE_SLOTS = [
  // upper y≈0.246
  teethRight(0.5189, 0.246), // 0 right
  teethLeft(0.3804, 0.246), // 1 left
  // upper y≈0.283
  teethLeft(0.314, 0.283), // 2 left
  teethRight(0.5869, 0.283), // 3 right
  // upper y≈0.3207
  teethLeft(0.2754, 0.3207), // 4 left
  teethRight(0.6255, 0.3207), // 5 right
  // upper y≈0.3594
  teethLeft(0.2519, 0.3594), // 6 left
  teethRight(0.6482, 0.3594), // 7 right
  // upper y≈0.4022
  teethLeft(0.2385, 0.4022), // 8 left
  teethRight(0.6616, 0.4022), // 9 right
  // lower y≈0.5416 / 0.5441
  teethLeft(0.2385, 0.5416), // 10 left
  teethRight(0.6625, 0.5441), // 11 right
  // lower y≈0.5827 / 0.5844
  teethLeft(0.2536, 0.5827), // 12 left
  teethRight(0.6474, 0.5844), // 13 right
  // lower y≈0.6205 / 0.6222
  teethLeft(0.2771, 0.6205), // 14 left
  teethRight(0.6238, 0.6222), // 15 right
  // lower y≈0.6599 / 0.6616
  teethLeft(0.3107, 0.6599), // 16 left
  teethRight(0.5877, 0.6616), // 17 right
  // lower y≈0.7003
  teethRight(0.5197, 0.7003), // 18 right
  teethLeft(0.3812, 0.7003), // 19 left
];

/** Дата «первая чистка» — underline справа от подписи (0.558–0.732). */
const TEETH_FIRST_BRUSHING_STROKE_Y = 0.838;
const TEETH_FIRST_BRUSHING_SLOT = LINE(
  0.5584,
  TEETH_FIRST_BRUSHING_STROKE_Y - TEETH_LINE_BAND,
  0.1738,
  TEETH_LINE_BAND,
  21,
);

/** Число зубов — короткая черта между «БЫЛО» и «ЗУБОВ» (0.525–0.577). */
const TEETH_COUNT_STROKE_Y = 0.8975;
const TEETH_COUNT_SLOT = LINE(
  0.5248,
  TEETH_COUNT_STROKE_Y - TEETH_LINE_BAND,
  0.052,
  TEETH_LINE_BAND,
  22,
);

/**
 * Подписи под всеми 15 кругами дерева.
 * Геометрия от центров фото (pdf-circle-slots / kids_48_p5.json):
 * baseline (штрих) ≈ bottom круга + 0.008, полоса выше штриха.
 * inputKind line + lineStrokeAtBottom — имя сидит на линии под фото.
 */
function buildPage5FamilyTreeSlots() {
  const BAND = 0.028;
  const GAP_BELOW_CIRCLE = 0.008;
  /** [cx, circleBottom, width] — центр и низ круга, ширина имени */
  const SPECS = [
    [0.512, 0.315, 0.124], // child
    [0.293, 0.465, 0.14], // mother_great_grandmother
    [0.459, 0.585, 0.14], // mother_great_grandfather
    [0.26, 0.657, 0.14], // mother_grandmother
    [0.459, 0.789, 0.136], // mother_grandfather
    [0.748, 0.37, 0.14], // father_great_grandmother
    [0.929, 0.498, 0.14], // father_great_grandfather
    [0.733, 0.569, 0.14], // father_grandmother
    [0.906, 0.708, 0.14], // father_grandfather
    [0.288, 0.86, 0.125], // extra_01 / мама
    [0.414, 0.981, 0.115], // extra_02
    [0.69, 0.763, 0.13], // extra_03 / папа
    [0.837, 0.864, 0.14], // extra_04
    [0.752, 0.992, 0.136], // extra_05
    [0.584, 0.919, 0.131], // extra_06
  ];
  return SPECS.map(([cx, circleBottom, width], index) => {
    const strokeY = Math.min(0.992, circleBottom + GAP_BELOW_CIRCLE);
    const height = Math.min(BAND, strokeY - 0.01);
    const y = strokeY - height;
    const x = Math.max(0.02, Math.min(0.98 - width, cx - width / 2));
    return {
      x,
      y,
      width,
      height,
      hasLabel: false,
      continuationGroup: index + 1,
      inputKind: 'line',
      lineStrokeAtBottom: true,
      textAnchorTop: true,
    };
  });
}

function buildToothDateSlot(spec, continuationGroup) {
  return {
    x: spec.x,
    y: spec.y - TEETH_LINE_BAND,
    width: spec.width,
    height: TEETH_LINE_BAND,
    hasLabel: false,
    continuationGroup,
    inputKind: 'line',
    teethDate: true,
    lineStrokeAtBottom: true,
    textAnchorTop: true,
  };
}

function buildPage10TeethSlots(existing) {
  if (!existing?.length) return existing;
  const toothSlots = TEETH_DATE_SLOTS.map((spec, index) =>
    buildToothDateSlot(spec, index + 1),
  );
  return [...toothSlots, TEETH_FIRST_BRUSHING_SLOT, TEETH_COUNT_SLOT];
}

/**
 * Нижняя дата «ДАТА» — design_previews p15/p17/p18/p19 (1191²).
 * «ДАТА» ≈ 0.351–0.411; underline ≈ 0.414–0.650; штрих ≈ 0.9135.
 * Writable с начала черты после подписи. y = штрих (isKidsStrokeDateLineInputSlot).
 */
const BOTTOM_DATE_STROKE_Y = 0.9135;
const BOTTOM_DATE_WRITABLE_X = 0.418;
const BOTTOM_DATE_WRITABLE_WIDTH = 0.232;
function bottomDateLine(continuationGroup = 1) {
  return LINE(
    BOTTOM_DATE_WRITABLE_X,
    BOTTOM_DATE_STROKE_Y,
    BOTTOM_DATE_WRITABLE_WIDTH,
    TEETH_LINE_BAND,
    continuationGroup,
    { strokeAtNormY: true },
  );
}

/** Дата под заголовком: y = верх полосы (штрих = y + height), как p9. */
function topEventDateLine(y, continuationGroup = 1) {
  return LINE(0.38, y, 0.5, TEETH_LINE_BAND, continuationGroup);
}

/**
 * p20 «Таинство крещения» — «ДАТА» + underline сверху (design page_020).
 * Подпись ≈ 0.351–0.411; underline ≈ 0.414–0.650; штрих ≈ 0.2368.
 * y = штрих (isKidsP20BaptismDateLineSlot).
 */
const PAGE_20_DATE_STROKE_Y = 0.2368;
const PAGE_20_DATE_SLOT = LINE(
  BOTTOM_DATE_WRITABLE_X,
  PAGE_20_DATE_STROKE_Y,
  BOTTOM_DATE_WRITABLE_WIDTH,
  TEETH_LINE_BAND,
  1,
  { strokeAtNormY: true },
);

function captionLineSlot() {
  return LINE(0.12, 0.9, 0.76, 0.032, 1);
}

/**
 * p16 «Мои сновидения» — дата только сверху после «(ДАТА)»
 * (нижней линии «ДАТА» на макете нет).
 * y = штрих; underline ≈ 0.695–0.857.
 * x сдвинут вправо от печатного «(ДАТА)», чтобы не прилипать к скобке.
 */
const PAGE_16_DATE_STROKE_Y = 0.2116;
const PAGE_16_DATE_GAP_AFTER_LABEL = 0.02;
const PAGE_16_DATE_LINE_X = 0.6952 + PAGE_16_DATE_GAP_AFTER_LABEL;
const PAGE_16_DATE_LINE_WIDTH = 0.1621 - PAGE_16_DATE_GAP_AFTER_LABEL;
const PAGE_16_SLOTS = [
  LINE(PAGE_16_DATE_LINE_X, PAGE_16_DATE_STROKE_Y, PAGE_16_DATE_LINE_WIDTH, TEETH_LINE_BAND, 1, {
    strokeAtNormY: true,
  }),
];

/**
 * p13 «Мои достижения» — штрихи в оранжевой рамке (design page_013, 1191²).
 * y = верх полосы; штрих = y + height. Без фантомного OCR-слота 8 (резал photo safe zone).
 */
const PAGE_13_DATE_STROKE_Y = 0.18585;
const PAGE_13_ACHIEVEMENT_STROKES = [
  { x: 0.3258, y: 0.22922, width: 0.5357 }, // держу голову
  { x: 0.539, y: 0.26868, width: 0.3225 }, // переворачиваюсь
  { x: 0.3258, y: 0.30898, width: 0.5357 }, // ползаю
  { x: 0.4316, y: 0.35348, width: 0.4299 }, // сижу
  { x: 0.3266, y: 0.39547, width: 0.5349 }, // стою у опоры
  { x: 0.3199, y: 0.43829, width: 0.5416 }, // первые шаги
  { x: 0.4383, y: 0.48363, width: 0.4232 }, // первое слово
];
const PAGE_13_SLOTS = [
  // Дата слева от печатного «(ДАТА)» — чуть левее, чтобы не прилипала к подписи.
  LINE(0.24, PAGE_13_DATE_STROKE_Y - TEETH_LINE_BAND, 0.17, TEETH_LINE_BAND, 1),
  ...PAGE_13_ACHIEVEMENT_STROKES.map((spec, index) =>
    LINE(spec.x, spec.y - TEETH_LINE_BAND, spec.width, TEETH_LINE_BAND, index + 2),
  ),
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

/**
 * Стр. 3 «Мы ждем тебя» — PDF даёт короткие сегменты линий (~24% ширины).
 * Печатная линия ответа тянется от конца подписи до правого поля (~0.87).
 * y в LINE = верх полосы; штрихи — ручная разметка page_003_design.png.
 */
const PAGE_3_PDR_STROKE_Y = 0.6515;
const PAGE_3_KICKS_STROKE_Y = 0.7053;
const PAGE_3_SLOTS = [
  // Writable starts after printed labels «ПДР» / «ПЕРВЫЕ ПИНОЧКИ».
  LINE(0.435, PAGE_3_PDR_STROKE_Y - TEETH_LINE_BAND, 0.438, TEETH_LINE_BAND, 1),
  LINE(0.525, PAGE_3_KICKS_STROKE_Y - TEETH_LINE_BAND, 0.345, TEETH_LINE_BAND, 2),
];

/** kids_48 p8 — штрих «ДАТА» (калибровка page_008.png ≈ 0.8877). */
const PAGE_8_EVENT_DATE_STROKE_Y = 0.8877;
const PAGE_8_EVENT_DATE_SLOT = LINE(
  1031 / 2481,
  PAGE_8_EVENT_DATE_STROKE_Y - TEETH_LINE_BAND,
  582 / 2481,
  TEETH_LINE_BAND,
  1,
);

/** Дата внизу страницы (не путать со стр. 8, 9, 20 — отдельная геометрия). */
const EVENT_DATE_PAGES = new Set(['12', '14', '15', '17', '18', '19']);

/**
 * p11 «Рост и вес» — штрихи с page_011.png (не равномерный OCR-pitch 0.062).
 * refineKids48GrowthWeightSlot трактует y как strokeY.
 * Ряды сверху вниз: 1 год … 1 мес (слоты 0/1 … 22/23).
 */
const GROWTH_WEIGHT_STROKE_YS = [
  0.26344, 0.32417, 0.38488, 0.4458, 0.50672, 0.56744, 0.62816, 0.68908, 0.74999,
  0.81072, 0.87143, 0.93235,
];
const GROWTH_HEIGHT_X = 0.288;
const GROWTH_WEIGHT_X = 0.571;
const GROWTH_VALUE_WIDTH = 0.143;

function buildPage11GrowthWeightSlots() {
  const out = [];
  for (let row = 0; row < GROWTH_WEIGHT_STROKE_YS.length; row++) {
    const strokeY = GROWTH_WEIGHT_STROKE_YS[row];
    const group = row * 2 + 1;
    out.push({
      x: GROWTH_HEIGHT_X,
      y: strokeY,
      width: GROWTH_VALUE_WIDTH,
      height: 0.062,
      hasLabel: false,
      continuationGroup: group,
      inputKind: 'line',
    });
    out.push({
      x: GROWTH_WEIGHT_X,
      y: strokeY,
      width: GROWTH_VALUE_WIDTH,
      height: 0.062,
      hasLabel: false,
      continuationGroup: group + 1,
      inputKind: 'line',
    });
  }
  return out;
}

const TOP_EVENT_DATE_PAGES = {
  // p9 «Первое купание» — штрих ≈ 0.1919 на page_009.png
  '9': topEventDateLine(0.1919 - TEETH_LINE_BAND),
};

/** Свободные фото-страницы с per-photo captions (как pregnancy «Памятные моменты»). */
const CAPTION_PAGES = new Set(['35', '41', '42', '43', '44', '45', '46', '47', '48']);

function slotGuideY(slot) {
  if (slot.teethDate) return slot.y + slot.height;
  // Нижняя/верхняя «ДАТА» (p12–20): y в JSON уже штрих (не верх полосы).
  if (slot.strokeAtNormY) return slot.y;
  if (slot.lineStrokeAtBottom && slot.textAnchorTop) return slot.y + slot.height;
  return slot.y + slot.height / 2;
}

function applyKids48LineSlotOverrides(slotsByPage, guidesByPage) {
  const slots = { ...slotsByPage };
  const guides = { ...guidesByPage };

  slots['5'] = buildPage5FamilyTreeSlots();
  guides['5'] = slots['5'].map(slotGuideY);

  slots['11'] = buildPage11GrowthWeightSlots();
  guides['11'] = slots['11'].map((s) => s.y);

  slots['3'] = PAGE_3_SLOTS;
  guides['3'] = PAGE_3_SLOTS.map(slotGuideY);

  if (slots['10']?.length) {
    slots['10'] = buildPage10TeethSlots(slots['10']);
    guides['10'] = slots['10'].map(slotGuideY);
  }

  slots['8'] = [PAGE_8_EVENT_DATE_SLOT];
  guides['8'] = [slotGuideY(PAGE_8_EVENT_DATE_SLOT)];

  slots['13'] = PAGE_13_SLOTS;
  guides['13'] = PAGE_13_SLOTS.map(slotGuideY);

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

  slots['20'] = [PAGE_20_DATE_SLOT];
  guides['20'] = [slotGuideY(PAGE_20_DATE_SLOT)];

  slots['21'] = PAGE_21_GODPARENTS_SLOTS;
  guides['21'] = PAGE_21_GODPARENTS_SLOTS.map(slotGuideY);

  for (const page of CAPTION_PAGES) {
    slots[page] = [captionLineSlot()];
    guides[page] = [slotGuideY(captionLineSlot())];
  }

  return { slots, guides };
}

module.exports = {
  applyKids48LineSlotOverrides,
  buildPage5FamilyTreeSlots,
  buildPage10TeethSlots,
  buildPage11GrowthWeightSlots,
  TEETH_DATE_SLOTS,
  TEETH_FIRST_BRUSHING_SLOT,
  TEETH_COUNT_SLOT,
};
