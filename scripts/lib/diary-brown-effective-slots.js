/**
 * Diary brown pages where runtime getLineSlotsForPage filters slots after line-slots.json.
 * Schema generation uses diary-brown-slot-overrides-data.json directly — keep filters in sync.
 *
 * @see utils/textLineSlots.ts isBrownPage*SpuriousSlot helpers
 */
const RUNTIME_FILTERED_PAGES = {
  13: ['isBrownPage13AloneQuestionSpuriousSlot'],
  16: ['isBrownPage16PeachTitleSpuriousSlot', 'isBrownJournalTemplateSpuriousSlot'],
  31: [],
};

module.exports = { RUNTIME_FILTERED_PAGES };
