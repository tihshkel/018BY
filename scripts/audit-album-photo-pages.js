#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Photo layout audit for designed albums with sparse-text expansion.
 * node scripts/audit-album-photo-pages.js
 * node scripts/audit-album-photo-pages.js --album kids_48
 * node scripts/audit-album-photo-pages.js --fail
 */
const fs = require('fs');
const path = require('path');

const {
  resolveAlbumPhotoLayouts,
  hasSparsePhotoConfig,
} = require('./album-photo-layout-resolver');

const MIN_GAP_MM = 4;
const PRINT_PHOTO_MARGIN_MM = 10;
const SAFE_INSET_NORM = 0.02;

const SPARSE_MAX_LINE_SLOTS = 4;
const SPARSE_MIN_WIDTH_NORM = 0.7;
const SPARSE_MIN_HEIGHT_NORM = 90 / 210;

const ALBUM_CONFIGS = {
  kids_48: {
    pageCount: 48,
    pageMm: 210,
    sections: [
      { title: 'Начало истории', pageRange: [1, 21] },
      { title: 'Первый год жизни', pageRange: [22, 33] },
      { title: 'Времена года, праздники и путешествия', pageRange: [34, 41] },
      { title: 'Памятные моменты и завершение', pageRange: [42, 48] },
    ],
  },
  pregnancy_60: {
    pageCount: 60,
    pageMm: 210,
    sections: [
      { title: 'Введение', pageRange: [1, 8] },
      { title: 'Недели беременности', pageRange: [9, 47] },
      { title: 'Завершение', pageRange: [48, 60] },
    ],
  },
  pregnancy_a5: {
    pageCount: 48,
    pageMm: 210,
    sections: [
      { title: 'Введение', pageRange: [1, 4] },
      { title: 'Недели беременности', pageRange: [5, 43] },
      { title: 'Завершение', pageRange: [44, 48] },
    ],
  },
  holidays_birthday_60: {
    pageCount: 48,
    pageMm: 210,
    sections: [
      { title: 'Начало', pageRange: [1, 10] },
      { title: 'Годы жизни', pageRange: [11, 39] },
      { title: 'Путешествия и финал', pageRange: [40, 48] },
    ],
  },
  diary_interior_brown: {
    pageCount: 60,
    pageMm: 210,
    sections: [
      { title: 'Начало', pageRange: [1, 15] },
      { title: 'Основная часть', pageRange: [16, 45] },
      { title: 'Завершение', pageRange: [46, 60] },
    ],
  },
  diary_interior_purple: {
    pageCount: 40,
    pageMm: 148,
    gapMm: 3,
    sections: [
      { title: 'Начало', pageRange: [1, 10] },
      { title: 'Основная часть', pageRange: [11, 30] },
      { title: 'Завершение', pageRange: [31, 40] },
    ],
  },
};

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8'));
}

