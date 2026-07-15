const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const fileRel = 'constants/generated/album-page-schemas.ts';
const marker = 'export const ALBUM_PAGE_SCHEMAS: Record<string, AlbumPageSchema[]> = ';

function loadSchemas(commit) {
  const src = execSync(`git show ${commit}:${fileRel}`, {
    encoding: 'utf8',
    maxBuffer: 80 * 1024 * 1024,
  });
  const i = src.indexOf(marker);
  if (i < 0) throw new Error('marker not found in ' + commit);
  const start = i + marker.length;
  const asIdx = src.lastIndexOf(' as Record<string, AlbumPageSchema[]>');
  const end = asIdx > start ? asIdx : src.lastIndexOf('};') + 1;
  const literal = src.slice(start, end);
  const obj = vm.runInNewContext('(' + literal + ')');
  return { src, obj, prefix: src.slice(0, start), suffix: src.slice(end) };
}

const tip = loadSchemas('6858f3d');
const checkpoint = loadSchemas('24e9cc3');

const merged = { ...tip.obj };
for (const album of ['pregnancy_60', 'pregnancy_a5', 'kids_48']) {
  merged[album] = checkpoint.obj[album];
  console.log('kept', album, checkpoint.obj[album].length);
}
for (const album of ['diary_interior_brown', 'diary_interior_purple']) {
  merged[album] = tip.obj[album];
  console.log('diary', album, tip.obj[album].length);
}

const out = tip.prefix + JSON.stringify(merged, null, 2) + tip.suffix;
fs.writeFileSync(path.join(root, fileRel), out);
console.log('wrote merged schemas');
