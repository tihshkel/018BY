/**
 * Checkbox rect fills for pregnancy_60 page 51 «Список дел».
 * Coords from PDF vector paths (white checkbox squares) + bleed into stroke.
 */

const TODO_CHECKBOX_FILL = '#C8864A';

/** Rounded-corner ratio from PDF path (rx ≈ 3.09 pt on 17.01 pt box). */
const CHECKBOX_CORNER_RADIUS_RATIO = 0.182;

/** Cover orange stroke (~0.57 pt) and raster antialiasing. */
const CHECKBOX_BLEED = 0.0018;

/** Exact checkbox outer bounds from PDF page 51 (normalized top-left). */
const TODO_CHECKBOX_RECTS = [
  // row 1
  { x: 0.1788, y: 0.2452, width: 0.0333, height: 0.025 },
  { x: 0.4784, y: 0.2452, width: 0.0333, height: 0.025 },
  { x: 0.78, y: 0.2452, width: 0.0333, height: 0.025 },
  // row 2
  { x: 0.2003, y: 0.3998, width: 0.0333, height: 0.025 },
  { x: 0.4484, y: 0.3998, width: 0.0333, height: 0.025 },
  { x: 0.7313, y: 0.3998, width: 0.0333, height: 0.025 },
  // row 3
  { x: 0.1788, y: 0.5529, width: 0.0333, height: 0.025 },
  { x: 0.4784, y: 0.5529, width: 0.0333, height: 0.025 },
  { x: 0.7836, y: 0.5529, width: 0.0333, height: 0.025 },
  // row 4
  { x: 0.2361, y: 0.7085, width: 0.0333, height: 0.025 },
  { x: 0.5189, y: 0.7085, width: 0.0333, height: 0.025 },
  { x: 0.767, y: 0.7085, width: 0.0333, height: 0.025 },
  // row 5
  { x: 0.1788, y: 0.8626, width: 0.0333, height: 0.025 },
  { x: 0.4784, y: 0.8626, width: 0.0333, height: 0.025 },
  { x: 0.78, y: 0.8626, width: 0.0333, height: 0.025 },
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
