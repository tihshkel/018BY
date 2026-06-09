/* eslint-disable no-console */
/**
 * Аудит покрытия line-slots коричневого дневника: PDF → JSON → runtime-фильтры.
 *
 * ONLY_ALBUM=diary_interior_brown node scripts/audit-brown-pdf-lines.js
 * ONLY_PAGE=24 node scripts/audit-brown-pdf-lines.js
 */
const fs = require('fs');
const path = require('path');

const { extractAllSlotsFromPdf } = require('./pdf-line-extractor');

const ALBUM_ID = 'diary_interior_brown';
const PDF_PATH = path.join('in albums', '09.06.26_Блок коричневый _180х240_print.pdf');

const BROWN_JOURNAL_PAGES = new Set([
  16, 20, 23, 25, 28, 33,
  45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56,
]);

function loadJson(projectRoot, relativePath) {
  const file = path.join(projectRoot, relativePath);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function isRuntimeFilteredBrownSlot(page, slot, allSlots) {
  if (slot.hasLabel) return false;

  if (page === 13) {
    if (
      slot.y >= 0.34 &&
      slot.y <= 0.39 &&
      slot.x >= 0.65 &&
      slot.width >= 0.08 &&
      slot.width <= 0.25
    ) {
      return true;
    }
  }

  if (page === 16) {
    if (slot.y >= 0.695 && slot.y <= 0.715 && slot.x >= 0.08 && slot.width >= 0.65) {
      return true;
    }
  }

  if (page === 17) {
    if (
      slot.y >= 0.238 &&
      slot.y <= 0.252 &&
      slot.x >= 0.4 &&
      slot.width >= 0.35 &&
      slot.width <= 0.52
    ) {
      return true;
    }
  }

  if (page === 31) {
    if (slot.y >= 0.548 && slot.y <= 0.562 && slot.x < 0.35 && slot.width >= 0.55) {
      return true;
    }
  }

  if (BROWN_JOURNAL_PAGES.has(page)) {
    if (slot.y >= 0.57 && slot.y <= 0.64 && slot.width >= 0.35 && slot.width <= 0.55) {
      return true;
    }
    if (slot.y >= 0.68 && slot.y <= 0.715 && slot.x < 0.15 && slot.width >= 0.65) {
      return true;
    }
  }

  if (page >= 34 && page <= 40) {
    if (slot.y >= 0.14 && slot.y <= 0.22 && slot.x < 0.15 && slot.width >= 0.55) {
      return true;
    }
    if (slot.y >= 0.52 && slot.y <= 0.68 && slot.x < 0.15 && slot.width >= 0.55) {
      return true;
    }
    if (slot.y >= 0.55 && slot.y <= 0.67 && slot.x >= 0.35 && slot.width <= 0.28) {
      return true;
    }
  }

  if (page === 24 && slot.y >= 0.915 && slot.x < 0.2 && slot.width >= 0.65) {
    return true;
  }

  if (page === 17) return false;
  if (slot.hasLabel) return false;

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
  const slots = jsonSlots ?? [];
  const issues = [];
  const runtimeFiltered = slots.filter((slot) => isRuntimeFilteredBrownSlot(Number(pageKey), slot, slots));

  if (!slots.length) {
    return {
      page: pageKey,
      slotCount: 0,
      runtimeFilteredCount: 0,
      visibleCount: 0,
      issues: manualUsed ? [] : [{ code: 'EMPTY_PAGE' }],
      manualOverride: manualUsed,
    };
  }

  const ys = [...slots].map((s) => s.y).sort((a, b) => a - b);
  for (let i = 1; i < ys.length; i += 1) {
    const gap = ys[i] - ys[i - 1];
    if (gap > 0.13) {
      issues.push({ code: 'Y_GAP', detail: `gap ${gap.toFixed(3)} between y=${ys[i - 1].toFixed(3)} and y=${ys[i].toFixed(3)}` });
    }
  }

  const tailOnly = slots.filter((s) => s.x >= 0.35 && s.width < 0.55);
  const fullOnly = slots.filter((s) => s.x < 0.16 && s.width >= 0.72);
  for (const tail of tailOnly) {
    const paired = fullOnly.some(
      (full) =>
        full.y > tail.y + 0.02 &&
        full.y < tail.y + 0.06 &&
        (full.continuationGroup === tail.continuationGroup || tail.continuationGroup == null)
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
    slotCount: slots.length,
    runtimeFilteredCount: runtimeFiltered.length,
    visibleCount: slots.length - runtimeFiltered.length,
    issues,
    manualOverride: manualUsed,
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

  const pdfOptions = {
    diaryBrownFormMode: true,
    diaryQuestionnairePageNumber: 6,
    brownParentQuestionnaireMinPage: 7,
    brownParentQuestionnaireMaxPage: 56,
    inferLabelFromGeometry: true,
    brownGroupRowGapMax: 0.055,
    brownSimpleMaxLines: 10,
    maxLinesPerPage: 40,
    brownGapMaxPreRightRatio: 0.78,
    brownInferLabelMaxLeftRatio: 0.58,
    brownInlineLabelMaxLeftRatio: 0.16,
    brownShortFullMinLeftRatio: 0.05,
    brownDashClusterGapRatio: 0.032,
    brownMicroRowMinTailSpan: 0.04,
  };

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

    if (pageReport.issues.length) {
      console.log(
        `page ${key}: json=${jsonSlots.length} pdf=${pdfCount} visible=${pageReport.visibleCount} issues=${pageReport.issues.map((i) => i.code).join(',')}`
      );
    }
  }

  const outPath = path.join(projectRoot, 'scripts', 'brown-line-slots-gap-report.json');
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\nWrote ${outPath}`);
  console.log(
    `Total: pdf=${report.totalPdfSlots} json=${report.totalJsonSlots} runtimeFiltered=${report.totalRuntimeFiltered}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
