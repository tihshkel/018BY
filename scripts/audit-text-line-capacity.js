#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Audit text line capacity vs slot geometry for all designed albums.
 * node scripts/audit-text-line-capacity.js
 * FAIL_ON_ERROR=1 node scripts/audit-text-line-capacity.js
 */
const fs = require('fs');
const path = require('path');

const {
  ALBUM_IDS,
  BLOCKING_ISSUE_CODES,
  FIELD_LIMIT_PROBE_CYRILLIC,
  computeLayoutCharacterLimit,
  expectedMinLineWidth,
  loadAlbumSchemas,
  loadFontCharWidths,
  loadLineGuides,
  normSlotsToViewportSlots,
  textFitsInSlot,
  getTypography,
} = require('./lib/text-capacity-core');

const ROOT = path.join(__dirname, '..');
const FAIL_ON_ERROR = process.env.FAIL_ON_ERROR === '1';
const ONLY_ALBUM = process.env.ONLY_ALBUM;

const DEFAULT_FONT_ID = 'Nefelibata-Sans';
const SLOT_NARROW_RATIO = 0.08;
const LIMIT_UNDER_CAPACITY_RATIO = 0.9;
const BASELINE_DRIFT_MM = 1.5;

function loadLineSlots() {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, 'constants/line-slots.json'), 'utf8'),
  );
}

function getPageSizeMm(albumId) {
  if (albumId === 'diary_interior_brown' || albumId === 'diary_interior_purple') {
    return 210;
  }
  return 210;
}

function auditField(params) {
  const {
    albumId,
    page,
    field,
    slots,
    fontTable,
    lineGuides,
    norms,
  } = params;

  const issues = [];
  if (field.type === 'radio') return issues;
  if (field.type === 'date' || field.type === 'time') return issues;

  const lineCount = field.templateLineStart + (field.templateLineCount ?? 1);
  const fieldSlots = slots.slice(field.templateLineStart, lineCount);
  if (fieldSlots.length === 0) return issues;

  const profile = getTypography(albumId);
  const fontSize = profile.fixedLineFontSize ?? 16;
  const heuristicLimit = computeLayoutCharacterLimit(
    field,
    albumId,
    page,
    slots,
    DEFAULT_FONT_ID,
    null,
  );
  const exportLimit = computeLayoutCharacterLimit(
    field,
    albumId,
    page,
    slots,
    DEFAULT_FONT_ID,
    fontTable,
  );

  if (
    exportLimit != null &&
    heuristicLimit != null &&
    heuristicLimit < Math.floor(exportLimit * LIMIT_UNDER_CAPACITY_RATIO)
  ) {
    issues.push({
      code: 'LIMIT_UNDER_CAPACITY',
      fieldId: field.fieldId,
      detail: `heuristic=${heuristicLimit} export=${exportLimit}`,
    });
  }

  for (let i = 0; i < fieldSlots.length; i += 1) {
    const norm = norms[field.templateLineStart + i];
    if (!norm) continue;

    const minWidth = expectedMinLineWidth(albumId, norm, field);
    const skipNarrowCheck =
      field.fieldId.includes('_todo_') ||
      field.fieldId.includes('careerWish') ||
      field.fieldId.endsWith('_owner_name') ||
      ((field.fieldId.endsWith('_height') || field.fieldId.endsWith('_weight')) &&
        norm.width < 0.12);
    if (!skipNarrowCheck && norm.width < minWidth - SLOT_NARROW_RATIO) {
      issues.push({
        code: 'SLOT_NARROW',
        fieldId: field.fieldId,
        slotIndex: field.templateLineStart + i,
        detail: `width=${norm.width.toFixed(3)} expected>=${minWidth.toFixed(3)}`,
      });
    }

    const guideY = lineGuides?.[String(page)]?.[field.templateLineStart + i];
    if (guideY != null) {
      const slotCenterY = norm.y + (norm.height ?? 0.028) / 2;
      const driftMm = Math.abs((slotCenterY - guideY) * getPageSizeMm(albumId));
      if (driftMm > BASELINE_DRIFT_MM) {
        issues.push({
          code: 'BASELINE_DRIFT',
          fieldId: field.fieldId,
          slotIndex: field.templateLineStart + i,
          detail: `slotY=${norm.y.toFixed(4)} guideY=${guideY.toFixed(4)} driftMm=${driftMm.toFixed(1)}`,
        });
      }
    }

    if (field.type === 'measurement' || field.fieldId.includes('teeth_count')) {
      return issues;
    }

    const probe = 'БЫЛО БОЛЬНО И ДОЛГО 21.11.2026';
    if (!textFitsInSlot(probe, fieldSlots[i], fontSize, albumId, DEFAULT_FONT_ID, fontTable)) {
      const shortProbe = probe.slice(0, Math.max(exportLimit ?? 8, 8));
      if (textFitsInSlot(shortProbe, fieldSlots[i], fontSize, albumId, DEFAULT_FONT_ID, fontTable)) {
        issues.push({
          code: 'PREVIEW_OVERFLOW',
          fieldId: field.fieldId,
          slotIndex: field.templateLineStart + i,
          detail: `probe truncated at ~${shortProbe.length} chars`,
        });
      }
    }
  }

  return issues;
}

