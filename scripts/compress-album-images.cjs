/**
 * Compresses PNG images in assets/images/albums/ to fit within Google Play's
 * 200 MB base-module limit. Resizes to max 720px width and applies PNG
 * compression, keeping valid PNG format (required by AAPT).
 *
 * Usage: node scripts/compress-album-images.cjs [--dry-run]
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ALBUMS_DIR = path.join(__dirname, '..', 'assets', 'images', 'albums');
const MAX_WIDTH = 720;
const MIN_SIZE_TO_COMPRESS = 100 * 1024; // only compress files > 100KB

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  if (!fs.existsSync(ALBUMS_DIR)) {
    console.error('Directory not found:', ALBUMS_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(ALBUMS_DIR)
    .filter(f => f.toLowerCase().endsWith('.png'));

  let totalBefore = 0;
  let totalAfter = 0;
  let compressed = 0;
  let skipped = 0;

  for (const file of files) {
    const filePath = path.join(ALBUMS_DIR, file);
    const stat = fs.statSync(filePath);
    totalBefore += stat.size;

    if (stat.size < MIN_SIZE_TO_COMPRESS) {
      totalAfter += stat.size;
      skipped++;
      continue;
    }

    try {
      const meta = await sharp(filePath).metadata();

      if (!meta.width || meta.width <= MAX_WIDTH) {
        totalAfter += stat.size;
        skipped++;
        continue;
      }

      const outBuf = await sharp(filePath)
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toBuffer();

      if (dryRun) {
        console.log(
          `[DRY] ${file}: ${(stat.size / 1024).toFixed(0)}KB -> ${(outBuf.length / 1024).toFixed(0)}KB` +
          ` (${meta.width}x${meta.height} -> ${MAX_WIDTH}x${Math.round(meta.height * MAX_WIDTH / meta.width)})`
        );
        totalAfter += outBuf.length;
      } else {
        fs.writeFileSync(filePath, outBuf);
        totalAfter += outBuf.length;
        console.log(
          `${file}: ${(stat.size / 1024).toFixed(0)}KB -> ${(outBuf.length / 1024).toFixed(0)}KB` +
          ` (${meta.width}x${meta.height} -> ${MAX_WIDTH}x${Math.round(meta.height * MAX_WIDTH / meta.width)})`
        );
      }
      compressed++;
    } catch (err) {
      console.error(`ERROR ${file}:`, err.message);
      totalAfter += stat.size;
      skipped++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Files: ${files.length} total, ${compressed} compressed, ${skipped} skipped`);
  console.log(`Before: ${(totalBefore / 1048576).toFixed(2)} MB`);
  console.log(`After:  ${(totalAfter / 1048576).toFixed(2)} MB`);
  console.log(`Saved:  ${((totalBefore - totalAfter) / 1048576).toFixed(2)} MB`);
  if (dryRun) console.log('(dry run — no files were modified)');
}

main().catch(err => { console.error(err); process.exit(1); });
