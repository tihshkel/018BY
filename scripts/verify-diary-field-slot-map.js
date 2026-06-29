#!/usr/bin/env node
/**
 * Overlay structured brown-diary fields on page PNGs and report slot/field mismatches.
 *
 * node scripts/verify-diary-field-slot-map.js
 * OUT_DIR=assets/debug/diary-field-slot-map node scripts/verify-diary-field-slot-map.js
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const ALBUM_ID = process.env.ALBUM_ID || 'diary_interior_brown';

const ALBUM_CONFIG = {
  diary_interior_brown: {
    manifestPath: path.join(root, 'scripts/diary-60-tz-manifest.json'),
    pngFolder: path.join(root, 'albums/diary/cover/in album/Блок коричневый _180х240_print'),
  },
  diary_interior_purple: {
    manifestPath: path.join(root, 'scripts/girls-diary-a5-tz-manifest.json'),
    pngFolder: path.join(root, 'albums/diary/cover/in album/Блок фиолетовый_180х240_print'),
  },
};

const albumConfig = ALBUM_CONFIG[ALBUM_ID];
if (!albumConfig) {
  throw new Error(`Unknown ALBUM_ID: ${ALBUM_ID}`);
}

const PNG_FOLDER = albumConfig.pngFolder;
const OUT_DIR = process.env.OUT_DIR
  ? path.resolve(process.env.OUT_DIR)
  : path.join(root, 'test-results', `diary-field-slot-map-${ALBUM_ID.replace('diary_interior_', '')}`);

function loadSchemas() {
  const raw = fs.readFileSync(
    path.join(root, 'constants/generated/album-page-schemas.ts'),
    'utf8',
  );
  const match = raw.match(/export const ALBUM_PAGE_SCHEMAS[^=]*=\s*(\{[\s\S]*\})\s*as Record/);
  if (!match) throw new Error('Could not parse ALBUM_PAGE_SCHEMAS');
  return JSON.parse(match[1]);
}

function loadLineSlots() {
  return JSON.parse(
    fs.readFileSync(path.join(root, 'constants/line-slots.json'), 'utf8'),
  );
}

function loadManifest() {
  return JSON.parse(fs.readFileSync(albumConfig.manifestPath, 'utf8'));
}

function validateFieldSlots(pageNumber, schema, pageSlots) {
  const issues = [];
  const fields = schema?.fields ?? [];

  for (const field of fields) {
    const start = field.templateLineStart ?? 0;
    const count = field.templateLineCount ?? 1;
    const end = start + count - 1;

    if (pageSlots.length === 0 && count > 0) {
      issues.push({
        severity: 'error',
        code: 'NO_LINE_SLOTS',
        fieldId: field.fieldId,
        label: field.label,
        message: `Поле «${field.label}» — нет line-slots`,
      });
      continue;
    }

    if (end >= pageSlots.length) {
      issues.push({
        severity: 'error',
        code: 'FIELD_EXCEEDS_SLOTS',
        fieldId: field.fieldId,
        label: field.label,
        message: `Поле «${field.label}» slots ${start}..${end}, доступно ${pageSlots.length}`,
      });
    }
  }

  return issues;
}

function drawSlotRect(png, slot, color) {
  const top = Math.round((slot.y - slot.height) * png.height);
  const left = Math.round(slot.x * png.width);
  const w = Math.round(slot.width * png.width);
  const h = Math.max(2, Math.round(slot.height * png.height));

  for (let dy = 0; dy < h; dy += 1) {
    const y = top + dy;
    if (y < 0 || y >= png.height) continue;
    for (let x = left; x < left + w && x < png.width; x += 1) {
      const idx = (png.width * y + x) << 2;
      png.data[idx] = color[0];
      png.data[idx + 1] = color[1];
      png.data[idx + 2] = color[2];
      png.data[idx + 3] = color[3];
    }
  }
}

async function overlayPage(pageNumber, pageSlots, fields) {
  const fileName = `page_${String(pageNumber).padStart(3, '0')}.png`;
  const filePath = path.join(PNG_FOLDER, fileName);
  if (!fs.existsSync(filePath)) {
    return { skipped: true, reason: 'PNG missing' };
  }

  const png = await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(new PNG())
      .on('parsed', function parsed() {
        resolve(this);
      })
      .on('error', reject);
  });

  for (const slot of pageSlots) {
    drawSlotRect(png, slot, [255, 0, 120, 90]);
  }

  for (const field of fields) {
    const start = field.templateLineStart ?? 0;
    const count = field.templateLineCount ?? 1;
    for (let i = start; i < start + count; i += 1) {
      const slot = pageSlots[i];
      if (!slot) continue;
      drawSlotRect(png, slot, [0, 120, 255, 120]);
    }
  }

  const outPath = path.join(OUT_DIR, `page_${String(pageNumber).padStart(3, '0')}_overlay.png`);
  await new Promise((resolve, reject) => {
    png
      .pack()
      .pipe(fs.createWriteStream(outPath))
      .on('finish', resolve)
      .on('error', reject);
  });

  return { skipped: false, outPath };
}

async function main() {
  const schemas = loadSchemas();
  const lineSlots = loadLineSlots();
  const manifest = loadManifest();
  const albumSchemaList = schemas[ALBUM_ID] ?? [];
  const schemaByPage = Object.fromEntries(
    albumSchemaList.map((schema) => [String(schema.sourcePageNumber), schema]),
  );
  const albumSlots = lineSlots[ALBUM_ID] ?? {};

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const pages = [];
  let errorCount = 0;
  let warnCount = 0;

  for (const [pageKey, meta] of Object.entries(manifest)) {
    const pageNumber = Number(pageKey);
    if (!meta.editable || meta.pageType !== 'structured') continue;

    const schema = schemaByPage[pageKey];
    const pageSlots = albumSlots[pageKey] ?? [];
    const issues = validateFieldSlots(pageNumber, schema, pageSlots);
    const overlay = await overlayPage(pageNumber, pageSlots, schema?.fields ?? []);

    for (const issue of issues) {
      if (issue.severity === 'error') errorCount += 1;
      else warnCount += 1;
    }

    pages.push({
      page: pageNumber,
      template: meta.template,
      slotCount: pageSlots.length,
      fieldCount: schema?.fields?.length ?? 0,
      issues,
      overlay: overlay.skipped ? null : overlay.outPath,
    });
  }

  const report = {
    albumId: ALBUM_ID,
    generatedAt: new Date().toISOString(),
    summary: {
      structuredPages: pages.length,
      errors: errorCount,
      warnings: warnCount,
      ok: errorCount === 0,
    },
    pages,
  };

  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));

  console.log(
    `[verify-diary-field-slot-map] ${report.summary.ok ? 'OK' : 'FAIL'}: ` +
      `${pages.length} structured pages, errors=${errorCount}, warnings=${warnCount}`,
  );
  console.log(`Report: ${path.join(OUT_DIR, 'report.json')}`);

  if (errorCount > 0) {
    for (const page of pages) {
      for (const issue of page.issues) {
        if (issue.severity === 'error') {
          console.error(`  p${page.page} ${issue.code}: ${issue.message}`);
        }
      }
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
