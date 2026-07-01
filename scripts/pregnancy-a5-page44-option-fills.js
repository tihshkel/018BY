/**
 * Radio option rect fills for pregnancy_a5 page 44 — coords from in albums/беременность A5/44.pdf.
 * Ер/Кс is a text field (slot 10), not checkbox fills.
 */

const PREGNANCY_FORM_FILL = '#E8C4A8';

const PREGNANCY_A5_PAGE44_OPTION_FILLS = [
  {
    id: 'gender_boy',
    fieldId: 'pregnancy_a5_p44_baby_gender',
    option: 'Мальчик',
    fillColor: PREGNANCY_FORM_FILL,
    shape: 'rect',
    x: 0.19,
    y: 0.4131,
    width: 0.0395,
    height: 0.028,
  },
  {
    id: 'gender_girl',
    fieldId: 'pregnancy_a5_p44_baby_gender',
    option: 'Девочка',
    fillColor: PREGNANCY_FORM_FILL,
    shape: 'rect',
    x: 0.388,
    y: 0.4107,
    width: 0.0395,
    height: 0.028,
  },
  {
    id: 'stimulation_yes',
    fieldId: 'pregnancy_a5_p44_stimulation',
    option: 'Да',
    fillColor: PREGNANCY_FORM_FILL,
    shape: 'rect',
    x: 0.7224,
    y: 0.4122,
    width: 0.039,
    height: 0.028,
  },
  {
    id: 'stimulation_no',
    fieldId: 'pregnancy_a5_p44_stimulation',
    option: 'Нет',
    fillColor: PREGNANCY_FORM_FILL,
    shape: 'rect',
    x: 0.8105,
    y: 0.4101,
    width: 0.039,
    height: 0.028,
  },
  {
    id: 'tears_yes',
    fieldId: 'pregnancy_a5_p44_tears',
    option: 'Да',
    fillColor: PREGNANCY_FORM_FILL,
    shape: 'rect',
    x: 0.6724,
    y: 0.452,
    width: 0.039,
    height: 0.028,
  },
  {
    id: 'tears_no',
    fieldId: 'pregnancy_a5_p44_tears',
    option: 'Нет',
    fillColor: PREGNANCY_FORM_FILL,
    shape: 'rect',
    x: 0.7621,
    y: 0.4513,
    width: 0.039,
    height: 0.028,
  },
  {
    id: 'cord_yes',
    fieldId: 'pregnancy_a5_p44_cord',
    option: 'Да',
    fillColor: PREGNANCY_FORM_FILL,
    shape: 'rect',
    x: 0.6704,
    y: 0.4961,
    width: 0.039,
    height: 0.028,
  },
  {
    id: 'cord_no',
    fieldId: 'pregnancy_a5_p44_cord',
    option: 'Нет',
    fillColor: PREGNANCY_FORM_FILL,
    shape: 'rect',
    x: 0.764,
    y: 0.4954,
    width: 0.039,
    height: 0.028,
  },
];

module.exports = {
  PREGNANCY_A5_PAGE44_OPTION_FILLS,
};
