#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Вместимость линованных страниц pregnancy_60: p53 «История родов», p60 «Письмо малышу».
 * node scripts/test-pregnancy-ruled-notebook-capacity.js
 */
const path = require('path');

const core = require('./lib/text-capacity-core');

const LINE_SLOTS = require('../constants/line-slots.json');
const LINE_GUIDES = require('../constants/line-guides.json');
const ROOT = path.join(__dirname, '..');

const FONT_ID = 'AmaticSC-Bold';
const FONT_SIZE = 16;
const LINE_GUIDE_ID = 'pregnancy_60';

const PAGES = [
  {
    page: 53,
    fieldId: 'pregnancy_60_p53_story',
    lineStart: 0,
    lineCount: 15,
    title: 'История родов',
  },
  {
    page: 60,
    fieldId: 'pregnancy_60_p60_letter_text',
    lineStart: 0,
    lineCount: 12,
    title: 'Письмо малышу',
  },
];

function auditPage(spec) {
  const norms = LINE_SLOTS[LINE_GUIDE_ID][String(spec.page)] ?? [];
  const slots = core.normSlotsToViewportSlots(
    LINE_GUIDE_ID,
    spec.page,
    norms,
    LINE_GUIDES,
  );
  const fieldSlots = core.resolveWeeklyFieldLineSlots(
    slots,
    spec.lineStart,
    spec.lineCount,
    LINE_GUIDE_ID,
  );
  const fontTable = core.loadFontCharWidths(ROOT);

  const limit = core.clampTextToFieldLines({
    text: core.FIELD_LIMIT_PROBE_CYRILLIC,
    startSlotIndex: spec.lineStart,
    lineCount: spec.lineCount,
    slots,
    fontSize: FONT_SIZE,
    lineGuideId: LINE_GUIDE_ID,
    fontId: FONT_ID,
    fontTable,
  }).length;

  const sample =
    'Сыночек ты у нас уже совсем большой мы очень любим тебя и ценим всегда будем поддерживать тебя ';
  const { segments, truncated } = core.distributeTextWithinFieldLines({
    text: sample.repeat(Math.ceil(limit / 40)),
    startSlotIndex: spec.lineStart,
    lineCount: spec.lineCount,
    slots,
    fontSize: FONT_SIZE,
    lineGuideId: LINE_GUIDE_ID,
    fontId: FONT_ID,
    fontTable,
  });

  const phoneScale = 370 / core.REFERENCE_VIEWPORT.width;
  const phoneSlots = slots.map((slot) => ({
    ...slot,
    x: slot.x * phoneScale,
    y: slot.y * phoneScale,
    width: slot.width * phoneScale,
    lineHeight: slot.lineHeight * phoneScale,
  }));
  const phoneLimit = core.clampTextToFieldLines({
    text: core.FIELD_LIMIT_PROBE_CYRILLIC,
    startSlotIndex: spec.lineStart,
    lineCount: spec.lineCount,
    slots: phoneSlots,
    fontSize: FONT_SIZE,
    lineGuideId: LINE_GUIDE_ID,
    fontId: FONT_ID,
    fontTable,
  }).length;

  const firstSlotIndex = fieldSlots[0]?.index ?? spec.lineStart;
  const perLine = segments
    .filter((segment) => segment.content)
    .map((segment) => ({
      slot: segment.slotIndex,
      chars: segment.content.length,
      preview: segment.content.slice(0, 48),
    }));

  const slotWidthPx = fieldSlots[0]?.width ?? 0;
  const lineWidthPx = core.getEffectiveLineWidthPx(fieldSlots[0] ?? { width: slotWidthPx }, LINE_GUIDE_ID);

  console.log(`\n=== p${spec.page} ${spec.title} ===`);
  console.log(`Строк поля: ${spec.lineCount}, слотов: ${fieldSlots.length}`);
  console.log(`Первый слот: index=${firstSlotIndex} (ожидается ${spec.lineStart})`);
  console.log(`Ширина строки: ~${Math.round(lineWidthPx)} px (слот ${Math.round(slotWidthPx)} px)`);
  console.log(`Макс. символов (экспорт 2480px): ${limit}`);
  console.log(`Макс. символов (предпросмотр ~370px): ${phoneLimit}`);
  console.log(`Символов на строку (первые ${Math.min(5, perLine.length)}): ${perLine.slice(0, 5).map((row) => row.chars).join(', ')}`);
  console.log(`Truncated на лимите: ${truncated}`);

  const slot0NormX = (fieldSlots[0]?.x ?? 0) / core.REFERENCE_VIEWPORT.width;
  const expectedNormX = norms[spec.lineStart]?.x ?? 0;
  console.log(`X первой строки (norm): ${slot0NormX.toFixed(4)} (OCR ${expectedNormX})`);

  if (Math.abs(slot0NormX - expectedNormX) > 0.002) {
    console.error(`FAIL: x первой строки ${slot0NormX.toFixed(4)} != OCR ${expectedNormX}`);
    process.exitCode = 1;
  }

  if (firstSlotIndex !== spec.lineStart) {
    console.error(`FAIL: текст не начинается со слота ${spec.lineStart}`);
    process.exitCode = 1;
  }
  if (fieldSlots.length !== spec.lineCount) {
    console.error(`FAIL: ожидалось ${spec.lineCount} слотов, получено ${fieldSlots.length}`);
    process.exitCode = 1;
  }
  if (truncated) {
    console.error('FAIL: лимит обрезает probe-текст');
    process.exitCode = 1;
  }
}

for (const spec of PAGES) {
  auditPage(spec);
}

console.log('\nDone.');
