const fs = require('fs');
const path = require('path');

const root = process.cwd();
const placeholderPng = path.join(root, 'assets', 'images', 'albums', 'blank_white.png');
const minimalPdf = Buffer.from(
  '%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
    '2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n' +
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]>>endobj\n' +
    'trailer<</Root 1 0 R>>\n%%EOF\n',
  'utf8'
);

const codeExts = new Set(['.ts', '.tsx', '.js', '.jsx']);

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && codeExts.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

function collectRequiredAssetRequireStrings(fileText) {
  // Collects require strings of any form, then we filter for anything that contains assets/images/
  // Examples:
  //   require('@/assets/images/logo.png')
  //   require("../../assets/images/logo.png")
  //   require('../assets/images/logo.png')
  const reqRe = /require\(\s*(['"])([^'"]+)\1\s*\)/g;
  const reqs = [];
  let m;
  while ((m = reqRe.exec(fileText)) !== null) {
    const reqPath = m[2];
    if (typeof reqPath !== 'string') continue;
    if (!reqPath.includes('assets/images/')) continue;
    if (!reqPath.endsWith('.png') && !reqPath.endsWith('.jpg') && !reqPath.endsWith('.jpeg') && !reqPath.endsWith('.webp') && !reqPath.endsWith('.gif') && !reqPath.endsWith('.pdf') && !reqPath.endsWith('.ttf') && !reqPath.endsWith('.otf')) continue;
    reqs.push(reqPath);
  }
  return reqs;
}

function writePlaceholder(absPath, relPath) {
  const ext = path.extname(absPath).toLowerCase();
  fs.mkdirSync(path.dirname(absPath), { recursive: true });

  if (ext === '.pdf') {
    fs.writeFileSync(absPath, minimalPdf);
    return { kind: 'pdf' };
  }

  if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.webp' || ext === '.gif') {
    if (!fs.existsSync(placeholderPng)) throw new Error('Missing placeholder png: ' + placeholderPng);
    fs.copyFileSync(placeholderPng, absPath);
    return { kind: 'image' };
  }

  // Unknown ext - create empty file so bundler can continue
  fs.writeFileSync(absPath, '');
  return { kind: 'empty' };
}

let referenced = 0;
let created = 0;
let skippedExisting = 0;

for (const file of walk(root)) {
  const text = fs.readFileSync(file, 'utf8');
  const reqPaths = collectRequiredAssetRequireStrings(text);
  for (const reqPath of reqPaths) {
    referenced += 1;

    // Resolve '@/...' to project root
    const absPath = reqPath.startsWith('@/') ? path.join(root, reqPath.slice(2)) : path.resolve(path.dirname(file), reqPath);

    // Only patch files inside project (avoid weird paths)
    if (!absPath.startsWith(root)) continue;

    if (fs.existsSync(absPath)) {
      skippedExisting += 1;
      continue;
    }

    // Compute relative path for logging; placeholder writer doesn't really need it
    const rel = path.relative(root, absPath).replace(/\\/g, '/');
    writePlaceholder(absPath, rel);
    created += 1;
  }
}

console.log(`referenced=${referenced}`);
console.log(`existing=${skippedExisting}`);
console.log(`created=${created}`);

