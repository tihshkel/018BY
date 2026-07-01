#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Записывает PNG-калибровку month pages в line-slots-manual-overrides.json.
 * node scripts/calibrate-kids-month-line-slots.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OVERRIDES_PATH = path.join(ROOT, 'constants/line-slots-manual-overrides.json');
const LINE_SLOTS = require('../constants/line-slots.json');

const STANDARD = {
  loveX: 0.278,
  loveWidth: 0.56,
  canX: 0.262,
  canWidth: 0.576,
  loveY: 0.1677,
  canY: 0.2195,
  bandHeight: 0.028,
};

const P33 = {
  loveX: 0.281,
  loveWidth: 0.56,
  canX: 0.265,
  canWidth: 0.576,
  loveY: 0.2559,
  canY: 0.3078,
  bandHeight: 0.028,
};

function buildMonthPageSlots(pageNumber, layout) {
  const existing = LINE_SLOTS.kids_48[String(pageNumber)] ?? [];
  const titleSlot = existing[0] ?? {
    x: 0.27409,
    y: 0.16037,
    width: 0.57143,
    height: 0.028,
    hasLabel: false,
  };

  return [
    {
      ...titleSlot,
      height: layout.bandHeight,
      continuationGroup: 0,
    },
    {
      x: layout.loveX,
      y: layout.loveY,
      width: layout.loveWidth,
      height: layout.bandHeight,
      hasLabel: false,
      continuationGroup: 1,
      inputKind: 'line',
    },
    {
      x: layout.canX,
      y: layout.canY,
      width: layout.canWidth,
      height: layout.bandHeight,
      hasLabel: false,
      continuationGroup: 2,
      inputKind: 'line',
    },
  ];
}

const overrides = JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf8'));
overrides.kids_48 = overrides.kids_48 ?? {};

for (let page = 22; page <= 32; page += 1) {
  overrides.kids_48[String(page)] = buildMonthPageSlots(page, STANDARD);
}
overrides.kids_48['33'] = buildMonthPageSlots(33, P33);

fs.writeFileSync(OVERRIDES_PATH, `${JSON.stringify(overrides, null, 2)}\n`);
console.log('Updated manual overrides for kids_48 pages 22–33');
