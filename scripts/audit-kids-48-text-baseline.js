#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Stroke Y vs line-guides for kids_48 (mirrors utils/textLineSlots + templateLineText).
 * node scripts/audit-kids-48-text-baseline.js
 * FAIL_ON_DRIFT=1 node scripts/audit-kids-48-text-baseline.js
 */
const lineSlots = require('../constants/line-slots.json');
const lineGuides = require('../constants/line-guides.json');

const BAND = 0.028;
const PAGE_MM = 210;
const VW = 2480;
const FAIL_ON_DRIFT = process.env.FAIL_ON_DRIFT === '1';
const DRIFT_MM = Number(process.env.DRIFT_MM ?? 0.8);

function isKidsMonthPage(page) {
  return page >= 22 && page <= 33;
}

function refineKids48GrowthWeightSlot(page, norm) {
  if (page !== 11 || norm.height <= BAND) return norm;
  const strokeY = norm.y;
  return {
    ...norm,
    y: strokeY - BAND,
    height: BAND,
    inputKind: 'line',
    lineStrokeAtBottom: true,
    textAnchorTop: true,
  };
}

function refineNorm(lineGuideId, page, norm) {
  if (lineGuideId !== 'kids_48') return norm;
  let refined = refineKids48GrowthWeightSlot(page, norm);
  const isBlock = refined.inputKind === 'block';
  const height = refined.height ?? 0.028;
  if (
    !isBlock &&
    !refined.hasLabel &&
    height <= 0.085 &&
    !refined.lineStrokeAtBottom
  ) {
    refined = { ...refined, inputKind: 'line' };
  }
  return refined;
}

function resolveKids48LineStrokeY(slot) {
  if (slot.lineStrokeAtBottom) {
    if (slot.page === 11 || (isKidsMonthPage(slot.page) && slot.index >= 1)) {
      return slot.y + slot.lineHeight;
    }
    if (slot.textAnchorTop) {
      return slot.y + slot.lineHeight;
    }
  }
  return slot.y + slot.lineHeight * 0.5;
}

function mapPageSlots(page, norms) {
  return norms.map((norm, index) => {
    const layoutNorm = refineNorm('kids_48', page, norm);
    const anchorTop =
      layoutNorm.textAnchorTop === true ||
      layoutNorm.lineStrokeAtBottom === true ||
      (isKidsMonthPage(page) && index >= 1);
    let topNormY;
    if (isKidsMonthPage(page) && index >= 1) {
      topNormY = layoutNorm.y - layoutNorm.height;
    } else if (layoutNorm.teethDate) {
      topNormY = layoutNorm.y;
    } else if (layoutNorm.strokeAtNormY) {
      // JSON y уже штрих (нижняя/верхняя «ДАТА») — как isKidsStrokeDateLineInputSlot.
      topNormY = layoutNorm.y - layoutNorm.height;
    } else if (anchorTop) {
      topNormY = layoutNorm.y;
    } else {
      topNormY = layoutNorm.y - layoutNorm.height / 2;
    }
    const lineStrokeAtBottom =
      layoutNorm.lineStrokeAtBottom === true ||
      (isKidsMonthPage(page) && index >= 1) ||
      page === 11;
    return {
      index,
      page,
      y: topNormY * VW,
      lineHeight: layoutNorm.height * VW,
      inputKind: layoutNorm.inputKind ?? 'line',
      textAnchorTop: anchorTop,
      lineStrokeAtBottom,
      teethDate: layoutNorm.teethDate === true,
    };
  });
}

function getStrokeY(slot) {
  if (slot.inputKind === 'block' && slot.textAnchorTop) {
    return null;
  }
  if (slot.teethDate) {
    return slot.y + slot.lineHeight;
  }
  return resolveKids48LineStrokeY(slot);
}

function audit() {
  const guides = lineGuides.kids_48;
  const slots = lineSlots.kids_48;
  const issues = [];

  for (const [pageKey, norms] of Object.entries(slots)) {
    const page = Number(pageKey);
    const pageGuides = guides[pageKey] ?? [];
    if (!pageGuides.length) continue;
    const mapped = mapPageSlots(page, norms);
    for (const slot of mapped) {
      const guide = pageGuides[slot.index];
      if (guide == null) continue;
      const stroke = getStrokeY(slot);
      if (stroke == null || slot.inputKind === 'block') continue;
      const strokeNorm = stroke / VW;
      const driftMm = Math.abs(strokeNorm - guide) * PAGE_MM;
      if (driftMm > DRIFT_MM) {
        issues.push({
          page,
          index: slot.index,
          driftMm: Number(driftMm.toFixed(2)),
          guide,
          strokeNorm: Number(strokeNorm.toFixed(5)),
          inputKind: slot.inputKind,
        });
      }
    }
  }

  issues.sort((a, b) => b.driftMm - a.driftMm);
  console.log(
    `[audit:kids-48-text-baseline] ${issues.length ? 'FAIL' : 'OK'}: ` +
      `${issues.length} slot(s) over ${DRIFT_MM}mm`,
  );
  for (const issue of issues.slice(0, 40)) {
    console.log(
      `  p${issue.page} slot ${issue.index}: ${issue.driftMm}mm ` +
        `(guide=${issue.guide.toFixed(5)} stroke=${issue.strokeNorm}) ` +
        `kind=${issue.inputKind}`,
    );
  }
  if (issues.length > 40) {
    console.log(`  ... and ${issues.length - 40} more`);
  }

  if (FAIL_ON_DRIFT && issues.length) process.exit(1);
}

audit();
