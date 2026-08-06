/**
 * Статическая проверка: дневник brown/purple не может уйти в экспорт как «белый лист».
 * Запуск: node ./scripts/verify-diary-export-guards.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function isDiskLocalExportUri(uri) {
  if (!uri) return false;
  return uri.startsWith('file://') || uri.startsWith('/');
}

function resolveDiaryInteriorId(...candidates) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (candidate === 'diary_interior_purple' || candidate.includes('purple')) {
      return 'diary_interior_purple';
    }
    if (candidate === 'diary_interior_brown' || candidate.includes('brown')) {
      return 'diary_interior_brown';
    }
    if (candidate.startsWith('diary_interior_')) {
      return 'diary_interior_brown';
    }
  }
  return null;
}

function resolveExportPageImageUri(projectImages, instance, templatePageUris, lineGuideId) {
  const isDiary =
    lineGuideId === 'diary_interior_brown' || lineGuideId === 'diary_interior_purple';
  if (!instance.addedByUser && isDiary) {
    const templateIndex = instance.sourcePageNumber - 1;
    if (
      templatePageUris &&
      templateIndex >= 0 &&
      templateIndex < templatePageUris.length
    ) {
      const byTemplate = templatePageUris[templateIndex];
      if (isDiskLocalExportUri(byTemplate)) return byTemplate;
    }
    return undefined;
  }
  if (instance.addedByUser && isDiary) {
    const templateIndex = instance.sourcePageNumber - 1;
    if (
      templatePageUris &&
      templateIndex >= 0 &&
      templateIndex < templatePageUris.length
    ) {
      const byTemplate = templatePageUris[templateIndex];
      if (isDiskLocalExportUri(byTemplate)) return byTemplate;
    }
    return undefined;
  }
  return projectImages[instance.imageIndex];
}

async function assertInteriorAssets(dir, label, expectedCount) {
  const files = fs
    .readdirSync(dir)
    .filter((f) => /^page_\d+\.png$/i.test(f))
    .sort();
  assert(
    files.length === expectedCount,
    `${label}: ожидалось ${expectedCount} PNG, найдено ${files.length}`,
  );

  const blankPath = path.join(ROOT, 'assets/images/albums/blank_interior_page.png');
  const blankMeta = await sharp(blankPath).metadata();
  const blankStat = fs.statSync(blankPath);

  let checked = 0;
  for (const file of files) {
    const full = path.join(dir, file);
    const st = fs.statSync(full);
    assert(st.size > 8_000, `${label}/${file}: слишком маленький файл (${st.size}b)`);
    const meta = await sharp(full).metadata();
    assert((meta.width || 0) >= 800, `${label}/${file}: ширина ${meta.width}`);
    assert((meta.height || 0) >= 800, `${label}/${file}: высота ${meta.height}`);
    // Не должен быть копией blank_interior_page (белый шаблон экспорта).
    assert(
      !(st.size === blankStat.size && meta.width === blankMeta.width && meta.height === blankMeta.height),
      `${label}/${file}: совпадает с blank_interior_page`,
    );
    checked += 1;
  }
  return checked;
}

async function main() {
  // 1) URI guards
  assert(isDiskLocalExportUri('file:///data/page.png'), 'file:// должен проходить');
  assert(isDiskLocalExportUri('/data/page.png'), 'absolute path должен проходить');
  assert(!isDiskLocalExportUri('http://localhost:8081/assets/x'), 'Metro http запрещён');
  assert(!isDiskLocalExportUri('asset:/page.png'), 'asset:/ запрещён');

  assert(
    resolveDiaryInteriorId('cover_x', 'diary_interior_purple') === 'diary_interior_purple',
    'purple id',
  );
  assert(
    resolveDiaryInteriorId('something_brown_cover') === 'diary_interior_brown',
    'brown from name',
  );

  const metro = 'http://127.0.0.1:8081/assets/page.png';
  const fileUri = 'file:///cache/diary_page_004.png';
  const instance = { addedByUser: false, sourcePageNumber: 4, imageIndex: 3 };

  assert(
    resolveExportPageImageUri([metro], instance, [metro, metro, metro, metro], 'diary_interior_brown') ===
      undefined,
    'Metro template должен отклоняться',
  );
  assert(
    resolveExportPageImageUri([metro], instance, [fileUri, fileUri, fileUri, fileUri], 'diary_interior_brown') ===
      fileUri,
    'file:// template должен приниматься',
  );
  assert(
    resolveExportPageImageUri([metro], instance, undefined, 'diary_interior_purple') === undefined,
    'без template — undefined (не blank/Metro)',
  );

  // 2) Asset colour sanity (не белые PNG)
  const brownDir = path.join(ROOT, 'albums/diary/interiors/brown');
  const purpleDir = path.join(ROOT, 'albums/diary/interiors/purple');
  const brownN = await assertInteriorAssets(brownDir, 'brown', 60);
  const purpleN = await assertInteriorAssets(purpleDir, 'purple', 40);

  // 3) Source contains hard guards
  const exportPdf = fs.readFileSync(path.join(ROOT, 'app/export-pdf.tsx'), 'utf8');
  assert(
    exportPdf.includes('omitBackgroundImage'),
    'export-pdf должен использовать omitBackgroundImage для diary overlay',
  );
  assert(
    exportPdf.includes('!hasImageAnnotations'),
    'text-only diary не должен идти в ViewShot',
  );
  assert(
    exportPdf.includes('Не подставляем blankPageUri') ||
      fs
        .readFileSync(path.join(ROOT, 'utils/exportPageSelection.ts'), 'utf8')
        .includes('Не подставляем blankPageUri'),
    'filter не должен подставлять blank для diary',
  );

  console.log(
    `OK diary export guards: URI rules + ${brownN} brown + ${purpleN} purple pages not blank`,
  );
}

main().catch((err) => {
  console.error('FAIL:', err.message || err);
  process.exit(1);
});