function loadAlbumSchemas(albumId) {
  const raw = fs.readFileSync(
    path.join(__dirname, '..', 'constants/generated/album-page-schemas.ts'),
    'utf8',
  );
  const marker = `"${albumId}": [`;
  const start = raw.indexOf(marker);
  if (start < 0) throw new Error(`${albumId} schemas not found`);
  const arrayStart = start + marker.length - 1;
  let depth = 0;
  let end = arrayStart;
  for (let i = arrayStart; i < raw.length; i += 1) {
    if (raw[i] === '[') depth += 1;
    if (raw[i] === ']') {
      depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  return JSON.parse(raw.slice(arrayStart, end));
}

function centerSlotToRect(slot) {
  return {
    left: slot.x,
    top: slot.y - slot.height / 2,
    right: slot.x + slot.width,
    bottom: slot.y + slot.height / 2,
  };
}

function lineSlotToRect(slot) {
  if (slot.textAnchorTop) {
    return {
      left: slot.x,
      top: slot.y,
      right: slot.x + slot.width,
      bottom: slot.y + slot.height,
    };
  }
  return centerSlotToRect(slot);
}

function shouldSkipPhotoTextOverlapSlot(albumId, pageNumber, index, slot) {
  if ((slot.inputKind ?? 'line') === 'block') return true;
  if (albumId === 'pregnancy_60' && index === 5) {
    const isWeekly =
      (pageNumber >= 9 && pageNumber <= 17) ||
      (pageNumber >= 19 && pageNumber <= 32) ||
      (pageNumber >= 34 && pageNumber <= 47);
    if (isWeekly) return true;
  }
  return false;
}

function insetRect(rect, inset) {
  return {
    left: rect.left + inset,
    top: rect.top + inset,
    right: rect.right - inset,
    bottom: rect.bottom - inset,
  };
}

function rectsIntersect(a, b) {
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}

function rectGapNorm(a, b) {
  if (rectsIntersect(a, b)) return 0;
  const dx =
    a.right < b.left ? b.left - a.right : b.right < a.left ? a.left - b.right : 0;
  const dy =
    a.bottom < b.top ? b.top - a.bottom : b.bottom < a.top ? a.top - b.bottom : 0;
  return Math.max(dx, dy);
}

function unionRect(rects) {
  if (!rects.length) return null;
  return {
    left: Math.min(...rects.map((r) => r.left)),
    top: Math.min(...rects.map((r) => r.top)),
    right: Math.max(...rects.map((r) => r.right)),
    bottom: Math.max(...rects.map((r) => r.bottom)),
  };
}

function mm(valueNorm, pageMm) {
  return Math.round(valueNorm * pageMm);
}

function zoneLabel(centerY) {
  if (centerY < 0.35) return 'верх';
  if (centerY <= 0.65) return 'центр';
  return 'низ';
}

function describePhotoSlot(slot, pageMm, shape) {
  if (!slot) return '—';
  if (shape === 'circle') {
    return `круг Ø${mm(Math.max(slot.width, slot.height), pageMm)} мм`;
  }
  const widthMm = mm(slot.width, pageMm);
  const heightMm = mm(slot.height, pageMm);
  const topMm = mm(slot.y - slot.height / 2, pageMm);
  const bottomMm = mm(slot.y + slot.height / 2, pageMm);
  return `≈${widthMm}×${heightMm} мм, ${topMm}–${bottomMm} мм (${zoneLabel(slot.y)})`;
}

function variantPhotoRect(variant) {
  const rects = variant.slots.map((s) =>
    insetRect(centerSlotToRect(s), SAFE_INSET_NORM * Math.min(s.width, s.height)),
  );
  return unionRect(rects);
}

function primaryPhotoRect(resolved) {
  const primary = resolved?.variants?.[0];
  if (!primary) return null;
  return {
    variantId: primary.variantId,
    rect: variantPhotoRect(primary),
    slots: primary.slots,
  };
}

function analyzeOverlap(photoRect, lineSlots, pageMm, gapMm = MIN_GAP_MM, albumId, pageNumber) {
  const issues = [];
  if (!photoRect || lineSlots.length === 0) {
    return { overlapIssues: issues, minGapToTextMm: null };
  }

  let minGap = Infinity;
  const minGapNorm = gapMm / pageMm;

  for (const [index, slot] of lineSlots.entries()) {
    if (shouldSkipPhotoTextOverlapSlot(albumId, pageNumber, index, slot)) {
      continue;
    }
    const textRect = lineSlotToRect(slot);
    const gapNorm = rectGapNorm(photoRect, textRect);
    minGap = Math.min(minGap, gapNorm);

    if (gapNorm === 0) {
      issues.push({
        severity: 'fail',
        code: 'PHOTO_TEXT_OVERLAP',
        detail: `line slot ${index} overlaps photo`,
      });
    } else if (gapNorm < minGapNorm) {
      issues.push({
        severity: 'warn',
        code: 'PHOTO_TEXT_GAP_SMALL',
        detail: `line slot ${index} gap ${mm(gapNorm, pageMm)} mm < ${gapMm} mm`,
      });
    }
  }

  return {
    overlapIssues: issues,
    minGapToTextMm: Number.isFinite(minGap) ? mm(minGap, pageMm) : null,
  };
}

function getSlotPageMarginsMm(slot, pageMm) {
  const top = slot.y - slot.height / 2;
  const bottom = slot.y + slot.height / 2;
  const right = slot.x + slot.width;
  return {
    left: slot.x * pageMm,
    top: top * pageMm,
    right: (1 - right) * pageMm,
    bottom: (1 - bottom) * pageMm,
  };
}

function checkPrintMargins(resolved, pageMm) {
  const issues = [];
  if (!resolved?.variants?.length) return issues;

  for (const variant of resolved.variants) {
    variant.slots.forEach((slot, slotIndex) => {
      const margins = getSlotPageMarginsMm(slot, pageMm);
      const minMargin = Math.min(
        margins.left,
        margins.top,
        margins.right,
        margins.bottom,
      );
      if (minMargin < PRINT_PHOTO_MARGIN_MM - 0.5) {
        issues.push({
          severity: 'fail',
          code: 'PHOTO_EDGE_MARGIN',
          detail:
            `${variant.variantId} slot ${slotIndex}: ` +
            `L${Math.round(margins.left)} T${Math.round(margins.top)} ` +
            `R${Math.round(margins.right)} B${Math.round(margins.bottom)} mm ` +
            `(min ${Math.round(minMargin)} < ${PRINT_PHOTO_MARGIN_MM} mm)`,
        });
      }
    });
  }

  return issues;
}

function checkSparsePhotoSize(albumId, pageNumber, lineSlotCount, primarySlot, pageMm) {
  const issues = [];
  if (!primarySlot || hasSparsePhotoConfig(albumId)) return issues;
  const sparse = lineSlotCount === 0 || lineSlotCount <= SPARSE_MAX_LINE_SLOTS;
  if (!sparse) return issues;

  if (primarySlot.width < SPARSE_MIN_WIDTH_NORM) {
    issues.push({
      severity: 'warn',
      code: 'SPARSE_PHOTO_TOO_NARROW',
      detail: `width ${mm(primarySlot.width, pageMm)} mm < ${mm(SPARSE_MIN_WIDTH_NORM, pageMm)} mm on sparse page`,
    });
  }
  if (primarySlot.height < SPARSE_MIN_HEIGHT_NORM) {
    issues.push({
      severity: 'warn',
      code: 'SPARSE_PHOTO_TOO_SHORT',
      detail: `height ${mm(primarySlot.height, pageMm)} mm < ${mm(SPARSE_MIN_HEIGHT_NORM, pageMm)} mm on sparse page`,
    });
  }
  return issues;
}

function auditPage(albumId, pageNumber, schema, lineSlots, pdfSlots, circleSlots, pageMm, gapMm = MIN_GAP_MM) {
  const resolved = resolveAlbumPhotoLayouts(albumId, pageNumber, pdfSlots, circleSlots);
  const lineSlotCount = lineSlots.length;
  const hasPhotoBlocks = (schema.photoBlocks?.length ?? 0) > 0;
  const hasResolvedPhoto = Boolean(resolved?.variants?.length);
  const isCircleTree = schema.pageType === 'family_tree';

  let primaryVariant = resolved?.variants?.[0];
  let photoDescription = '—';

  if (isCircleTree && resolved) {
    photoDescription = `${primaryVariant?.slots?.length ?? 0} кругов`;
  } else if (hasPhotoBlocks && hasResolvedPhoto) {
    photoDescription = describePhotoSlot(primaryVariant?.slots?.[0], pageMm);
  } else if (!hasPhotoBlocks) {
    photoDescription = '—';
  } else {
    photoDescription = 'зона не определена';
  }

  const primary = primaryPhotoRect(resolved);
  let layoutIssues = [];

  if (schema.pageType === 'family_tree') {
    layoutIssues = [];
  } else if (hasPhotoBlocks && hasResolvedPhoto) {
    const overlap = analyzeOverlap(
      primary?.rect ?? null,
      lineSlots,
      pageMm,
      gapMm,
      albumId,
      pageNumber,
    );
    layoutIssues = [...overlap.overlapIssues];
    layoutIssues.push(...checkSparsePhotoSize(albumId, pageNumber, lineSlotCount, primaryVariant?.slots?.[0], pageMm));
    layoutIssues.push(...checkPrintMargins(resolved, pageMm));
  }

  let status = 'ok';
  if (layoutIssues.some((i) => i.severity === 'fail')) status = 'fail';
  else if (layoutIssues.some((i) => i.severity === 'warn')) status = 'warn';
  else if (hasPhotoBlocks && !hasResolvedPhoto) status = 'warn';

  return {
    page: pageNumber,
    title: schema.title,
    pageType: schema.pageType,
    lineSlotCount,
    photo: {
      hasPhoto: hasPhotoBlocks,
      variantCount: resolved?.variants?.length ?? 0,
      layoutSource: resolved?.source ?? null,
      primaryVariant: primaryVariant?.variantId ?? null,
    },
    photoDescription,
    layoutIssues,
    status,
  };
}

function assignSections(pages, sections) {
  for (const section of sections) {
    const [from, to] = section.pageRange;
    for (const entry of pages) {
      if (entry.page >= from && entry.page <= to) {
        entry.section = section.title;
      }
    }
  }
}

function buildMarkdown(albumId, pages, summary, config) {
  const lines = [
    `# Аудит фото: ${albumId}`,
    '',
    `Формат: **${config.pageMm}×${config.pageMm} мм**. Мин. зазор фото/текст: **${config.gapMm ?? MIN_GAP_MM} мм**. Мин. поле от обреза: **${PRINT_PHOTO_MARGIN_MM} мм**.`,
    '',
    `**Итого:** ${summary.pagesOk} ok, ${summary.pagesWarn} warn, ${summary.pagesFail} fail`,
    '',
  ];

  for (const section of config.sections) {
    const [from, to] = section.pageRange;
    lines.push(`## ${section.title} (p${from}–p${to})`, '');
    lines.push('| № | Название | Слots | Фото | Размер | Статус |');
    lines.push('| --- | --- | --- | --- | --- | --- |');

    for (const entry of pages) {
      if (entry.page < from || entry.page > to) continue;
      const photoLabel = entry.photo.hasPhoto
        ? `${entry.photo.variantCount} вариант(ов)`
        : 'нет';
      lines.push(
        `| ${entry.page} | ${entry.title} | ${entry.lineSlotCount} | ${photoLabel} | ${entry.photoDescription} | ${entry.status} |`,
      );
    }
    lines.push('');
  }

  const problems = pages.filter((p) => p.layoutIssues.length);
  if (problems.length) {
    lines.push('## Детали', '');
    for (const entry of problems) {
      lines.push(`### p${entry.page} — ${entry.title}`, '');
      for (const issue of entry.layoutIssues) {
        lines.push(`- \`${issue.code}\`: ${issue.detail}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

function auditAlbum(albumId) {
  const config = ALBUM_CONFIGS[albumId];
  if (!config) throw new Error(`Unknown album: ${albumId}`);

  const schemas = loadAlbumSchemas(albumId);
  const lineSlotsAlbum = readJson('constants/line-slots.json')[albumId] ?? {};
  const pdfAll = readJson('constants/generated/pdf-photo-slots.json');
  const circleAll = readJson('constants/generated/pdf-circle-slots.json');
  const pdfSlots = pdfAll[albumId] ?? {};
  const circleSlots = circleAll[albumId] ?? {};

  const pages = [];
  for (let page = 1; page <= config.pageCount; page += 1) {
    const schema = schemas.find((s) => s.sourcePageNumber === page);
    if (!schema) continue;

    const lineSlotsForPage = lineSlotsAlbum[String(page)] ?? [];
    const resolved = resolveAlbumPhotoLayouts(albumId, page, pdfSlots, circleSlots);
    const hasSchemaPhoto = (schema.photoBlocks?.length ?? 0) > 0;
    const hasResolvedPhoto = Boolean(resolved?.variants?.length);

    if (!hasSchemaPhoto && !hasResolvedPhoto) {
      pages.push({
        page,
        title: schema.title,
        pageType: schema.pageType,
        lineSlotCount: lineSlotsForPage.length,
        photo: { hasPhoto: false, variantCount: 0 },
        photoDescription: '—',
        layoutIssues: [],
        status: 'ok',
      });
      continue;
    }

    const auditSchema = hasSchemaPhoto
      ? schema
      : { ...schema, photoBlocks: [{ id: 'runtime-photo' }] };

    pages.push(
      auditPage(
        albumId,
        page,
        auditSchema,
        lineSlotsForPage,
        pdfSlots,
        circleSlots,
        config.pageMm,
        config.gapMm ?? MIN_GAP_MM,
      ),
    );
  }

  assignSections(pages, config.sections);

  const photoPages = pages.filter((p) => p.photo.hasPhoto);
  const summary = {
    albumId,
    pageCount: pages.length,
    photoPages: photoPages.length,
    pagesOk: photoPages.filter((p) => p.status === 'ok').length,
    pagesWarn: photoPages.filter((p) => p.status === 'warn').length,
    pagesFail: photoPages.filter((p) => p.status === 'fail').length,
  };

  return { pages, summary, config };
}

function main() {
  const failOnIssues = process.argv.includes('--fail');
  const albumArg = process.argv.find((a) => a.startsWith('--album='));
  const albumFilter = albumArg ? albumArg.split('=')[1] : null;

  const albumIds = albumFilter
    ? [albumFilter]
    : Object.keys(ALBUM_CONFIGS);

  let totalFail = 0;
  const allSummaries = [];

  for (const albumId of albumIds) {
    const { pages, summary, config } = auditAlbum(albumId);
    allSummaries.push(summary);

    const jsonPath = path.join(__dirname, `${albumId}-photo-audit.json`);
    const mdPath = path.join(__dirname, `${albumId}-photo-audit.md`);
    fs.writeFileSync(jsonPath, `${JSON.stringify({ summary, pages }, null, 2)}\n`);
    fs.writeFileSync(mdPath, buildMarkdown(albumId, pages, summary, config));

    console.log(`[${albumId}] ${summary.pagesOk} ok, ${summary.pagesWarn} warn, ${summary.pagesFail} fail (${summary.photoPages} photo pages)`);
    console.log(`  Wrote ${jsonPath}`);
    console.log(`  Wrote ${mdPath}`);

    totalFail += summary.pagesFail;
  }

  if (failOnIssues && totalFail > 0) {
    console.error(`Audit failed: ${totalFail} page(s) with layout issues`);
    process.exit(1);
  }
}

main();
