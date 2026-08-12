/**
 * Checkbox fills for pregnancy_60 page 51 «Список дел».
 * Exact outer bounds from page_051.png orange stroke (iOS e24a739) + bleed
 * so fill covers the whole checkbox flush to the border.
 */

const TODO_CHECKBOX_FILL = '#E8C4A8';
// Must match TodoCheckboxFormField value ('Да') — same as shopping page fills.
const TODO_CHECKED_OPTION = 'Да';

/** Cover orange stroke and raster antialiasing — flush to visible border. */
const CHECKBOX_BLEED = 0.0035;

/**
 * Exact checkbox outer bounds (normalized top-left).
 * Order: row-major, 3 columns × 5 rows.
 */
const TODO_CHECKBOX_RECTS = [
  { x: 0.1854, y: 0.2491, width: 0.0335, height: 0.0253 },
  { x: 0.4784, y: 0.2491, width: 0.0335, height: 0.0253 },
  { x: 0.7732, y: 0.2491, width: 0.0335, height: 0.0253 },
  { x: 0.2061, y: 0.4011, width: 0.0335, height: 0.0253 },
  { x: 0.4489, y: 0.4011, width: 0.0335, height: 0.0253 },
  { x: 0.7254, y: 0.4011, width: 0.0335, height: 0.0253 },
  { x: 0.1854, y: 0.5517, width: 0.0335, height: 0.0253 },
  { x: 0.4784, y: 0.5517, width: 0.0335, height: 0.0253 },
  { x: 0.7769, y: 0.5517, width: 0.0335, height: 0.0253 },
  { x: 0.2410, y: 0.7047, width: 0.0335, height: 0.0253 },
  { x: 0.5179, y: 0.7047, width: 0.0335, height: 0.0253 },
  { x: 0.7603, y: 0.7047, width: 0.0335, height: 0.0253 },
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
    id: `todo_${index + 1}`,
    fieldId: `pregnancy_60_p51_todo_${index + 1}`,
    option: TODO_CHECKED_OPTION,
    fillColor: TODO_CHECKBOX_FILL,
    shape: 'rect',
    // Square PDF boxes — no corner radius gaps at the corners.
    cornerRadius: 0,
    ...fillRect,
  };
});

module.exports = {
  PREGNANCY_60_PAGE51_OPTION_FILLS,
  TODO_CHECKBOX_RECTS,
  TODO_CHECKED_OPTION,
  CHECKBOX_BLEED,
};
