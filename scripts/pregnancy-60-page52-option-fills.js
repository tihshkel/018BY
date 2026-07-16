/**
 * Radio option rect fills for pregnancy_60 page 52 — checkbox squares on page_052.png.
 * Outer bounds from orange stroke flood-fill; slight bleed so peach fill fully covers
 * the white interior and border (same approach as page 51 todo checkboxes).
 */

const PREGNANCY_FORM_FILL = '#E8C4A8';

/** Rounded-corner ratio matching PDF checkbox path. */
const CHECKBOX_CORNER_RADIUS_RATIO = 0.182;
/** Cover orange stroke + raster antialiasing. */
const CHECKBOX_BLEED = 0.0015;

/** Exact checkbox outer bounds from page_052.png (normalized top-left). */
const CHECKBOX_RECTS = [
  {
    id: 'gender_boy',
    fieldId: 'pregnancy_60_p52_baby_gender',
    option: 'Мальчик',
    x: 0.1886,
    y: 0.4212,
    width: 0.034,
    height: 0.0257,
  },
  {
    id: 'gender_girl',
    fieldId: 'pregnancy_60_p52_baby_gender',
    option: 'Девочка',
    x: 0.3744,
    y: 0.4212,
    width: 0.034,
    height: 0.0257,
  },
  {
    id: 'stimulation_yes',
    fieldId: 'pregnancy_60_p52_stimulation',
    option: 'Да',
    x: 0.7171,
    y: 0.4205,
    width: 0.034,
    height: 0.0257,
  },
  {
    id: 'stimulation_no',
    fieldId: 'pregnancy_60_p52_stimulation',
    option: 'Нет',
    x: 0.7953,
    y: 0.4205,
    width: 0.0336,
    height: 0.0257,
  },
  {
    id: 'tears_yes',
    fieldId: 'pregnancy_60_p52_tears',
    option: 'Да',
    x: 0.6536,
    y: 0.4566,
    width: 0.034,
    height: 0.0257,
  },
  {
    id: 'tears_no',
    fieldId: 'pregnancy_60_p52_tears',
    option: 'Нет',
    x: 0.7369,
    y: 0.4566,
    width: 0.0336,
    height: 0.0257,
  },
  {
    id: 'cord_yes',
    fieldId: 'pregnancy_60_p52_cord',
    option: 'Да',
    x: 0.6642,
    y: 0.4955,
    width: 0.0336,
    height: 0.0257,
  },
  {
    id: 'cord_no',
    fieldId: 'pregnancy_60_p52_cord',
    option: 'Нет',
    x: 0.7461,
    y: 0.4955,
    width: 0.0336,
    height: 0.0257,
  },
];

function withBleed(rect) {
  return {
    ...rect,
    x: +(rect.x - CHECKBOX_BLEED).toFixed(4),
    y: +(rect.y - CHECKBOX_BLEED).toFixed(4),
    width: +(rect.width + CHECKBOX_BLEED * 2).toFixed(4),
    height: +(rect.height + CHECKBOX_BLEED * 2).toFixed(4),
  };
}

const PREGNANCY_60_PAGE52_OPTION_FILLS = CHECKBOX_RECTS.map((rect) => {
  const fillRect = withBleed(rect);
  return {
    id: fillRect.id,
    fieldId: fillRect.fieldId,
    option: fillRect.option,
    fillColor: PREGNANCY_FORM_FILL,
    shape: 'rect',
    cornerRadiusRatio: CHECKBOX_CORNER_RADIUS_RATIO,
    x: fillRect.x,
    y: fillRect.y,
    width: fillRect.width,
    height: fillRect.height,
  };
});

module.exports = {
  PREGNANCY_60_PAGE52_OPTION_FILLS,
  CHECKBOX_RECTS,
  CHECKBOX_CORNER_RADIUS_RATIO,
  CHECKBOX_BLEED,
};
