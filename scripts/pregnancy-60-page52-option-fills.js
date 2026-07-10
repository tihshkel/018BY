/**
 * Radio option rect fills for pregnancy_60 page 52 — coords from design_previews/page_052_design.png.
 * Measured from checkbox white interiors (2px inset inside stroke).
 */

const PREGNANCY_FORM_FILL = '#E8C4A8';

const PREGNANCY_60_PAGE52_OPTION_FILLS = [
  {
    id: 'gender_boy',
    fieldId: 'pregnancy_60_p52_baby_gender',
    option: 'Мальчик',
    fillColor: PREGNANCY_FORM_FILL,
    shape: 'rect',
    x: 0.1851,
    y: 0.4225,
    width: 0.0274,
    height: 0.0206,
  },
  {
    id: 'gender_girl',
    fieldId: 'pregnancy_60_p52_baby_gender',
    option: 'Девочка',
    fillColor: PREGNANCY_FORM_FILL,
    shape: 'rect',
    x: 0.3751,
    y: 0.4225,
    width: 0.0274,
    height: 0.0206,
  },
  {
    id: 'stimulation_yes',
    fieldId: 'pregnancy_60_p52_stimulation',
    option: 'Да',
    fillColor: PREGNANCY_FORM_FILL,
    shape: 'rect',
    x: 0.7258,
    y: 0.4217,
    width: 0.0274,
    height: 0.0206,
  },
  {
    id: 'stimulation_no',
    fieldId: 'pregnancy_60_p52_stimulation',
    option: 'Нет',
    fillColor: PREGNANCY_FORM_FILL,
    shape: 'rect',
    x: 0.8051,
    y: 0.4217,
    width: 0.0274,
    height: 0.0206,
  },
  {
    id: 'tears_yes',
    fieldId: 'pregnancy_60_p52_tears',
    option: 'Да',
    fillColor: PREGNANCY_FORM_FILL,
    shape: 'rect',
    x: 0.6611,
    y: 0.4585,
    width: 0.0274,
    height: 0.0206,
  },
  {
    id: 'tears_no',
    fieldId: 'pregnancy_60_p52_tears',
    option: 'Нет',
    fillColor: PREGNANCY_FORM_FILL,
    shape: 'rect',
    x: 0.7453,
    y: 0.4585,
    width: 0.0274,
    height: 0.0206,
  },
  {
    id: 'cord_yes',
    fieldId: 'pregnancy_60_p52_cord',
    option: 'Да',
    fillColor: PREGNANCY_FORM_FILL,
    shape: 'rect',
    x: 0.6709,
    y: 0.4982,
    width: 0.0274,
    height: 0.0206,
  },
  {
    id: 'cord_no',
    fieldId: 'pregnancy_60_p52_cord',
    option: 'Нет',
    fillColor: PREGNANCY_FORM_FILL,
    shape: 'rect',
    x: 0.7551,
    y: 0.4982,
    width: 0.0274,
    height: 0.0206,
  },
];

module.exports = {
  PREGNANCY_60_PAGE52_OPTION_FILLS,
};