function auditAlbum(albumId, lineSlots, lineGuides, fontTable) {
  const schemas = loadAlbumSchemas(ROOT, albumId);
  const albumSlots = lineSlots[albumId] ?? {};
  const albumGuides = lineGuides[albumId] ?? {};
  const pages = [];

  for (const schema of schemas) {
    if (!schema.editable) continue;
    const pageKey = String(schema.sourcePageNumber);
    const norms = albumSlots[pageKey] ?? [];
    if (!norms.length) continue;

    const slots = normSlotsToViewportSlots(albumId, schema.sourcePageNumber, norms, lineGuides);
    const fields = schema.fields ?? [];
    const issues = [];

    for (const field of fields) {
      issues.push(
        ...auditField({
          albumId,
          page: schema.sourcePageNumber,
          field,
          slots,
          fontTable,
          lineGuides: albumGuides,
          norms,
        }),
      );
    }

  const blockingIssues = issues.filter((issue) => BLOCKING_ISSUE_CODES.has(issue.code));

  pages.push({
    page: pageKey,
    title: schema.title,
    slotCount: norms.length,
    fieldCount: fields.length,
    issues,
    blockingIssues,
    ok: blockingIssues.length === 0,
  });
  }

  const issuePages = pages.filter((p) => !p.ok).length;
  return {
    albumId,
    pageCount: pages.length,
    issuePages,
    pages,
  };
}

function renderMarkdown(report) {
  const lines = ['# Text line capacity audit', ''];
  for (const album of report.albums) {
    lines.push(`## ${album.albumId}`);
    lines.push(`Issue pages: ${album.issuePages} / ${album.pageCount}`);
    lines.push('');
    for (const page of album.pages.filter((p) => !p.ok)) {
      lines.push(`### p${page.page} — ${page.title}`);
      for (const issue of page.issues) {
        lines.push(`- **${issue.code}** ${issue.fieldId ?? ''} ${issue.detail ?? ''}`);
      }
      lines.push('');
    }
  }
  return `${lines.join('\n')}\n`;
}

function main() {
  const fontTable = loadFontCharWidths(ROOT);
  if (!fontTable) {
    console.warn('font-char-widths.json missing — run: node scripts/calibrate-font-char-widths.js');
  }

  const lineSlots = loadLineSlots();
  const lineGuides = loadLineGuides(ROOT);
  const albums = ONLY_ALBUM ? [ONLY_ALBUM] : ALBUM_IDS;

  const report = {
    generatedAt: new Date().toISOString(),
    probeSample: FIELD_LIMIT_PROBE_CYRILLIC.slice(0, 32),
    albums: albums.map((albumId) => auditAlbum(albumId, lineSlots, lineGuides, fontTable)),
  };

  const jsonOut = path.join(ROOT, 'scripts/text-line-capacity-audit.json');
  const mdOut = path.join(ROOT, 'scripts/text-line-capacity-audit.md');
  fs.writeFileSync(jsonOut, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(mdOut, renderMarkdown(report), 'utf8');

  let totalIssues = 0;
  for (const album of report.albums) {
    totalIssues += album.issuePages;
    console.log(`[${album.albumId}] issue pages: ${album.issuePages}/${album.pageCount}`);
  }

  console.log('Wrote', path.relative(ROOT, jsonOut));
  console.log('Wrote', path.relative(ROOT, mdOut));

  if (FAIL_ON_ERROR && totalIssues > 0) {
    console.error(`FAIL: ${totalIssues} pages with text capacity issues`);
    process.exit(1);
  }
}

main();
