/* eslint-disable no-console */
/**
 * Аудит покрытия line-slots фиолетового дневника: PDF → JSON → runtime-фильтры.
 *
 * ONLY_ALBUM=diary_interior_purple node scripts/audit-purple-pdf-lines.js
 * ONLY_PAGE=20 node scripts/audit-purple-pdf-lines.js
 */
const fs = require('fs');
const path = require('path');

const { extractAllSlotsFromPdf } = require('./pdf-line-extractor');

const ALBUM_ID = 'diary_interior_purple';
const PDF_PATH = path.join('in albums', '09.06.26_Блок фиолетовый_180х240_print.pdf');

const DECOR_PAGES = new Set([2, 3, 20, 40]);
const QUESTIONNAIRE_PAGES = new Set([5, 6, 7]);
const PARENT_FORM_MIN = 8;
const PARENT_FORM_MAX = 39;

const PURPLE_JOURNAL_PAGES = new Set([
  9, 11, 13, 15, 17, 19, 23, 34, 35, 36, 37, 38, 39,
]);
const PURPLE_DAY_SPREAD_PAGES = new Set([24, 25, 26, 27]);

function loadJson(projectRoot, relativePath) {
  const file = path.join(projectRoot, relativePath);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function classifyPage(page) {
  if (page === 1) return 'cover';
  if (DECOR_PAGES.has(page)) return 'decor';
  if (QUESTIONNAIRE_PAGES.has(page)) return 'questionnaire';
  if (PURPLE_JOURNAL_PAGES.has(page)) return 'journal';
  if (PURPLE_DAY_SPREAD_PAGES.has(page)) return 'day_spread';
  if (page >= PARENT_FORM_MIN && page <= PARENT_FORM_MAX) return 'parent_form';
  if (page === 4) return 'intro';
  if (page === 21) return 'special';
  return 'other';
}

function isRuntimeFilteredPurpleSlot(page, slot, allSlots) {
  if (slot.hasLabel) return false;

  if (PURPLE_JOURNAL_PAGES.has(page)) {
    if (slot.y >= 0.25 && slot.y <= 0.3 && slot.x < 0.15 && slot.width >= 0.65) {
      return true;
    }
    if (slot.y >= 0.57 && slot.y <= 0.64 && slot.width >= 0.35 && slot.width <= 0.55) {
      return true;
    }
    if (slot.y >= 0.68 && slot.y <= 0.715 && slot.x < 0.15 && slot.width >= 0.65) {
      return true;
    }
  }

  const continuationPartner = allSlots.find(
    (c) =>
      c !== slot &&
      c.continuationGroup === slot.continuationGroup &&
      Math.abs(c.y - slot.y) > 0.015
  );
  if (continuationPartner) return false;

  return allSlots.some(
    (c) =>
      c !== slot &&
      Math.abs(c.y - slot.y) < 0.005 &&
      Math.min(c.x + c.width, slot.x + slot.width) - Math.max(c.x, slot.x) >
        Math.min(c.width, slot.width) * 0.8
  );
}

function auditPage(pageKey, jsonSlots, manualUsed) {
  const page = Number(pageKey);
  const pageType = classifyPage(page);
  const slots = jsonSlots ?? [];
  const issues = [];
  const runtimeFiltered = slots.filter((slot) =>
    isRuntimeFilteredPurpleSlot(page, slot, slots)
  );

  if (!slots.length) {
    const expectedEmpty = DECOR_PAGES.has(page);
    return {
      page: pageKey,
      pageType,
      slotCount: 0,
      runtimeFilteredCount: 0,
      visibleCount: 0,
      issues: expectedEmpty || manualUsed ? [] : [{ code: 'EMPTY_PAGE' }],
      manualOverride: manualUsed,
    };
  }

  const ys = [...slots].map((s) => s.y).sort((a, b) => a - b);
  for (let i = 1; i < ys.length; i += 1) {
    const gap = ys[i] - ys[i - 1];
    if (gap > 0.13) {
      issues.push({
        code: 'Y_GAP',
        detail: `gap ${gap.toFixed(3)} between y=${ys[i - 1].toFixed(3)} and y=${ys[i].toFixed(3)}`,
      });
    }
  }

  if (page === 1 && slots.length >= 2) {
    const groups = new Set(slots.map((s) => s.continuationGroup));
    if (groups.size < 2) {
      issues.push({ code: 'COVER_SAME_GROUP', detail: 'cover fields share continuationGroup' });
    }
  }

  const tailOnly = slots.filter((s) => s.x >= 0.35 && s.width < 0.55);
  const fullOnly = slots.filter((s) => s.x < 0.16 && s.width >= 0.72);
  for (const tail of tailOnly) {
    const paired = fullOnly.some(
      (full) =>
        full.y > tail.y + 0.02 &&
        full.y < tail.y + 0.06 &&
        full.continuationGroup === tail.continuationGroup
    );
    if (!paired) {
      issues.push({
        code: 'MISSING_TAIL_CONTINUATION',
        detail: `tail y=${tail.y.toFixed(3)} x=${tail.x.toFixed(2)} without full line below`,
      });
    }
  }

  if (runtimeFiltered.length) {
    issues.push({
      code: 'RUNTIME_FILTERED',
      detail: `${runtimeFiltered.length} slots hidden at runtime`,
    });
  }

  return {
    page: pageKey,
    pageType,
    slotCount: slots.length,
    runtimeFilteredCount: runtimeFiltered.length,
    visibleCount: slots.length - runtimeFiltered.length,
    issues,
    manualOverride: manualUsed,
  };
}

function buildPurplePdfOptions() {
  return {
    lineGuideId: ALBUM_ID,
    diaryBrownFormMode: true,
    diaryQuestionnairePageNumber: 5,
    diaryQuestionnairePageNumbers: [5, 6, 7],
    diaryCareerQuestionPageNumber: 5,
    brownWishPageNumber: 5,
    brownParentQuestionnaireMinPage: 8,
    brownParentQuestionnaireMaxPage: 39,
    inferLabelFromGeometry: true,
    brownSingleLineGroups: false,
    brownWishRelaxedColumn: true,
    brownWishMinJoinNormY: 0.69,
    brownWishFieldMinNormY: 0.772,
    brownWishFieldMaxNormY: 0.935,
    brownWishMaxEndNormY: 0.935,
    brownWideBlockMinNormY: 0.22,
    brownWideBlockMaxNormY: 0.935,
    brownWishContinuationLines: 4,
    brownWishTotalLines: 5,
    singleRowGroups: false,
    brownGroupRowGapMax: 0.055,
    brownGroupColumnEpsilon: 0.1,
    brownGroupMinLines: 2,
    brownSimpleMaxLines: 10,
    brownFullWidthMaxLines: 10,
    brownBoxMinLeftRatio: 0.05,
    maxLinesPerPage: 40,
    minUnderlineRunRatio: 0.08,
    mergeGapPt: 6,
    minSegmentSpanPt: 1.2,
    brownInputMinSpanRatio: 0.35,
    brownInputMinSpanFallback: 0.14,
    brownInputMinRightRatio: 0.85,
    brownInputMinRightShort: 0.45,
    brownInputMinGapRatio: 0.018,
    brownRowMergeGapNorm: 0.016,
    brownMinRowGapNorm: 0.018,
    brownFormEndNormY: 0.88,
    brownQuestionnaireStartNormY: 0.14,
    brownQuestionnaireEndNormY: 0.94,
    brownBoxMinSpanRatio: 0.18,
    brownBoxMaxSpanRatio: 0.52,
    brownBoxMaxLeftRatio: 0.28,
    brownBoxColumnSplitRatio: 0.5,
    brownCoverGapRatio: 0.055,
    brownCoverMinNormY: 0.48,
    brownCoverMaxNormY: 0.72,
    brownCoverMinLeftRatio: 0.14,
    brownCoverMaxLeftRatio: 0.55,
    brownCoverMinSpanRatio: 0.22,
    brownCoverMaxSpanRatio: 0.78,
    brownCoverRowGap: 0.055,
    brownInferLabelMaxLeftRatio: 0.58,
    brownInferLabelMaxSpanRatio: 0.78,
    brownInlineLabelMaxLeftRatio: 0.16,
    brownInlineLabelMaxSpanRatio: 0.48,
    brownGapMaxPreRightRatio: 0.78,
    brownSolidMinLeftRatio: 0.28,
    brownShortFullMinLeftRatio: 0.05,
    brownDashClusterGapRatio: 0.032,
    brownMicroRowMinTailSpan: 0.04,
    brownMicroRowMaxTailSpan: 0.32,
    brownCareerAnswerMinWidth: 0.35,
    brownCareerAnswerFirstNormY: 0.78,
    mergeDashedRows: true,
    collapseNearbyRows: true,
    formLineRefine: true,
    extractFlatCurves: true,
  };
}

async function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const lineSlots = loadJson(projectRoot, 'constants/line-slots.json') ?? {};
  const manual = loadJson(projectRoot, 'constants/line-slots-manual-overrides.json') ?? {};
  const albumManual = manual[ALBUM_ID] ?? {};
  const albumSlots = lineSlots[ALBUM_ID] ?? {};

  const onlyPage = process.env.ONLY_PAGE
    ? String(Number(process.env.ONLY_PAGE.match(/^page_(\d+)/i)?.[1] ?? process.env.ONLY_PAGE))
    : null;

  const pdfPath = path.join(projectRoot, PDF_PATH);
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF not found: ${pdfPath}`);
  }

  const pdfOptions = buildPurplePdfOptions();

  console.log('Extracting PDF slots...');
  const pdfSlots = await extractAllSlotsFromPdf(pdfPath, pdfOptions);

  const pages = Object.keys(pdfSlots)
    .map(Number)
    .filter((p) => !onlyPage || String(p) === onlyPage)
    .sort((a, b) => a - b);

  const report = {
    generatedAt: new Date().toISOString(),
    albumId: ALBUM_ID,
    pageCount: pages.length,
    totalPdfSlots: 0,
    totalJsonSlots: 0,
    totalRuntimeFiltered: 0,
    criticalPages: [],
    pages: {},
  };

  for (const pageKey of pages) {
    const key = String(pageKey);
    const pdfCount = (pdfSlots[key] ?? []).length;
    const jsonSlots = albumSlots[key] ?? pdfSlots[key] ?? [];
    const manualUsed = Object.prototype.hasOwnProperty.call(albumManual, key);
    const pageReport = auditPage(key, jsonSlots, manualUsed);
    pageReport.pdfSlotCount = pdfCount;
    pageReport.jsonSlotCount = jsonSlots.length;
    report.pages[key] = pageReport;
    report.totalPdfSlots += pdfCount;
    report.totalJsonSlots += jsonSlots.length;
    report.totalRuntimeFiltered += pageReport.runtimeFilteredCount;

    const critical = pageReport.issues.some((i) =>
      ['EMPTY_PAGE', 'COVER_SAME_GROUP'].includes(i.code)
    );
    if (critical) report.criticalPages.push(key);

    if (pageReport.issues.length) {
      console.log(
        `page ${key} [${pageReport.pageType}]: json=${jsonSlots.length} pdf=${pdfCount} visible=${pageReport.visibleCount} issues=${pageReport.issues.map((i) => i.code).join(',')}`
      );
    }
  }

  const outPath = path.join(projectRoot, 'scripts', 'purple-line-slots-gap-report.json');
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\nWrote ${outPath}`);
  console.log(
    `Total: pdf=${report.totalPdfSlots} json=${report.totalJsonSlots} runtimeFiltered=${report.totalRuntimeFiltered} critical=${report.criticalPages.length}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
