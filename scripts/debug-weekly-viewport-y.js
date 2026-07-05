#!/usr/bin/env node
/**
 * Viewport Y слотов page 9 — сверка stroke с LINE_GUIDES.
 */
const LINE_SLOTS = require('../constants/line-slots.json');
const LINE_GUIDES = require('../constants/line-guides.json');

const COMPACT = 0.035;
const PITCH = 0.0412;
const SOURCE_W = 2126;
const SOURCE_H = 2835;
const VW = 390;
const VH = 520;

function getContentRect(vw, vh, sw, sh) {
  const sa = sw / sh;
  const va = vw / vh;
  if (sa > va) {
    const w = vw;
    const h = vw / sa;
    return { offsetX: 0, offsetY: (vh - h) / 2, width: w, height: h };
  }
  const h = vh;
  const w = vh * sa;
  return { offsetX: (vw - w) / 2, offsetY: 0, width: w, height: h };
}

function mapNorm(nx, ny, nw, nh, rect) {
  return {
    x: rect.offsetX + nx * rect.width,
    y: rect.offsetY + ny * rect.height,
    width: nw * rect.width,
    height: nh * rect.height,
  };
}

function refineWeekly(norms, guides, bellyIndex) {
  return norms.map((norm, index) => {
    if (index === 1 || index === bellyIndex) return norm;
    if ((norm.inputKind ?? 'line') !== 'line') return norm;
    if (norm.hasLabel && norm.height > COMPACT) return norm;
    const g = guides[index];
    if (typeof g !== 'number') return norm;
    const h = norm.hasLabel && norm.height <= COMPACT ? norm.height : PITCH;
    return { ...norm, y: g - h, height: h, lineStrokeAtBottom: true, textAnchorTop: true };
  });
}

const rect = getContentRect(VW, VH, SOURCE_W, SOURCE_H);
const guides = LINE_GUIDES.pregnancy_60['9'];
const norms = refineWeekly(LINE_SLOTS.pregnancy_60['9'], guides, 6);

const CAP = 0.96;
const FONT = 16;

console.log('contentRect', rect);
for (const idx of [0, 3, 4, 8]) {
  const n = norms[idx];
  const topNormY = n.y;
  const mapped = mapNorm(n.x, topNormY, n.width, n.height, rect);
  const strokeFromBottom = mapped.y + mapped.height;
  const strokeFromGuide = rect.offsetY + guides[idx] * rect.height;
  const textTop = strokeFromBottom - FONT * CAP;
  console.log(
    `slot ${idx}: guide=${guides[idx].toFixed(4)} stroke=${strokeFromBottom.toFixed(1)} textTop=${textTop.toFixed(1)} delta=${(strokeFromBottom - strokeFromGuide).toFixed(2)}`,
  );
}

// If text appears one line low, compare slot 3 stroke vs guide 4
const s3 = mapNorm(norms[3].x, norms[3].y, norms[3].width, norms[3].height, rect);
const g4stroke = rect.offsetY + guides[4] * rect.height;
console.log(`slot3 stroke=${(s3.y + s3.height).toFixed(1)} vs guide4=${g4stroke.toFixed(1)} diff=${((s3.y + s3.height) - g4stroke).toFixed(1)}`);
