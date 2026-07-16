/**
 * Checkbox rect fills for pregnancy_60 page 50 «Список покупок».
 * Coords from PDF vector paths (orange checkbox squares) + bleed into stroke.
 * Order matches line slots: left, right, left, right… (18 rows × 2 columns).
 */

const {
  CHECKBOX_CORNER_RADIUS_RATIO,
  CHECKBOX_BLEED,
} = require('./pregnancy-60-page51-option-fills');

const SHOPPING_CHECKBOX_FILL = '#E8C4A8';
const CHECKBOX_NUDGE_X = -0.0008;
const CHECKBOX_NUDGE_Y = -0.0005;

/** Exact checkbox outer bounds from PDF page 50 (normalized top-left). */
const SHOPPING_CHECKBOX_RECTS = [
  { x: 0.1241, y: 0.1706, width: 0.0326, height: 0.0246 },
  { x: 0.5174, y: 0.1706, width: 0.0326, height: 0.0246 },
  { x: 0.1241, y: 0.2119, width: 0.0326, height: 0.0246 },
  { x: 0.5174, y: 0.2119, width: 0.0326, height: 0.0246 },
  { x: 0.1241, y: 0.2531, width: 0.0326, height: 0.0246 },
  { x: 0.5174, y: 0.2531, width: 0.0326, height: 0.0246 },
  { x: 0.1241, y: 0.2944, width: 0.0326, height: 0.0246 },
  { x: 0.5174, y: 0.2944, width: 0.0326, height: 0.0246 },
  { x: 0.1241, y: 0.3357, width: 0.0326, height: 0.0246 },
  { x: 0.5174, y: 0.3357, width: 0.0326, height: 0.0246 },
  { x: 0.1241, y: 0.3769, width: 0.0326, height: 0.0246 },
  { x: 0.5174, y: 0.3769, width: 0.0326, height: 0.0246 },
  { x: 0.1241, y: 0.4182, width: 0.0326, height: 0.0246 },
  { x: 0.5174, y: 0.4182, width: 0.0326, height: 0.0246 },
  { x: 0.1241, y: 0.4595, width: 0.0326, height: 0.0246 },
  { x: 0.5174, y: 0.4595, width: 0.0326, height: 0.0246 },
  { x: 0.1241, y: 0.5007, width: 0.0326, height: 0.0246 },
  { x: 0.5174, y: 0.5007, width: 0.0326, height: 0.0246 },
  { x: 0.1241, y: 0.542, width: 0.0326, height: 0.0246 },
  { x: 0.5174, y: 0.542, width: 0.0326, height: 0.0246 },
  { x: 0.1241, y: 0.5833, width: 0.0326, height: 0.0246 },
  { x: 0.5174, y: 0.5833, width: 0.0326, height: 0.0246 },
  { x: 0.1241, y: 0.6245, width: 0.0326, height: 0.0246 },
  { x: 0.5174, y: 0.6245, width: 0.0326, height: 0.0246 },
  { x: 0.1241, y: 0.6658, width: 0.0326, height: 0.0246 },
  { x: 0.5174, y: 0.6658, width: 0.0326, height: 0.0246 },
  { x: 0.1241, y: 0.7071, width: 0.0326, height: 0.0246 },
  { x: 0.5174, y: 0.7071, width: 0.0326, height: 0.0246 },
  { x: 0.1241, y: 0.7484, width: 0.0326, height: 0.0246 },
  { x: 0.5174, y: 0.7484, width: 0.0326, height: 0.0246 },
  { x: 0.1241, y: 0.7896, width: 0.0326, height: 0.0246 },
  { x: 0.5174, y: 0.7896, width: 0.0326, height: 0.0246 },
  { x: 0.1241, y: 0.8309, width: 0.0326, height: 0.0246 },
  { x: 0.5174, y: 0.8309, width: 0.0326, height: 0.0246 },
  { x: 0.1241, y: 0.8722, width: 0.0326, height: 0.0246 },
  { x: 0.5174, y: 0.8722, width: 0.0326, height: 0.0246 },
];

function withBleed(rect) {
  return {
    x: rect.x + CHECKBOX_NUDGE_X - CHECKBOX_BLEED,
    y: rect.y + CHECKBOX_NUDGE_Y - CHECKBOX_BLEED,
    width: rect.width + CHECKBOX_BLEED * 2,
    height: rect.height + CHECKBOX_BLEED * 2,
  };
}

const PREGNANCY_60_PAGE50_OPTION_FILLS = SHOPPING_CHECKBOX_RECTS.map((rect, index) => {
  const fillRect = withBleed(rect);
  return {
    id: `purchased_${index + 1}_yes`,
    fieldId: `pregnancy_60_p50_purchased_${index + 1}`,
    option: 'Да',
    fillColor: SHOPPING_CHECKBOX_FILL,
    shape: 'rect',
    cornerRadiusRatio: CHECKBOX_CORNER_RADIUS_RATIO,
    ...fillRect,
  };
});

module.exports = {
  PREGNANCY_60_PAGE50_OPTION_FILLS,
  SHOPPING_CHECKBOX_RECTS,
};
