/**
 * Partial-restore pregnancy_60 / pregnancy_a5 / kids_48 text coords from a baseline commit
 * without touching diary_interior_* sections.
 *
 * Usage:
 *   node scripts/restore-non-diary-album-coords-from-commit.js [commit]
 * Default commit: 0e8971c3beee6c4c3ee272c700e73568b8bd343d
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const COMMIT = process.argv[2] || '0e8971c3beee6c4c3ee272c700e73568b8bd343d';
const ALBUMS = ['pregnancy_60', 'pregnancy_a5', 'kids_48'];

function gitShow(relPath) {
  return execFileSync('git', ['show', `${COMMIT}:${relPath}`], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

function writeJson(relPath, data) {
  const abs = path.join(ROOT, relPath);
  fs.writeFileSync(abs, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function mergeAlbumMaps(current, baseline, albums) {
  const out = { ...current };
  for (const album of albums) {
    if (baseline[album] == null) {
      throw new Error(`Baseline ${COMMIT} missing album key: ${album} in map`);
    }
    out[album] = baseline[album];
  }
  return out;
}

function extractAlbumSchemaBlock(src, albumId) {
  const key = `"${albumId}"`;
  const start = src.indexOf(key);
  if (start < 0) throw new Error(`Schema missing album ${albumId}`);
  // Find the array start after the key
  const afterKey = src.indexOf('[', start);
  if (afterKey < 0) throw new Error(`Schema array not found for ${albumId}`);
  let depth = 0;
  let i = afterKey;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (ch === '[') depth += 1;
    else if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        i += 1;
        break;
      }
    }
  }
  // include trailing comma if present
  let end = i;
  while (end < src.length && /\s/.test(src[end])) end += 1;
  if (src[end] === ',') end += 1;
  return { start, end, block: src.slice(start, end) };
}

function replaceAlbumSchemaBlocks(currentSrc, baselineSrc, albums) {
  let out = currentSrc;
  // Replace from the end so earlier offsets stay valid? Better: rebuild by walking albums.
  // Simpler: for each album, replace current block with baseline block.
  for (const album of albums) {
    const cur = extractAlbumSchemaBlock(out, album);
    const base = extractAlbumSchemaBlock(baselineSrc, album);
    // Normalize: baseline block starts with "albumId": [...]
    out = out.slice(0, cur.start) + base.block + out.slice(cur.end);
  }
  return out;
}

// --- line-slots.json ---
{
  const rel = 'constants/line-slots.json';
  const current = JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  const baseline = JSON.parse(gitShow(rel));
  const merged = mergeAlbumMaps(current, baseline, ALBUMS);
  writeJson(rel, merged);
  console.log('Restored', ALBUMS.join(', '), 'in', rel);
}

// --- line-guides.json ---
{
  const rel = 'constants/line-guides.json';
  const current = JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  const baseline = JSON.parse(gitShow(rel));
  const merged = mergeAlbumMaps(current, baseline, ALBUMS);
  writeJson(rel, merged);
  console.log('Restored', ALBUMS.join(', '), 'in', rel);
}

// --- line-slots.ts ---
{
  const rel = 'constants/line-slots.ts';
  const currentTs = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'constants/line-slots.json'), 'utf8'));
  const preambleEnd = currentTs.indexOf('export const LINE_SLOTS');
  const preamble = preambleEnd > 0 ? currentTs.slice(0, preambleEnd) : '/* eslint-disable */\n';
  const exportLine = currentTs.slice(preambleEnd).match(/^export const LINE_SLOTS[^=]*=/)?.[0];
  if (!exportLine) throw new Error('LINE_SLOTS export line missing');
  fs.writeFileSync(
    path.join(ROOT, rel),
    `${preamble}${exportLine} ${JSON.stringify(data, null, 2)};\n`,
    'utf8',
  );
  console.log('Rewrote', rel, 'from merged JSON (HEAD types kept)');
}

// --- line-guides.ts ---
{
  const rel = 'constants/line-guides.ts';
  const currentTs = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'constants/line-guides.json'), 'utf8'));
  const preambleEnd = currentTs.indexOf('export const LINE_GUIDES');
  const preamble = preambleEnd > 0 ? currentTs.slice(0, preambleEnd) : '/* eslint-disable */\n';
  const exportLine = currentTs.slice(preambleEnd).match(/^export const LINE_GUIDES[^=]*=/)?.[0];
  if (!exportLine) throw new Error('LINE_GUIDES export line missing');
  fs.writeFileSync(
    path.join(ROOT, rel),
    `${preamble}${exportLine} ${JSON.stringify(data, null, 2)};\n`,
    'utf8',
  );
  console.log('Rewrote', rel, 'from merged JSON (HEAD types kept)');
}

// --- album-page-schemas.ts (partial album blocks) ---
{
  const rel = 'constants/generated/album-page-schemas.ts';
  const current = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const baseline = gitShow(rel);
  const merged = replaceAlbumSchemaBlocks(current, baseline, ALBUMS);
  fs.writeFileSync(path.join(ROOT, rel), merged, 'utf8');
  console.log('Restored schema blocks for', ALBUMS.join(', '), 'in', rel);
}

console.log('Done. Baseline commit:', COMMIT);
