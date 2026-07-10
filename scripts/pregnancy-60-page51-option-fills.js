/**
 * Checkbox fills for pregnancy_60 page 51 «Список дел».
 * Centers from design_previews/page_051_design.png (1021×1361); square bleed in px.
 */

const PREGNANCY_FORM_FILL = '#E8C4A8';
const TODO_CHECKED_OPTION = '1';

const PAGE_W = 1021;
const PAGE_H = 1361;
/** White interior ~32px + bleed so fill covers the whole checkbox. */
const CHECKBOX_PX = 36;

const nw = CHECKBOX_PX / PAGE_W;
const nh = CHECKBOX_PX / PAGE_H;

const CENTERS = [
  [0.1949, 0.2575],
  [0.4941, 0.2575],
  [0.7958, 0.2575],
  [0.216, 0.4118],
  [0.4647, 0.4118],
  [0.7468, 0.4118],
  [0.1949, 0.5647],
  [0.4941, 0.5647],
  [0.7997, 0.5647],
  [0.2522, 0.7204],
  [0.5348, 0.7204],
  [0.7831, 0.7204],
  [0.1949, 0.8747],
  [0.4941, 0.8747],
  [0.7958, 0.8747],
];

const PREGNANCY_60_PAGE51_OPTION_FILLS = CENTERS.map(([cx, cy], index) => ({
  id: `todo_${index + 1}`,
  fieldId: `pregnancy_60_p51_todo_${index + 1}`,
  option: TODO_CHECKED_OPTION,
  fillColor: PREGNANCY_FORM_FILL,
  shape: 'rect',
  x: cx - nw / 2,
  y: cy - nh / 2,
  width: nw,
  height: nh,
  cornerRadius: 3,
}));

module.exports = {
  PREGNANCY_60_PAGE51_OPTION_FILLS,
  TODO_CHECKED_OPTION,
};
