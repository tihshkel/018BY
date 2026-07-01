#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Per-page layout audit for kids_48 (48 pages).
 * node scripts/audit-kids-48-pages.js
 * node scripts/audit-kids-48-pages.js --visual
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const { resolveKids48PhotoLayouts } = require('./kids-48-photo-layout-resolver');

const PAGE_MM = 210;
const MIN_GAP_MM = 4;
const MIN_GAP_NORM = MIN_GAP_MM / PAGE_MM;
const SAFE_INSET_NORM = 0.02;

const KIDS_SECTIONS = [
  { title: 'Начало истории', pageRange: [1, 21] },
  { title: 'Первый год жизни', pageRange: [22, 33] },
  { title: 'Времена года, праздники и путешествия', pageRange: [34, 41] },
  { title: 'Памятные моменты и завершение', pageRange: [42, 48] },
];

const PDF_FOLDER = path.join(
  'assets',
  'pdfs',
  'Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр',
);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8'));
}

function loadKidsSchemas() {
  const raw = fs.readFileSync(
    path.join(__dirname, '..', 'constants/generated/album-page-schemas.ts'),
    'utf8',
  );
  const marker = '"kids_48": [';
  const start = raw.indexOf(marker);
  if (start < 0) throw new Error('kids_48 schemas not found');
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
    a.right < b.left
      ? b.left - a.right
      : b.right < a.left
        ? a.left - b.right
        : 0;
  const dy =
    a.bottom < b.top
      ? b.top - a.bottom
      : b.bottom < a.top
        ? a.top - b.bottom
        : 0;
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

function orientationLabel(aspectRatio, shape) {
  if (shape === 'circle') return 'круг';
  if (!aspectRatio || aspectRatio.length < 2) return 'фото';
  const [w, h] = aspectRatio;
  const ratio = w / h;
  if (Math.abs(ratio - 1) < 0.08) return 'квадрат 1:1';
  if (ratio > 1) return 'горизонталь 4:3';
  return 'вертикаль 3:4';
}

function zoneLabel(centerY) {
  if (centerY < 0.35) return 'верх';
  if (centerY <= 0.65) return 'центр';
  return 'низ';
}

function mm(valueNorm) {
  return Math.round(valueNorm * PAGE_MM);
}

function describePhotoSlot(slot, shape) {
  if (!slot) return '—';
  if (shape === 'circle') {
    const diameterMm = mm(Math.max(slot.width, slot.height));
    return `круг Ø${diameterMm} мм, зона ${zoneLabel(slot.y)}`;
  }
  const widthMm = mm(slot.width);
  const heightMm = mm(slot.height);
  const topMm = mm(slot.y - slot.height / 2);
  const bottomMm = mm(slot.y + slot.height / 2);
  const orient = orientationLabel(slot.aspectRatio, shape);
  return `≈${widthMm}×${heightMm} мм, ${orient}, ${topMm}–${bottomMm} мм от верха (${zoneLabel(slot.y)})`;
}

function describeCircleTree(variants) {
  const tree = variants.find((v) => v.variantId === 'tree') ?? variants[0];
  const count = tree?.slots?.length ?? 0;
  if (!count) return '—';
  const sample = tree.slots[0];
  const diameterMm = sample ? mm(Math.max(sample.width, sample.height)) : 0;
  return `${count} кругов Ø≈${diameterMm} мм (семейное дерево)`;
}

function countTextFields(schema) {
  const fields = schema.fields ?? [];
  const radioCount = fields.filter((f) => f.type === 'radio').length;
  const schemaCount = fields.filter((f) => f.type !== 'radio').length;
  return {
    schemaCount,
    radioCount,
    totalFields: fields.length,
    captionField: Boolean(schema.captionEnabled),
  };
}

function lineSlotsForOverlap(lineSlots, schema) {
  return lineSlots.filter((slot) => {
    if (slot.inputKind === 'block' && !schema.captionEnabled) return false;
    return true;
  });
}

function variantPhotoRect(variant) {
  const rects = variant.slots.map((s) =>
    insetRect(centerSlotToRect(s), SAFE_INSET_NORM * Math.min(s.width, s.height)),
  );
  return unionRect(rects);
}

function worstCasePhotoRect(resolved) {
  if (!resolved?.variants?.length) return null;

  let worst = null;
  let worstArea = 0;

  for (const variant of resolved.variants) {
    const rect = variantPhotoRect(variant);
    if (!rect) continue;
    const area = (rect.right - rect.left) * (rect.bottom - rect.top);
    if (area > worstArea) {
      worstArea = area;
      worst = { variantId: variant.variantId, rect, slots: variant.slots };
    }
  }

  return worst;
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

function analyzeOverlap(photoRect, lineSlots, schema, options = {}) {
  const issues = [];
  const slots = lineSlotsForOverlap(lineSlots, schema);
  if (!photoRect || slots.length === 0) {
    return { overlapIssues: issues, minGapToTextMm: null };
  }

  let minGap = Infinity;
  const severity = options.severity ?? 'fail';

  for (const [index, slot] of slots.entries()) {
    const textRect = centerSlotToRect(slot);
    const gapNorm = rectGapNorm(photoRect, textRect);
    minGap = Math.min(minGap, gapNorm);

    if (gapNorm === 0) {
      issues.push({
        severity,
        code: 'PHOTO_TEXT_OVERLAP',
        detail: `line slot ${index} overlaps photo (y=${slot.y?.toFixed(3)})`,
      });
    } else {
      const gapMm = mm(gapNorm);
      if (gapMm < MIN_GAP_MM) {
        issues.push({
          severity: severity === 'fail' ? 'warn' : 'warn',
          code: 'PHOTO_TEXT_GAP_SMALL',
          detail: `line slot ${index} gap ${gapMm} mm < ${MIN_GAP_MM} mm`,
        });
      }
    }
  }

  return {
    overlapIssues: issues,
    minGapToTextMm: Number.isFinite(minGap) ? mm(minGap) : null,
  };
}

function fieldsLineSlotMismatch(schema, lineSlotCount) {
  const fields = schema.fields ?? [];
  if (!fields.length || lineSlotCount === 0) return null;

  let maxEnd = -1;
  for (const field of fields) {
    if (field.type === 'radio') continue;
    if (typeof field.templateLineStart !== 'number') continue;
    const end = field.templateLineStart + (field.templateLineCount ?? 1) - 1;
    maxEnd = Math.max(maxEnd, end);
  }

  if (maxEnd >= lineSlotCount) {
    return `fields need line index ${maxEnd}, but only ${lineSlotCount} slots`;
  }
  return null;
}

function textZoneSummary(lineSlots) {
  if (!lineSlots.length) return 'нет текстовых слотов';
  const ys = lineSlots.map((s) => s.y - s.height / 2);
  const minY = Math.min(...ys);
  const maxY = Math.max(...lineSlots.map((s) => s.y + s.height / 2));
  return `верх ${mm(minY)}–${mm(maxY)} мм`;
}

function photoZoneSummary(slots) {
  if (!slots?.length) return 'нет фото';
  const rects = slots.map(centerSlotToRect);
  const union = unionRect(rects);
  if (!union) return 'нет фото';
  return `${mm(union.top)}–${mm(union.bottom)} мм от верха`;
}

function photoSummaryLabel(schema, resolved) {
  const blocks = schema.photoBlocks ?? [];
  if (!blocks.length) return 'нет';
  if (resolved?.source === 'circle') {
    return describeCircleTree(resolved.variants);
  }
  const variantCount = blocks[0]?.variants?.length ?? resolved?.variants?.length ?? 0;
  if (variantCount <= 1) return '1 фото';
  return `1–${variantCount} варианта`;
}

function resolvePageStatus(overlapIssues, mismatch, hasPhoto, resolved) {
  if (overlapIssues.some((i) => i.severity === 'fail')) return 'fail';
  if (
    overlapIssues.some(
      (i) => i.severity === 'warn' && !String(i.code).startsWith('WORST_CASE_'),
    ) ||
    mismatch
  ) {
    return 'warn';
  }
  if (hasPhoto && !resolved) return 'warn';
  return 'ok';
}

function auditPage(pageNumber, schema, tzEntry, lineSlots, pdfSlots, circleSlots) {
  const resolved = resolveKids48PhotoLayouts(pageNumber, pdfSlots, circleSlots);
  const textFields = countTextFields(schema);
  const lineSlotCount = lineSlots.length;

  const hasPhotoBlocks = (schema.photoBlocks?.length ?? 0) > 0;
  const hasResolvedPhoto = Boolean(resolved?.variants?.length);
  const isCircleTree = schema.pageType === 'family_tree';

  let primaryVariant = resolved?.variants?.[0];
  let photoDescription = '—';

  if (isCircleTree && resolved) {
    photoDescription = describeCircleTree(resolved.variants);
  } else if (hasPhotoBlocks && hasResolvedPhoto) {
    primaryVariant = resolved.variants[0];
    photoDescription = describePhotoSlot(primaryVariant?.slots?.[0], primaryVariant?.slots?.[0]?.shape);
  } else if (!hasPhotoBlocks) {
    photoDescription = '—';
  } else {
    photoDescription = 'зона не определена';
  }

  const primary = primaryPhotoRect(resolved);
  const worst = worstCasePhotoRect(resolved);

  let overlap = { overlapIssues: [], minGapToTextMm: null };
  let worstOverlap = { overlapIssues: [], minGapToTextMm: null };

  if (schema.pageType === 'family_tree') {
    overlap = {
      overlapIssues: [
        {
          severity: 'info',
          code: 'CIRCLE_TREE_BY_DESIGN',
          detail: 'круги и подписи размещены по макету дерева — overlap не проверяется',
        },
      ],
      minGapToTextMm: null,
    };
  } else if (hasPhotoBlocks && hasResolvedPhoto) {
    overlap = analyzeOverlap(primary?.rect ?? null, lineSlots, schema, { severity: 'fail' });
    if (worst?.variantId !== primary?.variantId) {
      worstOverlap = analyzeOverlap(worst?.rect ?? null, lineSlots, schema, { severity: 'warn' });
      for (const issue of worstOverlap.overlapIssues) {
        issue.code = `WORST_CASE_${issue.code}`;
        issue.detail = `[${worst?.variantId}] ${issue.detail}`;
      }
    }
  }

  const mismatch = fieldsLineSlotMismatch(schema, lineSlotCount);

  const layoutIssues = [...overlap.overlapIssues, ...worstOverlap.overlapIssues];
  if (mismatch) {
    layoutIssues.push({
      severity: 'warn',
      code: 'FIELD_LINE_SLOT_MISMATCH',
      detail: mismatch,
    });
  }

  const status = resolvePageStatus(layoutIssues, mismatch, hasPhotoBlocks, resolved);

  return {
    page: pageNumber,
    title: tzEntry?.title ?? schema.title,
    pageType: schema.pageType,
    editable: schema.editable !== false,
    section: null,
    textFields: {
      ...textFields,
      lineSlotCount,
      displayCount: textFields.schemaCount + (textFields.captionField ? 1 : 0),
    },
    photo: {
      hasPhoto: hasPhotoBlocks,
      blockId: schema.photoBlocks?.[0]?.blockId ?? null,
      variants: schema.photoBlocks?.[0]?.variants?.map((v) => v.variantId) ?? resolved?.variants?.map((v) => v.variantId) ?? [],
      primaryVariant: primaryVariant?.variantId ?? null,
      layoutSource: resolved?.source ?? null,
      slots: (primaryVariant?.slots ?? []).map((s) => ({
        xNorm: s.x,
        yNorm: s.y,
        widthNorm: s.width,
        heightNorm: s.height,
        aspectRatio: s.aspectRatio,
        shape: s.shape,
      })),
      worstCaseVariant: worst?.variantId ?? null,
      primaryGapMm: overlap.minGapToTextMm,
    },
    photoDescription,
    photoSummary: photoSummaryLabel(schema, resolved),
    layout: {
      textZone: textZoneSummary(lineSlots),
      photoZone: photoZoneSummary(primaryVariant?.slots),
      minGapToTextMm: overlap.minGapToTextMm,
      overlapIssues: layoutIssues,
    },
    status,
  };
}

function assignSections(pages) {
  for (const section of KIDS_SECTIONS) {
    const [from, to] = section.pageRange;
    for (const entry of pages) {
      if (entry.page >= from && entry.page <= to) {
        entry.section = section.title;
      }
    }
  }
}

function buildSummary(pages) {
  const ok = pages.filter((p) => p.status === 'ok').length;
  const warn = pages.filter((p) => p.status === 'warn').length;
  const fail = pages.filter((p) => p.status === 'fail').length;
  return {
    albumId: 'kids_48',
    pageCount: pages.length,
    pagesOk: ok,
    pagesWarn: warn,
    pagesFail: fail,
    needsCalibration: pages.filter((p) => p.status !== 'ok').map((p) => p.page),
  };
}

function statusIcon(status) {
  if (status === 'ok') return 'ok';
  if (status === 'warn') return 'warn';
  return 'FAIL';
}

function buildMarkdown(pages, summary) {
  const lines = [
    '# Аудит страниц kids_48',
    '',
    `Формат страницы: **210×210 мм**. Минимальный зазор фото/текст: **${MIN_GAP_MM} мм**.`,
    '',
    `**Итого:** ${summary.pagesOk} ok, ${summary.pagesWarn} warn, ${summary.pagesFail} fail`,
    '',
  ];

  if (summary.needsCalibration.length) {
    lines.push(`Страницы для калибровки: ${summary.needsCalibration.join(', ')}`, '');
  }

  for (const section of KIDS_SECTIONS) {
    const [from, to] = section.pageRange;
    lines.push(`## ${section.title} (p${from}–p${to})`, '');
    lines.push('| № | Название | Поля | Фото | Рекомендуемый размер | Статус |');
    lines.push('| --- | --- | --- | --- | --- | --- |');

    for (const entry of pages) {
      if (entry.page < from || entry.page > to) continue;
      const fieldLabel = entry.textFields.radioCount
        ? `${entry.textFields.displayCount} (+${entry.textFields.radioCount} radio)`
        : String(entry.textFields.displayCount);
      lines.push(
        `| ${entry.page} | ${entry.title} | ${fieldLabel} | ${entry.photoSummary} | ${entry.photoDescription} | ${statusIcon(entry.status)} |`,
      );
    }
    lines.push('');
  }

  const problemPages = pages.filter((p) => p.layout.overlapIssues.length);
  if (problemPages.length) {
    lines.push('## Детали проблем', '');
    for (const entry of problemPages) {
      lines.push(`### p${entry.page} — ${entry.title}`, '');
      for (const issue of entry.layout.overlapIssues) {
        lines.push(`- \`${issue.code}\`: ${issue.detail}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

function drawRect(png, rect, color, alpha = 180) {
  const top = Math.round(rect.top * png.height);
  const left = Math.round(rect.left * png.width);
  const w = Math.round((rect.right - rect.left) * png.width);
  const h = Math.max(2, Math.round((rect.bottom - rect.top) * png.height));

  for (let dy = 0; dy < h; dy += 1) {
    for (let dx = 0; dx < w; dx += 1) {
      const px = left + dx;
      const py = top + dy;
      if (px < 0 || py < 0 || px >= png.width || py >= png.height) continue;
      const idx = (png.width * py + px) << 2;
      png.data[idx] = color[0];
      png.data[idx + 1] = color[1];
      png.data[idx + 2] = color[2];
      png.data[idx + 3] = alpha;
    }
  }
}

async function writeVisualOverlays(pages, projectRoot) {
  const outDir = path.join(projectRoot, 'assets/debug/kids-48-audit');
  fs.mkdirSync(outDir, { recursive: true });

  const folderPath = path.join(projectRoot, PDF_FOLDER);
  const targets = pages.filter((p) => p.status !== 'ok' || p.photo.hasPhoto);

  for (const entry of targets) {
    const fileName = `page_${String(entry.page).padStart(3, '0')}.png`;
    const filePath = path.join(folderPath, fileName);
    if (!fs.existsSync(filePath)) continue;

    const png = await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(new PNG())
        .on('parsed', function parsed() {
          resolve(this);
        })
        .on('error', reject);
    });

    const lineSlots = readJson('constants/line-slots.json').kids_48?.[String(entry.page)] ?? [];
    for (const slot of lineSlots) {
      drawRect(png, centerSlotToRect(slot), [64, 128, 255], 140);
    }

    const pdfSlots = readJson('constants/generated/pdf-photo-slots.json').kids_48;
    const circleSlots = readJson('constants/generated/pdf-circle-slots.json').kids_48;
    const resolved = resolveKids48PhotoLayouts(entry.page, pdfSlots, circleSlots);
    const worst = worstCasePhotoRect(resolved);
    if (worst?.rect) {
      drawRect(png, worst.rect, [255, 64, 128], 160);
    }

    if (worst?.rect && lineSlots.length) {
      for (const slot of lineSlots) {
        const textRect = centerSlotToRect(slot);
        if (rectGapNorm(worst.rect, textRect) === 0) {
          const overlap = unionRect([worst.rect, textRect]);
          if (overlap) drawRect(png, overlap, [255, 220, 64], 200);
        }
      }
    }

    const outPath = path.join(outDir, `page_${String(entry.page).padStart(3, '0')}_combined.png`);
    await new Promise((resolve, reject) => {
      png
        .pack()
        .pipe(fs.createWriteStream(outPath))
        .on('finish', resolve)
        .on('error', reject);
    });
    console.log('Wrote', outPath);
  }
}

async function main() {
  const projectRoot = path.join(__dirname, '..');
  const visual = process.argv.includes('--visual');
  const failOnIssues = process.argv.includes('--fail');

  const schemas = loadKidsSchemas();
  const tzManifest = readJson('constants/kids-48-tz-manifest.json');
  const lineSlotsAlbum = readJson('constants/line-slots.json').kids_48 ?? {};
  const pdfSlots = readJson('constants/generated/pdf-photo-slots.json').kids_48 ?? {};
  const circleSlots = readJson('constants/generated/pdf-circle-slots.json').kids_48 ?? {};

  const pages = [];
  for (let page = 1; page <= 48; page += 1) {
    const schema = schemas.find((s) => s.sourcePageNumber === page);
    if (!schema) throw new Error(`Missing schema for page ${page}`);
    pages.push(
      auditPage(
        page,
        schema,
        tzManifest[String(page)],
        lineSlotsAlbum[String(page)] ?? [],
        pdfSlots,
        circleSlots,
      ),
    );
  }

  assignSections(pages);
  const summary = buildSummary(pages);

  const jsonPath = path.join(__dirname, 'kids-48-page-audit.json');
  const mdPath = path.join(__dirname, 'kids-48-page-audit.md');
  fs.writeFileSync(jsonPath, `${JSON.stringify({ summary, pages }, null, 2)}\n`);
  fs.writeFileSync(mdPath, buildMarkdown(pages, summary));

  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);
  console.log(
    `Summary: ${summary.pagesOk} ok, ${summary.pagesWarn} warn, ${summary.pagesFail} fail`,
  );

  if (visual) {
    await writeVisualOverlays(pages, projectRoot);
  }

  if (failOnIssues && summary.pagesFail > 0) {
    console.error(`Audit failed: ${summary.pagesFail} page(s) with photo/text overlap`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
