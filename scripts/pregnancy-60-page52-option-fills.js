/**
 * Radio option rect fills for pregnancy_60 page 52 — coords from
 * in albums/беременность 180х240/…52….pdf (aligned with A5 p44 layout).
 */

const PREGNANCY_FORM_FILL = '#E8C4A8';

const PREGNANCY_60_PAGE52_OPTION_FILLS = [
  {
    id: 'gender_boy',
    fieldId: 'pregnancy_60_p52_baby_gender',
    option: 'Мальчик',
    fillColor: PREGNANCY_FORM_FILL,
    shape: 'rect',
    x: 0.204,
    y: 0.428,
    width: 0.038,
    height: 0.028,
  },
  {
    id: 'gender_girl',
    fieldId: 'pregnancy_60_p52_baby_gender',
    option: 'Девочка',
    fillColor: PREGNANCY_FORM_FILL,
    shape: 'rect',
    x: 0.388,
    y: 0.428,
    width: 0.038,
    height: 0.028,
  },
  {
    id: 'stimulation_yes',
    fieldId: 'pregnancy_60_p52_stimulation',
    option: 'Да',
    fillColor: PREGNANCY_FORM_FILL,
    shape: 'rect',
    x: 0.652,
    y: 0.428,
    width: 0.038,
    height: 0.028,
  },
  {
    id: 'stimulation_no',
    fieldId: 'pregnancy_60_p52_stimulation',
    option: 'Нет',
    fillColor: PREGNANCY_FORM_FILL,
    shape: 'rect',
    x: 0.738,
    y: 0.428,
    width: 0.038,
    height: 0.028,
  },
  {
    id: 'tears_yes',
    fieldId: 'pregnancy_60_p52_tears',
    option: 'Да',
    fillColor: PREGNANCY_FORM_FILL,
    shape: 'rect',
    x: 0.652,
    y: 0.468,
    width: 0.038,
    height: 0.028,
  },
  {
    id: 'tears_no',
    fieldId: 'pregnancy_60_p52_tears',
    option: 'Нет',
    fillColor: PREGNANCY_FORM_FILL,
    shape: 'rect',
    x: 0.738,
    y: 0.468,
    width: 0.038,
    height: 0.028,
  },
  {
    id: 'cord_yes',
    fieldId: 'pregnancy_60_p52_cord',
    option: 'Да',
    fillColor: PREGNANCY_FORM_FILL,
    shape: 'rect',
    x: 0.652,
    y: 0.508,
    width: 0.038,
    height: 0.028,
  },
  {
    id: 'cord_no',
    fieldId: 'pregnancy_60_p52_cord',
    option: 'Нет',
    fillColor: PREGNANCY_FORM_FILL,
    shape: 'rect',
    x: 0.738,
    y: 0.508,
    width: 0.038,
    height: 0.028,
  },
];

module.exports = {
  PREGNANCY_60_PAGE52_OPTION_FILLS,
};
