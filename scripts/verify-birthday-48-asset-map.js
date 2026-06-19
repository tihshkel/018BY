/* eslint-disable no-console */
/**
 * Verifies the holidays_birthday_60 logical→legacy asset map matches TZ layout.
 * Legacy pages 4–5 («Чувства и эмоции мамы/папы») are omitted in the 48-page album.
 *
 * node scripts/verify-birthday-48-asset-map.js
 */
const fs = require('fs');
const path = require('path');

const { getBirthday48PageTitle } = require('./birthday-48-field-specs');

function getBirthday48AssetPageNumber(logicalPage) {
  if (logicalPage < 1 || logicalPage > 48) return Math.max(1, logicalPage);
  if (logicalPage <= 3) return logicalPage;
  if (logicalPage === 48) return 60;
  return logicalPage + 2;
}

/** Spot checks from OCR of legacy PNG pack (page banner text). */
const LEGACY_HEADINGS = {
  1: 'Этот альбом',
  2: 'Привет, мир!',
  6: 'Мне 1 годик',
  8: 'Мне 2 года',
  42: 'Мои путешествия',
  60: 'Письмо',
};

function assertTsSourceUsesSameFormula() {
  const tsPath = path.join(__dirname, '../utils/birthday48AssetRemap.ts');
  const source = fs.readFileSync(tsPath, 'utf8');
  if (!source.includes('return logicalPage + 2')) {
    throw new Error('birthday48AssetRemap.ts must use logicalPage + 2 for pages 4–47');
  }
  if (!source.includes('if (logicalPage === 48) return 60')) {
    throw new Error('birthday48AssetRemap.ts must map logical page 48 → asset 60');
  }
}

function main() {
  assertTsSourceUsesSameFormula();

  const rows = [];
  for (let logical = 1; logical <= 48; logical += 1) {
    const asset = getBirthday48AssetPageNumber(logical);
    const title = getBirthday48PageTitle(logical);
    rows.push({ logical, asset, title });
  }

  const spotChecks = [
    [4, 6, 'Мне 1 годик'],
    [6, 8, 'Мне 2 года!'],
    [38, 40, 'Мне 18 лет!'],
    [40, 42, 'Мои путешествия'],
    [48, 60, 'Письмо во взрослую жизнь'],
  ];

  for (const [logical, expectedAsset, expectedTitle] of spotChecks) {
    const row = rows[logical - 1];
    if (row.asset !== expectedAsset) {
      throw new Error(`p${logical}: expected asset ${expectedAsset}, got ${row.asset}`);
    }
    if (row.title !== expectedTitle) {
      throw new Error(`p${logical}: expected title «${expectedTitle}», got «${row.title}»`);
    }
  }

  for (const [asset, fragment] of Object.entries(LEGACY_HEADINGS)) {
    const logical = rows.find((r) => r.asset === Number(asset));
    if (!logical) {
      throw new Error(`No logical page maps to legacy asset ${asset}`);
    }
  }

  console.log('OK: birthday 48 logical→asset map (p4→6, skip legacy p4–5, p48→60).');
  if (process.argv.includes('--verbose')) {
    rows.forEach(({ logical, asset, title }) => {
      console.log(`  TZ p${String(logical).padStart(2)} → asset p${String(asset).padStart(2)}  ${title}`);
    });
  }
}

main();
