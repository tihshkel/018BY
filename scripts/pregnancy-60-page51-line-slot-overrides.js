/**
 * Page 51 «Список дел» — labels/checkboxes are on the PDF; user toggles fills only.
 */

function applyPregnancy60Page51LineSlotOverrides(slotsByPage, guidesByPage) {
  return {
    slots: { ...slotsByPage, 51: [] },
    guides: { ...guidesByPage, 51: [] },
  };
}

module.exports = {
  applyPregnancy60Page51LineSlotOverrides,
};
