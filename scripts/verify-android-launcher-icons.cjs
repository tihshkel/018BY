/**
 * Ensures the *installed app* launcher icons (android/app/src/main/res/mipmap-<density>/ic_launcher.webp)
 * match the project's source icon (assets/images/icon.png).
 *
 * This prevents accidentally submitting an AAB with a different launcher icon than expected.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const sourceIcon = path.join(root, 'assets', 'images', 'icon.png');
const mipmapDir = path.join(root, 'android', 'app', 'src', 'main', 'res');

function listLauncherIcons() {
  const out = [];
  if (!fs.existsSync(mipmapDir)) return out;
  for (const entry of fs.readdirSync(mipmapDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.startsWith('mipmap-')) continue;
    const p = path.join(mipmapDir, entry.name, 'ic_launcher.webp');
    if (fs.existsSync(p)) out.push(p);
  }
  return out;
}

const DENSITY_SCALE = {
  mdpi: 1,
  hdpi: 1.5,
  xhdpi: 2,
  xxhdpi: 3,
  xxxhdpi: 4,
};

function getLauncherSize(iconPath) {
  const match = iconPath.match(/mipmap-(\w+)/);
  const scale = DENSITY_SCALE[match?.[1] ?? ''] ?? 1;
  return Math.round(48 * scale);
}

async function toSmallRgbaBuffer(filePath, size) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .resize(size, size, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.width !== size || info.height !== size || info.channels !== 4) {
    throw new Error(`Unexpected image shape for ${filePath}: ${info.width}x${info.height}x${info.channels}`);
  }
  return data;
}

function meanAbsDiff(a, b) {
  if (a.length !== b.length) throw new Error('Buffer length mismatch');
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    sum += Math.abs(a[i] - b[i]);
  }
  return sum / (a.length * 255);
}

async function main() {
  if (!fs.existsSync(sourceIcon)) {
    console.error('Missing source icon:', path.relative(root, sourceIcon).replace(/\\/g, '/'));
    process.exit(1);
  }

  const launcherIcons = listLauncherIcons();
  if (!launcherIcons.length) {
    console.error('No Android launcher icons found under:', path.relative(root, mipmapDir).replace(/\\/g, '/'));
    process.exit(1);
  }

  const failures = [];

  for (const iconPath of launcherIcons) {
    const size = getLauncherSize(iconPath);
    const srcBuf = await toSmallRgbaBuffer(sourceIcon, size);
    const buf = await toSmallRgbaBuffer(iconPath, size);
    const diff = meanAbsDiff(srcBuf, buf);

    // 0.00 = identical after normalization.
    // Android launcher icons are often re-centered/padded vs the source `icon.png`,
    // so we allow a small but meaningful difference. A totally different icon (e.g. Expo)
    // will exceed this by a lot.
    const ok = diff <= 0.03;
    if (!ok) {
      failures.push({
        file: path.relative(root, iconPath).replace(/\\/g, '/'),
        diff: Number(diff.toFixed(4)),
      });
    }
  }

  if (failures.length) {
    console.error('Android launcher icons do NOT match assets/images/icon.png');
    for (const f of failures) console.error(` - ${f.file} (diff=${f.diff})`);
    process.exit(1);
  }

  console.log(`OK: Android launcher icons match ${path.relative(root, sourceIcon).replace(/\\/g, '/')}`);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});

