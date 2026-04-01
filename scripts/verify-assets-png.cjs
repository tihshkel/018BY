/**
 * Fails if any file under assets/ named *.png does not start with a PNG signature.
 * Catches the same class of AAPT "file failed to compile" issues from fake PNGs (e.g. WebP).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const assetsDir = path.join(root, 'assets');

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) walk(full, acc);
    else if (name.name.toLowerCase().endsWith('.png')) acc.push(full);
  }
  return acc;
}

const bad = [];
for (const file of walk(assetsDir)) {
  const fd = fs.openSync(file, 'r');
  try {
    const buf = Buffer.alloc(8);
    fs.readSync(fd, buf, 0, 8, 0);
    const ok = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    if (!ok) bad.push(path.relative(root, file).replace(/\\/g, '/'));
  } finally {
    fs.closeSync(fd);
  }
}

if (bad.length) {
  console.error('Invalid PNG signature (file is not a real PNG):');
  for (const p of bad) console.error(' ', p);
  process.exit(1);
}

console.log('OK: all .png under assets/ have PNG headers.');
