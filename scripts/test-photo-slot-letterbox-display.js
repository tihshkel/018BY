#!/usr/bin/env node
/**
 * Portrait-in-landscape letterbox should fill on preview/export display.
 * Frame fit hugs photo aspect so resize handles match the visible photo.
 * node scripts/test-photo-slot-letterbox-display.js
 */
const assert = require('assert');

// Mirror of resolvePhotoSlotTransformForDisplay (keep in sync with utils/photoSlotInitialTransform.ts)
const DEFAULT = { scale: 1, offsetX: 0, offsetY: 0 };
const LEGACY_TOL = 0.08;
const OFFSET_EPS = 0.001;

function computePhotoCoverSize(slotW, slotH, aspect) {
  const slotAspect = slotW / slotH;
  if (aspect > slotAspect) return { width: slotH * aspect, height: slotH };
  return { width: slotW, height: slotW / aspect };
}

function computePhotoContainScale(slotW, slotH, aspect) {
  const cover = computePhotoCoverSize(slotW, slotH, aspect);
  return Math.min(slotW / cover.width, slotH / cover.height);
}

function resolve(transform, slotW, slotH, aspect, fillLetterbox) {
  const base = transform ?? DEFAULT;
  const scale = base.scale ?? 1;
  const offsetX = base.offsetX ?? 0;
  const offsetY = base.offsetY ?? 0;
  const hasPan = Math.abs(offsetX) >= OFFSET_EPS || Math.abs(offsetY) >= OFFSET_EPS;

  if (fillLetterbox && scale < 1) {
    return { ...DEFAULT };
  }

  if (!aspect || aspect <= 0 || slotW <= 0 || slotH <= 0) {
    return base;
  }

  if (!hasPan && scale < 1) {
    const minContain = computePhotoContainScale(slotW, slotH, aspect);
    if (Math.abs(scale - minContain) < LEGACY_TOL) return { ...DEFAULT };
  }
  return base;
}

/** Mirror of fitSlotRectToImageAspect (utils/photoBlockLayout.ts) */
function fitSlotRectToImageAspect(slot, imageAspect) {
  if (imageAspect <= 0 || slot.width <= 0 || slot.height <= 0) return slot;
  const slotAspect = slot.width / slot.height;
  if (Math.abs(slotAspect - imageAspect) < 0.04) return slot;
  if (imageAspect < slotAspect) {
    const width = slot.height * imageAspect;
    return {
      x: slot.x + (slot.width - width) / 2,
      y: slot.y,
      width,
      height: slot.height,
    };
  }
  const height = slot.width / imageAspect;
  return {
    x: slot.x,
    y: slot.y + (slot.height - height) / 2,
    width: slot.width,
    height,
  };
}

const slotW = 200;
const slotH = 150; // 4:3 landscape
const portraitAspect = 3 / 4;
const contain = computePhotoContainScale(slotW, slotH, portraitAspect);

assert.ok(contain < 1, `contain should be < 1 for portrait in landscape, got ${contain}`);

const letterbox = { scale: contain, offsetX: 0, offsetY: 0 };
const midZoom = { scale: (contain + 1) / 2, offsetX: 0, offsetY: 0 };
const panned = { scale: contain, offsetX: 0.1, offsetY: 0 };

assert.strictEqual(
  resolve(letterbox, slotW, slotH, portraitAspect, true).scale,
  1,
  'preview fills contain letterbox',
);
assert.strictEqual(
  resolve(midZoom, slotW, slotH, portraitAspect, true).scale,
  1,
  'preview fills mid letterbox zoom',
);
assert.strictEqual(
  resolve(letterbox, slotW, slotH, portraitAspect, false).scale,
  1,
  'editor still upgrades exact legacy contain',
);
assert.ok(
  resolve(midZoom, slotW, slotH, portraitAspect, false).scale < 1,
  'editor keeps intentional mid zoom-out',
);
assert.strictEqual(
  resolve(panned, slotW, slotH, portraitAspect, true).scale,
  1,
  'preview fills letterbox even when user panned',
);
assert.strictEqual(
  resolve(letterbox, slotW, slotH, undefined, true).scale,
  1,
  'preview fills letterbox before aspect loads',
);

const landscapePin = { x: 40, y: 100, width: 300, height: 200 };
const fitted = fitSlotRectToImageAspect(landscapePin, portraitAspect);
assert.ok(fitted.width < landscapePin.width, 'portrait fit shrinks width');
assert.strictEqual(fitted.height, landscapePin.height, 'portrait fit keeps pin height');
assert.ok(
  Math.abs(fitted.width / fitted.height - portraitAspect) < 0.01,
  'fitted frame matches photo aspect',
);

const maxScaleInZoom = Math.min(0.83 / (fitted.width / 390), 0.87 / (fitted.height / 520));
assert.ok(maxScaleInZoom > 1.2, `fitted portrait should enlarge within page safe zone, got ${maxScaleInZoom}`);

console.log('OK: portrait letterbox display fill + frame fit');
console.log(
  `  landscape slot ${slotW}x${slotH}, portrait aspect ${portraitAspect}, contain=${contain.toFixed(3)}`,
);
console.log(
  `  fitted frame ${fitted.width.toFixed(1)}x${fitted.height.toFixed(1)} from pin ${landscapePin.width}x${landscapePin.height}`,
);
