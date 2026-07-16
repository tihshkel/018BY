/**
 * Checkbox rect fills for pregnancy_60 page 51 «Список дел».
 * Coords from orange stroke bboxes on the page PNG (PDF vector rects drift
 * from the visible checkboxes — use raster, not get_drawings).
 */

/** Мягкий персик — как на p52 «Анкета родов», гармонирует с карточками страницы. */
const TODO_CHECKBOX_FILL = '#E8C4A8';

/** Rounded-corner ratio from PDF path (rx ≈ 3.09 pt on 17.01 pt box). */
const CHECKBOX_CORNER_RADIUS_RATIO = 0.182;

/** Cover orange stroke (~0.57 pt) and raster antialiasing. */
const CHECKBOX_BLEED = 0.0028;

/**
 * Exact checkbox outer bounds from page_051.png orange stroke (normalized top-left).
 * Order: row-major, 3 columns × 5 rows.
 */
const TODO_CHECKBOX_RECTS = [
  // row 1
  { x: 0.1854, y: 0.2491, width: 0.0335, height: 0.0253 },
  { x: 0.4784, y: 0.2491, width: 0.0335, height: 0.0253 },
  { x: 0.7732, y: 0.2491, width: 0.0335, height: 0.0253 },
  // row 2
  { x: 0.2061, y: 0.4011, width: 0.0335, height: 0.0253 },
  { x: 0.4489, y: 0.4011, width: 0.0335, height: 0.0253 },
  { x: 0.7254, y: 0.4011, width: 0.0335, height: 0.0253 },
  // row 3
  { x: 0.1854, y: 0.5517, width: 0.0335, height: 0.0253 },
  { x: 0.4784, y: 0.5517, width: 0.0335, height: 0.0253 },
  { x: 0.7769, y: 0.5517, width: 0.0335, height: 0.0253 },
  // row 4
  { x: 0.2410, y: 0.7047, width: 0.0335, height: 0.0253 },
  { x: 0.5179, y: 0.7047, width: 0.0335, height: 0.0253 },
  { x: 0.7603, y: 0.7047, width: 0.0335, height: 0.0253 },
  // row 5
  { x: 0.1854, y: 0.8563, width: 0.0335, height: 0.0253 },
  { x: 0.4784, y: 0.8563, width: 0.0335, height: 0.0253 },
  { x: 0.7732, y: 0.8563, width: 0.0335, height: 0.0253 },
];

function withBleed(rect) {
  return {
    x: rect.x - CHECKBOX_BLEED,
    y: rect.y - CHECKBOX_BLEED,
    width: rect.width + CHECKBOX_BLEED * 2,
    height: rect.height + CHECKBOX_BLEED * 2,
  };
}

const PREGNANCY_60_PAGE51_OPTION_FILLS = TODO_CHECKBOX_RECTS.map((rect, index) => {
  const fillRect = withBleed(rect);
  return {
    id: `todo_${index + 1}_yes`,
    fieldId: `pregnancy_60_p51_todo_${index + 1}`,
    option: 'Да',
    fillColor: TODO_CHECKBOX_FILL,
    shape: 'rect',
    cornerRadiusRatio: CHECKBOX_CORNER_RADIUS_RATIO,
    ...fillRect,
  };
});

module.exports = {
  PREGNANCY_60_PAGE51_OPTION_FILLS,
  TODO_CHECKBOX_RECTS,
  CHECKBOX_CORNER_RADIUS_RATIO,
  CHECKBOX_BLEED,
};
