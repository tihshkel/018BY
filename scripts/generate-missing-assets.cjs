const fs = require('fs');
const path = require('path');

const root = process.cwd();
const exts = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.pdf', '.ttf', '.otf']);
const codeExts = new Set(['.ts', '.tsx', '.js', '.jsx']);
const placeholderPng = path.join(root, 'assets', 'images', 'albums', 'blank_white.png');

if (!fs.existsSync(placeholderPng)) {
  throw new Error('Missing placeholder: assets/images/albums/blank_white.png');
}

const minimalPdf = Buffer.from(
  '%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
    '2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n' +
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]>>endobj\n' +
    'trailer<</Root 1 0 R>>\n%%EOF\n',
  'utf8'
);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (codeExts.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function collectRequirePaths(file, text) {
  const result = [];
  const re = /require\((['"])([^'"]+)\1\)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const reqPath = m[2];
    if (!reqPath.includes('assets/')) continue;
    result.push(reqPath);
  }
  return result;
}

function resolveAsset(file, reqPath) {
  if (reqPath.startsWith('@/')) {
    return path.join(root, reqPath.slice(2));
  }
  return path.resolve(path.dirname(file), reqPath);
}

let created = 0;
let referenced = 0;

for (const file of walk(root)) {
  const text = fs.readFileSync(file, 'utf8');
  const reqs = collectRequirePaths(file, text);
  for (const req of reqs) {
    const abs = resolveAsset(file, req);
    const ext = path.extname(abs).toLowerCase();
    if (!exts.has(ext)) continue;
    referenced += 1;
    if (fs.existsSync(abs)) continue;
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    if (ext === '.pdf') {
      fs.writeFileSync(abs, minimalPdf);
    } else if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.webp' || ext === '.gif') {
      fs.copyFileSync(placeholderPng, abs);
    } else {
      fs.writeFileSync(abs, '');
    }
    created += 1;
  }
}

console.log(`referenced=${referenced}`);
console.log(`created=${created}`);
