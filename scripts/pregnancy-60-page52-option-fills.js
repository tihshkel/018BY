/**
 * Radio option rect fills for pregnancy_60 page 52 — PDF checkbox squares.
 */

const PREGNANCY_FORM_FILL = '#E8C4A8';

const CHECKBOX_CORNER_RADIUS_RATIO = 0.182;
const CHECKBOX_BLEED = 0.0028;
const CHECKBOX_NUDGE_X = -0.0008;
const CHECKBOX_NUDGE_Y = -0.0005;
const CHECKBOX = { width: 0.0333, height: 0.025 };

function withBleed({ x, y, ...rest }) {
  return {
    ...rest,
    x: x + CHECKBOX_NUDGE_X - CHECKBOX_BLEED,
    y: y + CHECKBOX_NUDGE_Y - CHECKBOX_BLEED,
    width: CHECKBOX.width + CHECKBOX_BLEED * 2,
    height: CHECKBOX.height + CHECKBOX_BLEED * 2,
    cornerRadiusRatio: CHECKBOX_CORNER_RADIUS_RATIO,
  };
}

const PREGNANCY_60_PAGE52_OPTION_FILLS = [
  withBleed({
    id: 'gender_boy',
    fieldId: 'pregnancy_60_p52_baby_gender',
    option: 'Мальчик',
    fillColor: PREGNANCY_FORM_FILL,
    shape: 'rect',
    x: 0.1824,
    y: 0.4204,
  }),
  withBleed({
    id: 'gender_girl',
    fieldId: 'pregnancy_60_p52_baby_gender',
    option: 'Девочка',
    fillColor: PREGNANCY_FORM_FILL,
    shape: 'rect',
    x: 0.3725,
    y: 0.4204,
  }),
  withBleed({
    id: 'stimulation_yes',
    fieldId: 'pregnancy_60_p52_stimulation',
    option: 'Да',
    fillColor: PREGNANCY_FORM_FILL,
    shape: 'rect',
    x: 0.7228,
    y: 0.4198,
  }),
  withBleed({
    id: 'stimulation_no',
    fieldId: 'pregnancy_60_p52_stimulation',
    option: 'Нет',
    fillColor: PREGNANCY_FORM_FILL,
    shape: 'rect',
    x: 0.8027,
    y: 0.4198,
  }),
  withBleed({
    id: 'tears_yes',
    fieldId: 'pregnancy_60_p52_tears',
    option: 'Да',
    fillColor: PREGNANCY_FORM_FILL,
    shape: 'rect',
    x: 0.6582,
    y: 0.4566,
  }),
  withBleed({
    id: 'tears_no',
    fieldId: 'pregnancy_60_p52_tears',
    option: 'Нет',
    fillColor: PREGNANCY_FORM_FILL,
    shape: 'rect',
    x: 0.7429,
    y: 0.4566,
  }),
  withBleed({
    id: 'cord_yes',
    fieldId: 'pregnancy_60_p52_cord',
    option: 'Да',
    fillColor: PREGNANCY_FORM_FILL,
    shape: 'rect',
    x: 0.6687,
    y: 0.4959,
  }),
  withBleed({
    id: 'cord_no',
    fieldId: 'pregnancy_60_p52_cord',
    option: 'Нет',
    fillColor: PREGNANCY_FORM_FILL,
    shape: 'rect',
    x: 0.7524,
    y: 0.4959,
  }),
];

module.exports = {
  PREGNANCY_60_PAGE52_OPTION_FILLS,
};
