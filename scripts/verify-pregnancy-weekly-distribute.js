#!/usr/bin/env node
/**
 * Проверка: текст планов/ощущений — хвост после подписи, затем body-строки.
 * node scripts/verify-pregnancy-weekly-distribute.js
 */
const LINE_SLOTS = require('../constants/line-slots.json');

const { applyPregnancy60WeeklyLineSlotOverrides } = require('./pregnancy-60-weekly-line-slot-overrides');

const COMPACT = 0.035;
const PITCH = 0.0412;
const INLINE_TAIL_MIN_X_GAP = 0.015;

function refineWeeklyNorms(norms, guides, bellyIndex) {
  return norms.map((norm, index) => {
    if (index === 1 || index === bellyIndex) return norm;
    if ((norm.inputKind ?? 'line') !== 'line') return norm;
    if (norm.hasLabel && norm.height > COMPACT) return norm;
    const guideStrokeY = guides[index];
    if (typeof guideStrokeY !== 'number') return norm;
    const bandHeight =
      norm.hasLabel && norm.height <= COMPACT ? norm.height : PITCH;
    return { ...norm, y: guideStrokeY - bandHeight, height: bandHeight };
  });
}

function findInlineTail(slots, bodyStartIndex, groupId, bellyIndex) {
  const labelSlot = slots
    .filter(
      (s) =>
        s.continuationGroup === groupId &&
        s.hasLabel &&
        s.index < bodyStartIndex &&
        (s.inputKind ?? 'line') === 'line' &&
        s.index !== 1 &&
        s.index !== bellyIndex,
    )
    .sort((a, b) => b.index - a.index)[0];
  if (!labelSlot) return null;
  const bodySlot = slots.find(
    (s) =>
      s.continuationGroup === groupId &&
      !s.hasLabel &&
      (s.inputKind ?? 'line') === 'line' &&
      s.index >= bodyStartIndex &&
      s.index !== 1 &&
      s.index !== bellyIndex,
  );
  if (!bodySlot || labelSlot.x <= bodySlot.x + INLINE_TAIL_MIN_X_GAP) return null;
  return labelSlot;
}

function filterPregnancyWeeklyPlanSpuriousBodySlots(bodySlots) {
  if (bodySlots.length < 3) return bodySlots;
  const indices = new Set(bodySlots.map((slot) => slot.index));
  if (indices.has(3) && indices.has(4) && indices.has(5)) {
    return bodySlots.filter((slot) => slot.index !== 5);
  }
  return bodySlots;
}

function resolveWeeklyFieldLineSlots(slots, startSlotIndex, lineCount, bellyIndex) {
  const startSlot = slots[startSlotIndex];
  if (!startSlot || lineCount <= 0) return [];
  const groupId = startSlot.continuationGroup;
  const bodySlots = filterPregnancyWeeklyPlanSpuriousBodySlots(
    slots
      .filter(
        (s) =>
          s.continuationGroup === groupId &&
          s.index >= startSlotIndex &&
          !s.hasLabel &&
          (s.inputKind ?? 'line') === 'line' &&
          s.index !== 1 &&
          s.index !== bellyIndex,
      )
      .sort((a, b) => a.index - b.index),
  );
  const labelTail = findInlineTail(slots, startSlotIndex, groupId, bellyIndex);
  const fieldSlots = labelTail ? [labelTail, ...bodySlots] : bodySlots;
  return fieldSlots.slice(0, lineCount);
}

function distributeWithinFieldLines(text, startSlotIndex, lineCount, slots, bellyIndex) {
  const fieldSlots = resolveWeeklyFieldLineSlots(
    slots,
    startSlotIndex,
    lineCount,
    bellyIndex,
  );
  const segments = [];
  let remaining = text.replace(/\r?\n/g, ' ');
  const headIndex = fieldSlots[0]?.index ?? startSlotIndex;
  for (const slot of fieldSlots) {
    if (!remaining) {
      segments.push({ slotIndex: slot.index, content: '' });
      continue;
    }
    const line = remaining;
    remaining = '';
    const content = slot.index === headIndex ? line : line.replace(/^\s+/, '');
    segments.push({ slotIndex: slot.index, content });
  }
  return segments;
}

const page = '9';
const rawBase = LINE_SLOTS.pregnancy_60[page];
const guidesBase = require('../constants/line-guides.json').pregnancy_60;
const raw = rawBase;
const guides = guidesBase[page];
const norms = refineWeeklyNorms(raw, guides, 6);
const slots = norms.map((n, index) => ({ ...n, index }));

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed += 1;
  } else {
    console.log('OK:', msg);
  }
}

const plansField = resolveWeeklyFieldLineSlots(slots, 3, 3, 6);
assert(
  plansField.map((s) => s.index).join(',') === '2,3,4',
  `plans field slots: ${plansField.map((s) => s.index).join(',')}`,
);

const plans = distributeWithinFieldLines(
  'отдыхать и радоваться',
  3,
  3,
  slots,
  6,
);
assert(
  plans[0]?.slotIndex === 2 && plans[0]?.content.includes('отдыхать'),
  `plans first segment on inline tail slot 2, got ${JSON.stringify(plans[0])}`,
);

const feelingsField = resolveWeeklyFieldLineSlots(slots, 8, 3, 6);
assert(
  feelingsField.map((s) => s.index).join(',') === '7,8,9',
  `feelings field slots: ${feelingsField.map((s) => s.index).join(',')}`,
);

const feelings = distributeWithinFieldLines(
  'тошнит иногда и живот болит',
  8,
  3,
  slots,
  6,
);
assert(
  feelings[0]?.slotIndex === 7 && feelings[0]?.content.includes('тошнит'),
  `feelings first segment on inline tail slot 7, got ${JSON.stringify(feelings[0])}`,
);

assert(
  slots[2].x > slots[3].x + INLINE_TAIL_MIN_X_GAP,
  'plans inline tail slot is to the right of body line left edge',
);

if (failed) process.exit(1);
console.log('\nAll distribute checks passed.');
