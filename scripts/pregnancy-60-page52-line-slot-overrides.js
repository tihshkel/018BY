/**
 * Page 52 «Анкета родов» — 19 manual slots (indices match buildBirthQuestionnaire60Fields).
 * Top/bottom lines: OCR PDF coords. Pink box: manual block coords.
 */

/** PDF underline: stroke at bottom of band; stored y = top of band. */
const LINE = (x, strokeY, width, height, continuationGroup, hasLabel = true) => ({
  x,
  y: strokeY - height,
  width,
  height,
  hasLabel,
  inputKind: 'line',
  lineStrokeAtBottom: true,
  textAnchorTop: true,
  continuationGroup,
});

/** PDF white fill: center-y storage (same as OCR). */
const FILL = (x, top, width, height, continuationGroup, hasLabel = false) => ({
  x,
  y: top + height / 2,
  width,
  height,
  hasLabel,
  inputKind: 'block',
  continuationGroup,
});

/**
 * 0 age, 1 weight_before, 2 weight_gain, 3 PDR, 4 birth date, 5 term,
 * 6 hospital, 7 admission, 8 weight, 9 height, 10 weekday, 11 time, 12 Ер/Кс,
 * 13 condition, 14 discharge, 15 days, 16–18 guests.
 */
const PAGE_52_SLOTS = [
  {
    x: 0.45025,
    y: 0.17617,
    width: 0.43753,
    height: 0.04113,
    hasLabel: true,
    continuationGroup: 1,
  },
  {
    x: 0.405,
    y: 0.21729,
    width: 0.17,
    height: 0.04214,
    hasLabel: true,
    continuationGroup: 2,
  },
  {
    x: 0.69805,
    y: 0.21729,
    width: 0.18909,
    height: 0.04214,
    hasLabel: true,
    continuationGroup: 3,
  },
  {
    x: 0.15783,
    y: 0.26117,
    width: 0.23329,
    height: 0.04265,
    hasLabel: true,
    continuationGroup: 4,
  },
  {
    x: 0.56,
    y: 0.26117,
    width: 0.26,
    height: 0.04265,
    hasLabel: true,
    continuationGroup: 5,
  },
  {
    x: 0.72,
    y: 0.30259,
    width: 0.18,
    height: 0.04052,
    hasLabel: true,
    continuationGroup: 6,
  },
  {
    x: 0.24,
    y: 0.34222,
    width: 0.62,
    height: 0.04029,
    hasLabel: true,
    continuationGroup: 7,
  },
  LINE(0.67, 0.388, 0.29, 0.046, 8),
  FILL(0.3133, 0.4813, 0.11, 0.028, 11),
  FILL(0.43, 0.4813, 0.106, 0.028, 12),
  FILL(0.2211, 0.5252, 0.3154, 0.028, 13),
  {
    x: 0.22,
    y: 0.534,
    width: 0.32,
    height: 0.026,
    hasLabel: true,
    continuationGroup: 14,
  },
  FILL(0.566, 0.5247, 0.29, 0.028, 15, true),
  {
    x: 0.33528,
    y: 0.61927,
    width: 0.54848,
    height: 0.04698,
    hasLabel: true,
    continuationGroup: 16,
  },
  {
    x: 0.46901,
    y: 0.66004,
    width: 0.41461,
    height: 0.04077,
    hasLabel: true,
    continuationGroup: 17,
  },
  {
    x: 0.54463,
    y: 0.70081,
    width: 0.33724,
    height: 0.04164,
    hasLabel: true,
    continuationGroup: 18,
  },
  {
    x: 0.41445,
    y: 0.74332,
    width: 0.47199,
    height: 0.04207,
    hasLabel: true,
    continuationGroup: 19,
  },
  {
    x: 0.11342,
    y: 0.78496,
    width: 0.77302,
    height: 0.04164,
    hasLabel: false,
    continuationGroup: 19,
  },
  {
    x: 0.11342,
    y: 0.82659,
    width: 0.77302,
    height: 0.04164,
    hasLabel: false,
    continuationGroup: 19,
  },
];

function slotGuideY(slot) {
  return slot.textAnchorTop ? slot.y + slot.height / 2 : slot.y;
}

function applyPregnancy60Page52LineSlotOverrides(slotsByPage, guidesByPage) {
  return {
    slots: { ...slotsByPage, 52: PAGE_52_SLOTS },
    guides: { ...guidesByPage, 52: PAGE_52_SLOTS.map(slotGuideY) },
  };
}

module.exports = {
  applyPregnancy60Page52LineSlotOverrides,
  PAGE_52_SLOTS,
};
