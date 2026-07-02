#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Build per-font character width table (pdf-lib) for field limit calibration.
 * node scripts/calibrate-font-char-widths.js
 */
const fs = require('fs');
const path = require('path');
const fontkit = require('@pdf-lib/fontkit');
const { PDFDocument } = require('pdf-lib');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'constants/generated/font-char-widths.json');
const FONT_SIZE = 16;

const FONT_FILES = {
  SvyaznoyRF: 'assets/fonts/SvyaznoyRF.ttf',
  'AmaticSC-Regular': 'assets/fonts/AmaticSC-Regular.ttf',
  'AmaticSC-Bold': 'assets/fonts/AmaticSC-Bold.ttf',
  'Nefelibata-Sans': 'assets/fonts/Nefelibata-Sans.otf',
  'Nefelibata-PenSans': 'assets/fonts/Nefelibata-PenSans.otf',
};

const SAMPLE_CHARS =
  'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюя0123456789.,:;!?- ';

async function measureFont(fontId, relativePath) {
  const abs = path.join(ROOT, relativePath);
  if (!fs.existsSync(abs)) {
    console.warn(`skip ${fontId}: missing ${relativePath}`);
    return null;
  }

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const bytes = fs.readFileSync(abs);
  const font = await pdfDoc.embedFont(bytes);

  const chars = {};
  let total = 0;
  let count = 0;
  for (const ch of SAMPLE_CHARS) {
    const w = font.widthOfTextAtSize(ch, FONT_SIZE);
    chars[ch] = w;
    total += w;
    count += 1;
  }

  return {
    fontId,
    file: relativePath,
    fontSize: FONT_SIZE,
    avgCharWidthAt16: total / Math.max(count, 1),
    chars,
  };
}

async function main() {
  const fonts = {};
  for (const [fontId, file] of Object.entries(FONT_FILES)) {
    const data = await measureFont(fontId, file);
    if (data) {
      fonts[fontId] = data;
      console.log(`measured ${fontId}: avg=${data.avgCharWidthAt16.toFixed(2)}`);
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    fontSize: FONT_SIZE,
    fonts,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log('Wrote', path.relative(ROOT, OUT));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
