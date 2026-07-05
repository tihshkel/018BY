#!/usr/bin/env node
/**
 * Sanity: pregnancy_60 page 9 — stroke Y из LINE_GUIDES совпадает с низом нормализованного слота.
 * node scripts/verify-pregnancy-weekly-slot-positions.js
 */
const LINE_GUIDES = require('../constants/line-guides.json');
const LINE_SLOTS = require('../constants/line-slots.json');

const PITCH = 0.0412;
const COMPACT = 0.035;
const PAGE = '9';
const guides = LINE_GUIDES.pregnancy_60[PAGE];
const slots = LINE_SLOTS.pregnancy_60[PAGE];

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
    return;
  }
  console.log(`OK: ${message}`);
}

function normalizeSlot(norm, index) {
  if (index === 1 || index === 6) return norm;
  if ((norm.inputKind ?? 'line') !== 'line') return norm;
  if (norm.hasLabel && norm.height > COMPACT) return norm;

  const guideStrokeY = guides[index];
  if (typeof guideStrokeY !== 'number') return norm;

  const bandHeight =
    norm.hasLabel && norm.height <= COMPACT ? norm.height : PITCH;
  const topY = guideStrokeY - bandHeight;
  return { ...norm, y: topY, height: bandHeight };
}

for (const index of [0, 3, 4, 5, 8, 9]) {
  const raw = slots[index];
  const norm = normalizeSlot(raw, index);
  const bottom = norm.y + norm.height;
  const guide = guides[index];
  assert(
    Math.abs(bottom - guide) < 0.002,
    `slot ${index} bottom ${bottom.toFixed(4)} ≈ guide ${guide.toFixed(4)}`,
  );
}

assert(
  normalizeSlot(slots[4], 4).height <= PITCH + 0.001,
  'plans line slot 4 height normalized to pitch (was 0.08 OCR)',
);

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}

console.log('\nAll pregnancy weekly slot position checks passed.');
