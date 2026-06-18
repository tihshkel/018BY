/* eslint-disable no-console */
/**
 * Извлекает заголовки страниц и подписи полей из PDF-макетов и PNG (OCR),
 * сопоставляя текст со слотами LINE_SLOTS.
 *
 * node scripts/extract-album-page-content.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { collectTextItems, loadPdfDocument } = require('./pdf-line-extractor');

const PDF_SOURCES = {
  pregnancy_60: path.join('in albums', 'Блок БЕРЕМЕННОСТЬ 60 стр.pdf'),
  pregnancy_a5: path.join('in albums', 'Блок БЕРЕМЕННОСТЬ A5 другой блок.pdf'),
  kids_48: path.join('in albums', 'Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр.pdf'),
  holidays_birthday_60: path.join('in albums', 'Блок ДНЕЙ РОЖДЕНИЯ готов.pdf'),
  diary_interior_brown: path.join('in albums', '09.06.26_Блок коричневый _180х240_print.pdf'),
  diary_interior_purple: path.join('in albums', '09.06.26_Блок фиолетовый_180х240_print.pdf'),
};

const PER_PAGE_PDF_FOLDERS = {
  diary_interior_brown: 'ЛД 180х240',
  diary_interior_purple: 'ЛД А5',
};

const PNG_SOURCES = {
  pregnancy_60: path.join('assets', 'pdfs', 'Блок БЕРЕМЕННОСТЬ 60 стр'),
  pregnancy_a5: path.join('assets', 'pdfs', 'Блок БЕРЕМЕННОСТЬ A5 другой блок'),
  kids_48: path.join('assets', 'pdfs', 'Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр'),
  holidays_birthday_60: path.join('assets', 'pdfs', 'Блок ДНЕЙ РОЖДЕНИЯ 60 стр'),
  diary_interior_brown: path.join('albums', 'diary', 'cover', 'in album', 'Блок коричневый _180х240_print'),
  diary_interior_purple: path.join('albums', 'diary', 'cover', 'in album', 'Блок фиолетовый_180х240_print'),
};

const OCR_ONLY_ALBUMS = new Set([
  'kids_48',
  'diary_interior_brown',
  'diary_interior_purple',
]);

const PAGE_COUNTS = {
  pregnancy_60: 60,
  pregnancy_a5: 48,
  kids_48: 48,
  holidays_birthday_60: 60,
  diary_interior_brown: 60,
  diary_interior_purple: 40,
  family_blank: 20,
  holidays_blank: 20,
};

const ROW_Y_TOLERANCE = 0.028;
const OCR_ROW_Y_TOLERANCE = 0.055;
const SUFFIX_WORDS = new Set(['лет', 'г', 'г.', 'см', 'кг', 'мин', 'ч', 'ч.']);

function capitalizeFirst(text) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function normalizeLabelText(text) {
  return capitalizeFirst(
    text
      .replace(/\.$/, '')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function normalizeTextItems(page) {
  const viewport = page.getViewport({ scale: 1 });
  const pageWidth = viewport.width;
  const pageHeight = viewport.height;

  return collectTextItems(page).then((items) =>
    items.map((item) => ({
      str: item.str.trim(),
      normX: item.x / pageWidth,
      normYTop: (pageHeight - item.y) / pageHeight,
      right: item.right / pageWidth,
    }))
  );
}

function ocrTextFromPng(pngPath) {
  const swiftScript = path.join(__dirname, 'ocr-page-png.swift');
  const output = execFileSync('swift', [swiftScript, pngPath], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  return JSON.parse(output).map((item) => ({
    ...item,
    // Vision: 1 = top. LINE_SLOTS: 0 = top.
    normYTop: 1 - item.normYTop,
  }));
}

function resolvePngPath(projectRoot, lineGuideId, pageNumber) {
  const folderRel = PNG_SOURCES[lineGuideId];
  if (!folderRel) return null;

  const folderPath = path.join(projectRoot, folderRel);
  if (!fs.existsSync(folderPath)) return null;

  const padded = String(pageNumber).padStart(3, '0');
  const candidate = path.join(folderPath, `page_${padded}.png`);
  return fs.existsSync(candidate) ? candidate : null;
}

function joinRowText(parts) {
  return parts
    .map((p) => p.str)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractInlineLabel(textItems, slot, yTolerance = ROW_Y_TOLERANCE) {
  const onRow = textItems.filter((item) => Math.abs(item.normYTop - slot.y) <= yTolerance);
  if (!onRow.length) return null;

  const inputLeft = slot.x;
  const inputRight = slot.x + slot.width;

  const labelParts = onRow
    .filter((item) => {
      if (!item.str) return false;
      if (SUFFIX_WORDS.has(item.str.toLowerCase())) return false;
      return item.normX < inputLeft + 0.04 || item.right <= inputLeft + 0.06;
    })
    .sort((a, b) => a.normX - b.normX);

  const suffixParts = onRow
    .filter((item) => SUFFIX_WORDS.has(item.str.toLowerCase()) && item.normX >= inputRight - 0.05)
    .sort((a, b) => a.normX - b.normX);

  const label = joinRowText(labelParts);
  if (!label) return null;

  const suffix = joinRowText(suffixParts);
  if (suffix) {
    return `${label} (${suffix})`;
  }
  return label;
}

function extractLabelAboveGroup(textItems, slot) {
  const rows = new Map();
  for (const item of textItems) {
    if (item.normYTop >= slot.y - 0.004) continue;
    if (item.normYTop < slot.y - 0.09) continue;
    if (SUFFIX_WORDS.has(item.str.toLowerCase())) continue;
    const rowKey = Math.round(item.normYTop / 0.012);
    if (!rows.has(rowKey)) rows.set(rowKey, []);
    rows.get(rowKey).push(item);
  }

  const orderedRows = [...rows.entries()].sort((a, b) => b[0] - a[0]);
  for (const [, parts] of orderedRows) {
    parts.sort((a, b) => a.normX - b.normX);
    const label = joinRowText(parts);
    if (label.length > 1) return label;
  }
  return null;
}

function extractLabelForGroup(textItems, group, yTolerance = ROW_Y_TOLERANCE) {
  return (
    extractInlineLabel(textItems, group.labelSlot, yTolerance) ??
    extractLabelAboveGroup(textItems, group.labelSlot)
  );
}

function buildFieldGroups(slots) {
  const groups = [];
  const seen = new Set();

  for (let i = 0; i < slots.length; i += 1) {
    const slot = slots[i];
    if (slot.inputKind === 'block') continue;

    const groupId = slot.continuationGroup ?? i + 1;
    if (seen.has(groupId)) continue;
    seen.add(groupId);

    let startIndex = i;
    let lineCount = 1;
    for (let j = i + 1; j < slots.length; j += 1) {
      if (slots[j].continuationGroup === groupId && slots[j].inputKind !== 'block') {
        lineCount += 1;
      } else if (slots[j].continuationGroup !== groupId) {
        break;
      }
    }

    const labelSlot =
      slots.slice(startIndex, startIndex + lineCount).find((s) => s.hasLabel) ??
      slots[startIndex];

    groups.push({
      groupId,
      startIndex,
      lineCount,
      labelSlot,
    });
  }

  return groups;
}

function extractPageHeading(textItems, slots) {
  const formSlots = slots.filter((s) => s.inputKind !== 'block');
  if (formSlots.length === 0) {
    const decorative = textItems
      .filter((item) => item.normYTop < 0.35 && item.str.length > 2)
      .sort((a, b) => a.normYTop - b.normYTop);
    return decorative.length ? normalizeLabelText(decorative[0].str) : null;
  }

  const firstFieldY = Math.min(...formSlots.map((s) => s.y));
  const headingRows = new Map();

  for (const item of textItems) {
    if (item.normYTop >= firstFieldY - 0.02) continue;
    if (item.normYTop < 0.04) continue;
    const rowKey = Math.round(item.normYTop / 0.015);
    if (!headingRows.has(rowKey)) headingRows.set(rowKey, []);
    headingRows.get(rowKey).push(item);
  }

  const rows = [...headingRows.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, parts]) => {
      parts.sort((a, b) => a.normX - b.normX);
      return joinRowText(parts);
    })
    .filter(Boolean);

  if (rows.length === 0) return null;
  return normalizeLabelText(rows[0]);
}

function detectColumnHeaders(textItems, groups) {
  if (groups.length < 8) return null;

  const minY = Math.min(...groups.map((g) => g.labelSlot.y));
  const headerItems = textItems.filter(
    (item) =>
      item.normYTop < minY - 0.02 &&
      item.normYTop > 0.04 &&
      item.str.length > 2 &&
      item.str.length < 40
  );
  if (headerItems.length < 2) return null;

  const rows = new Map();
  for (const item of headerItems) {
    const rowKey = Math.round(item.normYTop / 0.02);
    if (!rows.has(rowKey)) rows.set(rowKey, []);
    rows.get(rowKey).push(item);
  }

  const headerRow = [...rows.values()]
    .filter((row) => row.length >= 2)
    .sort((a, b) => a[0].normYTop - b[0].normYTop)[0];

  if (!headerRow) return null;

  headerRow.sort((a, b) => a.normX - b.normX);
  const columns = headerRow.slice(0, 2).map((item) => normalizeLabelText(item.str));
  const splitX = (headerRow[0].normX + headerRow[1].normX) / 2;

  return { columns, splitX };
}

function applyGridColumnLabels(groups, textItems) {
  const grid = detectColumnHeaders(textItems, groups);
  if (!grid) return null;

  const leftGroups = [];
  const rightGroups = [];

  for (const group of groups) {
    if (group.labelSlot.x < grid.splitX) {
      leftGroups.push(group);
    } else {
      rightGroups.push(group);
    }
  }

  leftGroups.sort((a, b) => a.labelSlot.y - b.labelSlot.y);
  rightGroups.sort((a, b) => a.labelSlot.y - b.labelSlot.y);

  const labels = new Map();
  leftGroups.forEach((group, index) => {
    labels.set(group.groupId, `${grid.columns[0]} ${index + 1}`);
  });
  rightGroups.forEach((group, index) => {
    labels.set(group.groupId, `${grid.columns[1]} ${index + 1}`);
  });

  return labels;
}

function assignLabelsByOrder(textItems, groups, heading) {
  const headingLower = heading?.toLowerCase();
  const labels = textItems
    .filter((item) => item.str.toLowerCase() !== headingLower)
    .filter((item) => !SUFFIX_WORDS.has(item.str.toLowerCase()))
    .sort((a, b) => a.normYTop - b.normYTop || a.normX - b.normX);

  const sortedGroups = [...groups].sort((a, b) => a.labelSlot.y - b.labelSlot.y);
  const labelsByMap = new Map();

  if (sortedGroups.length > 0 && labels.length === sortedGroups.length) {
    sortedGroups.forEach((group, index) => {
      labelsByMap.set(group.groupId, normalizeLabelText(labels[index].str));
    });
    return labelsByMap;
  }

  const upperGroups = sortedGroups.filter((group) => group.labelSlot.y < 0.45);
  const lowerGroups = sortedGroups.filter((group) => group.labelSlot.y >= 0.45);
  const upperLabels = labels.filter((item) => item.normYTop < 0.45);
  const lowerLabels = labels.filter((item) => item.normYTop >= 0.45);

  if (upperGroups.length === 1 && upperLabels.length === 0 && heading) {
    labelsByMap.set(upperGroups[0].groupId, heading);
  } else if (upperGroups.length === upperLabels.length) {
    upperGroups.forEach((group, index) => {
      labelsByMap.set(group.groupId, normalizeLabelText(upperLabels[index].str));
    });
  }

  if (lowerGroups.length === lowerLabels.length && lowerGroups.length > 0) {
    lowerGroups.forEach((group, index) => {
      labelsByMap.set(group.groupId, normalizeLabelText(lowerLabels[index].str));
    });
  }

  return labelsByMap.size > 0 ? labelsByMap : null;
}

function assignLabelsByProximity(textItems, groups, yTolerance, usedTexts = new Set()) {
  const labels = new Map();

  for (const group of groups) {
    let best = null;
    let bestDist = Infinity;

    for (const item of textItems) {
      if (usedTexts.has(item.str.toLowerCase())) continue;
      const dist = Math.abs(item.normYTop - group.labelSlot.y);
      if (dist > yTolerance) continue;
      if (dist < bestDist) {
        bestDist = dist;
        best = item;
      }
    }

    if (best) {
      usedTexts.add(best.str.toLowerCase());
      labels.set(group.groupId, normalizeLabelText(best.str));
    }
  }

  return labels;
}

function inferFieldType(label) {
  const lower = label.toLowerCase();
  if (lower.includes('дата') || lower.includes('пдр')) return 'date';
  if (lower.includes('время')) return 'time';
  if (lower.includes('вес') || lower.includes('рост') || lower.includes('(г)') || lower.includes('(см)')) {
    return 'number';
  }
  return 'text';
}

function extractPageContent(textItems, slots, lineGuideId, pageNumber, options = {}) {
  const yTolerance = options.ocrMode ? OCR_ROW_Y_TOLERANCE : ROW_Y_TOLERANCE;
  const groups = buildFieldGroups(slots);
  const heading = extractPageHeading(textItems, slots);

  const gridLabels = applyGridColumnLabels(groups, textItems);
  const orderedLabels = options.ocrMode ? assignLabelsByOrder(textItems, groups, heading) : null;
  const proximityLabels = assignLabelsByProximity(
    textItems,
    groups,
    yTolerance,
    new Set(heading ? [heading.toLowerCase()] : [])
  );

  const fields = groups.map((group, index) => {
    let label =
      gridLabels?.get(group.groupId) ??
      (options.ocrMode ? orderedLabels?.get(group.groupId) : null) ??
      extractLabelForGroup(textItems, group, yTolerance) ??
      orderedLabels?.get(group.groupId) ??
      proximityLabels.get(group.groupId) ??
      `Поле ${index + 1}`;

    label = normalizeLabelText(label);

    return {
      fieldId: `${lineGuideId}_p${pageNumber}_g${group.groupId}`,
      label,
      type: inferFieldType(label),
      templateLineStart: group.startIndex,
      templateLineCount: group.lineCount,
    };
  });

  return {
    heading: heading ?? undefined,
    fields: fields.length ? fields : undefined,
  };
}

async function getTextItemsForPage(projectRoot, lineGuideId, pageNumber, pdfPage) {
  const pdfItems = pdfPage ? await normalizeTextItems(pdfPage) : [];
  const useOcr = OCR_ONLY_ALBUMS.has(lineGuideId) || pdfItems.length === 0;
  if (!useOcr) return { textItems: pdfItems, ocrMode: false };

  const pngPath = resolvePngPath(projectRoot, lineGuideId, pageNumber);
  if (!pngPath) {
    return { textItems: pdfItems, ocrMode: false };
  }

  try {
    const ocrItems = ocrTextFromPng(pngPath);
    return { textItems: ocrItems.length ? ocrItems : pdfItems, ocrMode: true };
  } catch (error) {
    console.warn(`[${lineGuideId} p${pageNumber}] OCR failed:`, error.message);
    return { textItems: pdfItems, ocrMode: false };
  }
}

async function extractAlbumContent(projectRoot, lineGuideId, pdfRelativePath, pageCount, lineSlots) {
  const pdfPath = path.join(projectRoot, pdfRelativePath);
  let doc = null;

  if (fs.existsSync(pdfPath)) {
    doc = await loadPdfDocument(pdfPath);
  } else if (!PNG_SOURCES[lineGuideId]) {
    console.warn(`[${lineGuideId}] PDF not found: ${pdfPath}`);
    return {};
  }

  const albumSlots = lineSlots[lineGuideId] ?? {};
  const pages = {};
  const maxPage = doc ? Math.min(pageCount, doc.numPages) : pageCount;

  for (let pageNumber = 1; pageNumber <= maxPage; pageNumber += 1) {
    const pageKey = String(pageNumber);
    const slots = albumSlots[pageKey] ?? [];
    if (slots.length === 0) continue;

    const pdfPage = doc ? await doc.getPage(pageNumber) : null;
    const { textItems, ocrMode } = await getTextItemsForPage(
      projectRoot,
      lineGuideId,
      pageNumber,
      pdfPage
    );

    if (textItems.length === 0) continue;

    const content = extractPageContent(textItems, slots, lineGuideId, pageNumber, { ocrMode });
    if (content.heading || content.fields?.length) {
      pages[pageKey] = content;
    }
  }

  console.log(`[${lineGuideId}] extracted content for ${Object.keys(pages).length} pages`);
  return pages;
}

function normalizeFileName(name) {
  return name.normalize('NFC');
}

function findPerPagePdfFolder(projectRoot, folderName) {
  const inAlbums = path.join(projectRoot, 'in albums');
  if (!fs.existsSync(inAlbums)) return null;
  const target = normalizeFileName(folderName).toLowerCase();
  for (const entry of fs.readdirSync(inAlbums)) {
    if (normalizeFileName(entry).toLowerCase() === target) {
      return path.join(inAlbums, entry);
    }
  }
  return null;
}

function listPerPagePdfFiles(folderPath) {
  const pageRe = /(\d+)\s*\.pdf$/i;
  return fs
    .readdirSync(folderPath)
    .filter((fileName) => pageRe.test(normalizeFileName(fileName)))
    .map((fileName) => {
      const pageNumber = Number(normalizeFileName(fileName).match(pageRe)[1]);
      return { pageNumber, filePath: path.join(folderPath, fileName) };
    })
    .sort((a, b) => a.pageNumber - b.pageNumber);
}

async function extractAlbumContentFromPerPagePdfs(
  projectRoot,
  lineGuideId,
  folderPath,
  pageCount,
  lineSlots,
) {
  const albumSlots = lineSlots[lineGuideId] ?? {};
  const pages = {};
  const pdfFiles = listPerPagePdfFiles(folderPath);

  for (const { pageNumber, filePath } of pdfFiles) {
    if (pageNumber > pageCount) continue;
    const pageKey = String(pageNumber);
    const slots = albumSlots[pageKey] ?? [];
    if (slots.length === 0) continue;

    const doc = await loadPdfDocument(filePath);
    const pdfPage = doc.numPages > 0 ? await doc.getPage(1) : null;
    const { textItems, ocrMode } = await getTextItemsForPage(
      projectRoot,
      lineGuideId,
      pageNumber,
      pdfPage,
    );

    if (textItems.length === 0) continue;

    const content = extractPageContent(textItems, slots, lineGuideId, pageNumber, { ocrMode });
    if (content.heading || content.fields?.length) {
      pages[pageKey] = content;
    }
  }

  console.log(`[${lineGuideId}] extracted content for ${Object.keys(pages).length} pages (per-page PDF)`);
  return pages;
}

async function main() {
  const projectRoot = path.join(__dirname, '..');
  const lineSlotsPath = path.join(projectRoot, 'constants', 'line-slots.json');
  const lineSlots = JSON.parse(fs.readFileSync(lineSlotsPath, 'utf8'));
  const outPath = path.join(projectRoot, 'constants', 'album-page-content.json');
  const result = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, 'utf8')) : {};

  for (const [lineGuideId, pdfPath] of Object.entries(PDF_SOURCES)) {
    const only = process.env.ONLY_ALBUM;
    if (only && !only.split(',').map((s) => s.trim()).includes(lineGuideId)) continue;

    const pageCount = PAGE_COUNTS[lineGuideId] ?? 0;
    const perPageFolderName = PER_PAGE_PDF_FOLDERS[lineGuideId];
    const perPageFolderPath = perPageFolderName
      ? findPerPagePdfFolder(projectRoot, perPageFolderName)
      : null;

    if (perPageFolderPath && fs.existsSync(perPageFolderPath) && process.env.USE_LEGACY_DIARY_PDF !== '1') {
      result[lineGuideId] = await extractAlbumContentFromPerPagePdfs(
        projectRoot,
        lineGuideId,
        perPageFolderPath,
        pageCount,
        lineSlots,
      );
      continue;
    }

    result[lineGuideId] = await extractAlbumContent(
      projectRoot,
      lineGuideId,
      pdfPath,
      pageCount,
      lineSlots
    );
  }

  fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log('Wrote', outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
