/* eslint-disable no-console */
/**
 * Overlay circle / gender-fill slots on album page PNGs for visual QA.
 * node scripts/visualize-circle-slots.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CIRCLE_SLOTS = path.join(ROOT, 'constants/generated/pdf-circle-slots.json');
const OUT_DIR = path.join(ROOT, 'assets/debug/circle-slots');

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function main() {
  const data = loadJson(CIRCLE_SLOTS);
  if (!data) {
    console.error('Run npm run generate:pdf-circle-slots first');
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const summary = {};

  for (const [albumId, pages] of Object.entries(data)) {
    summary[albumId] = {};
    for (const [pageNo, pageData] of Object.entries(pages)) {
      const slots = pageData.slots ?? pageData.genderFills ?? [];
      summary[albumId][pageNo] = slots.length;
      const outFile = path.join(OUT_DIR, `${albumId}_p${pageNo}.json`);
      fs.writeFileSync(outFile, JSON.stringify({ albumId, pageNo, slots }, null, 2));
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('Wrote circle slot debug manifests to', path.relative(ROOT, OUT_DIR));
  console.log(JSON.stringify(summary, null, 2));
}

main();
