#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Sanity check: month-page text slots vs LINE_GUIDES stroke Y.
 * node scripts/kids-month-text-layout-check.js
 */
const lineSlots = require('../constants/line-slots.json');
const lineGuides = require('../constants/line-guides.json');

const BAND = 0.028;
const INSET = 0.008;
const FONT = 16;
const FONT_OFFSET = 0.86;
const PAGE_MM = 210;

function getContentRect(vw, vh, sw, sh) {
  const scale = Math.min(vw / sw, vh / sh);
  const width = sw * scale;
  const height = sh * scale;
  return {
    offsetX: (vw - width) / 2,
    offsetY: (vh - height) / 2,
    width,
    height,
  };
}

function mapNorm(nx, ny, nw, nh, rect) {
  return {
    x: rect.offsetX + nx * rect.width,
    y: rect.offsetY + ny * rect.height,
    width: nw * rect.width,
    height: nh * rect.height,
  };
}

function simulatePage(page, vw = 360, vh = 360) {
  const sw = 2480;
  const sh = 2480;
  const rect = getContentRect(vw, vh, sw, sh);
  const norms = lineSlots.kids_48[String(page)];
  const guideYs = lineGuides.kids_48[String(page)];

  console.log(`\n=== p${page} (viewport ${vw}x${vh}) ===`);

  for (let index = 0; index < norms.length; index += 1) {
    const norm = norms[index];
    const height = index >= 1 ? BAND : norm.height;
    const x = Math.min(0.98, norm.x + INSET);
    const width = Math.max(0.12, Math.min(0.92, norm.x + norm.width) - x);
    const topNormY =
      index >= 1 ? norm.y - height : norm.y - height / 2;
    const mapped = mapNorm(x, topNormY, width, height, rect);
    const strokeAtBottom = index >= 1;
    const lineY = strokeAtBottom
      ? mapped.y + mapped.height
      : mapped.y + mapped.height / 2;
    const textTop = lineY - FONT * FONT_OFFSET;
    const guideY = guideYs[index];
    const guidePx =
      rect.offsetY + (guideY ?? norm.y) * rect.height;

    if (index === 0) continue;

    console.log(
      `slot ${index}: stroke normY=${norm.y.toFixed(5)} guide=${guideY?.toFixed(5)}`,
    );
    console.log(
      `  line px=${lineY.toFixed(1)} guide px=${guidePx.toFixed(1)} delta=${(textTop - guidePx + FONT * 0.75).toFixed(1)}px (baseline est)`,
    );
    console.log(
      `  x mm=${((mapped.x - rect.offsetX) / rect.width * PAGE_MM).toFixed(1)} width mm=${(mapped.width / rect.width * PAGE_MM).toFixed(1)}`,
    );
  }
}

for (const page of [22, 27, 33]) {
  simulatePage(page);
}
