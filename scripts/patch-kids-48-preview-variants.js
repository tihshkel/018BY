#!/usr/bin/env node
/**
 * Add missing kids_48 preview_variants: four_grid + tree.
 * Clean backgrounds are identical per page (same as one_horizontal / three_hero sheet).
 *
 * node scripts/patch-kids-48-preview-variants.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const variantsDir = path.join(
  root,
  'assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/preview_variants',
);
const manifestPath = path.join(variantsDir, 'kids_48_variants_manifest.json');
const assetsPrefix =
  'assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/preview_variants';

const FOUR_GRID_PAGES = new Set([
  6, 7, 8, 9, 14, 15, 16, 17, 18, 19, 20, 22, 23, 24, 25, 26, 27, 28, 29, 30,
  31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47,
]);

function copyVariantPng(pageNo, sourceKey, targetKey) {
  const sourceFile = `page_${String(pageNo).padStart(3, '0')}_${sourceKey}.png`;
  const targetFile = `page_${String(pageNo).padStart(3, '0')}_${targetKey}.png`;
  const sourcePath = path.join(variantsDir, sourceFile);
  const targetPath = path.join(variantsDir, targetFile);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Missing source PNG: ${sourceFile}`);
  }

  fs.copyFileSync(sourcePath, targetPath);
  return `${assetsPrefix}/${targetFile}`;
}

function pickCleanSourceKey(entry) {
  if (entry.three_hero) return 'three_hero';
  if (entry.two_vertical) return 'two_vertical';
  if (entry.one_horizontal) return 'one_horizontal';
  const first = Object.keys(entry)[0];
  if (!first) throw new Error('Empty manifest entry');
  return first;
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  let addedFourGrid = 0;
  let addedTree = 0;

  for (const pageNo of FOUR_GRID_PAGES) {
    const key = String(pageNo);
    const entry = manifest[key];
    if (!entry) {
      console.warn(`WARN: page ${pageNo} missing from manifest — skip four_grid`);
      continue;
    }
    if (entry.four_grid) continue;

    const sourceKey = pickCleanSourceKey(entry);
    entry.four_grid = copyVariantPng(pageNo, sourceKey, 'four_grid');
    addedFourGrid += 1;
  }

  const treeEntry = manifest['5'];
  if (treeEntry && !treeEntry.tree) {
    const sourceKey = pickCleanSourceKey(treeEntry);
    treeEntry.tree = copyVariantPng(5, sourceKey, 'tree');
    addedTree += 1;
  }

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Patched manifest: +${addedFourGrid} four_grid, +${addedTree} tree`);
}

main();
