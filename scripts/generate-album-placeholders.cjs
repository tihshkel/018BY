const fs = require('fs');
const path = require('path');

const root = process.cwd();
const albumsIndex = path.join(root, 'albums', 'index.ts');
const albumsDir = path.join(root, 'assets', 'images', 'albums');
const placeholder = path.join(albumsDir, 'blank_white.png');

if (!fs.existsSync(albumsIndex)) {
  throw new Error('albums/index.ts not found');
}
if (!fs.existsSync(placeholder)) {
  throw new Error('assets/images/albums/blank_white.png not found');
}

const src = fs.readFileSync(albumsIndex, 'utf8');
const re = /assets\/images\/albums\/([^'")\s]+)/g;
const names = new Set();
let m;
while ((m = re.exec(src)) !== null) {
  names.add(m[1]);
}

let created = 0;
for (const rel of names) {
  const filePath = path.join(albumsDir, rel);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.copyFileSync(placeholder, filePath);
    created += 1;
  }
}

console.log(`targets=${names.size}`);
console.log(`created=${created}`);
