/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function readPng(filePath) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(new PNG())
      .on('parsed', function parsed() {
        resolve(this);
      })
      .on('error', reject);
  });
}

function getLuminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function detectHorizontalLines(png, options) {
  const width = png.width;
  const height = png.height;
  const data = png.data;

  const xStart = Math.floor(width * options.sampleXStartRatio);
  const xEnd = Math.floor(width * options.sampleXEndRatio);

  const rowScore = new Array(height).fill(0);

  for (let y = 0; y < height; y += 1) {
    let darkCount = 0;
    let total = 0;
    for (let x = xStart; x < xEnd; x += 1) {
      const idx = (width * y + x) << 2;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      if (a < 10) continue;
      total += 1;
      const lum = getLuminance(r, g, b);
      if (lum < options.luminanceThreshold) darkCount += 1;
    }
    rowScore[y] = total > 0 ? darkCount / total : 0;
  }

  const segments = [];
  let inSeg = false;
  let segStart = 0;
  for (let y = 0; y < height; y += 1) {
    const hit = rowScore[y] >= options.rowCoverageThreshold;
    if (hit && !inSeg) {
      inSeg = true;
      segStart = y;
    } else if (!hit && inSeg) {
      inSeg = false;
      segments.push([segStart, y - 1]);
    }
  }
  if (inSeg) segments.push([segStart, height - 1]);

  const lines = [];
  for (const [start, end] of segments) {
    const thickness = end - start + 1;
    if (thickness > options.maxLineThicknessPx) continue;
    const center = Math.round((start + end) / 2);
    lines.push(center);
  }

  lines.sort((a, b) => a - b);
  const deduped = [];
  for (const y of lines) {
    const prev = deduped[deduped.length - 1];
    if (prev === undefined || Math.abs(y - prev) >= options.minLineGapPx) deduped.push(y);
  }

  return deduped.filter(
    (y) => y >= options.topCutPx && y <= height - options.bottomCutPx
  );
}

function formatFloat(n) {
  return Number(n.toFixed(5));
}

const ALBUM_FOLDERS = [
  {
    albumId: 'pregnancy_60',
    folder: 'Блок БЕРЕМЕННОСТЬ 60 стр',
    options: {
      sampleXStartRatio: 0.15,
      sampleXEndRatio: 0.95,
      luminanceThreshold: 235,
      rowCoverageThreshold: 0.06,
      maxLineThicknessPx: 6,
      minLineGapPx: 10,
      topCutPx: 80,
      bottomCutPx: 80,
    },
  },
  {
    albumId: 'pregnancy_a5',
    folder: 'Блок БЕРЕМЕННОСТЬ A5 другой блок',
    options: {
      sampleXStartRatio: 0.15,
      sampleXEndRatio: 0.95,
      luminanceThreshold: 235,
      rowCoverageThreshold: 0.06,
      maxLineThicknessPx: 6,
      minLineGapPx: 10,
      topCutPx: 70,
      bottomCutPx: 70,
    },
  },
  {
    albumId: 'kids_48',
    folder: 'Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр',
    options: {
      sampleXStartRatio: 0.12,
      sampleXEndRatio: 0.92,
      luminanceThreshold: 230,
      rowCoverageThreshold: 0.05,
      maxLineThicknessPx: 8,
      minLineGapPx: 8,
      topCutPx: 60,
      bottomCutPx: 60,
    },
  },
  {
    albumId: 'holidays_birthday_60',
    folder: 'Блок ДНЕЙ РОЖДЕНИЯ 60 стр',
    options: {
      sampleXStartRatio: 0.15,
      sampleXEndRatio: 0.95,
      luminanceThreshold: 235,
      rowCoverageThreshold: 0.06,
      maxLineThicknessPx: 6,
      minLineGapPx: 10,
      topCutPx: 80,
      bottomCutPx: 80,
    },
  },
];

async function generateForAlbum(projectRoot, spec) {
  const folderPath = path.join(projectRoot, 'assets', 'pdfs', spec.folder);
  if (!fs.existsSync(folderPath)) {
    console.warn(`Skip ${spec.albumId}: folder not found`, folderPath);
    return null;
  }

  const files = fs
    .readdirSync(folderPath)
    .filter((f) => /^page_\d+\.png$/i.test(f))
    .sort();

  if (files.length === 0) {
    console.warn(`Skip ${spec.albumId}: no page_*.png`);
    return null;
  }

  const onlyAlbum = process.env.ONLY_ALBUM;
  if (onlyAlbum && onlyAlbum !== spec.albumId) return null;

  const guides = {};
  const onlyPage = process.env.ONLY_PAGE;
  const targetFiles = onlyPage ? files.filter((f) => f === onlyPage) : files;

  for (const fileName of targetFiles) {
    const filePath = path.join(folderPath, fileName);
    const png = await readPng(filePath);
    const linesPx = detectHorizontalLines(png, spec.options);
    const linesNorm = linesPx.map((y) => formatFloat(clamp(y / png.height, 0, 1)));
    const pageNumber = Number(fileName.match(/^page_(\d+)\.png$/i)[1]);
    guides[String(pageNumber)] = linesNorm;
    console.log(`[${spec.albumId}] ${fileName}: ${linesNorm.length} lines`);
  }

  return guides;
}

async function main() {
  const projectRoot = process.cwd();
  const lineGuides = {};

  for (const spec of ALBUM_FOLDERS) {
    const guides = await generateForAlbum(projectRoot, spec);
    if (guides) {
      lineGuides[spec.albumId] = guides;
    }
  }

  const outFile = path.join(projectRoot, 'constants', 'line-guides.ts');
  const content =
    `// Auto-generated by scripts/generate-line-guides.js\n` +
    `// Do not edit manually.\n` +
    `\n` +
    `export const LINE_GUIDES = ${JSON.stringify(lineGuides, null, 2)} as const;\n`;

  fs.writeFileSync(outFile, content, 'utf8');
  console.log('✅ Wrote', path.relative(projectRoot, outFile));
  console.log('Albums:', Object.keys(lineGuides).join(', '));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
