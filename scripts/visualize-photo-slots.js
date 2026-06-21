#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Overlay photo slot regions on album page PNGs for calibration.
 * node scripts/visualize-photo-slots.js
 * ONLY_ALBUM=pregnancy_60 node scripts/visualize-photo-slots.js
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const ALBUM_FOLDERS = [
  { albumId: 'pregnancy_60', folder: 'Блок БЕРЕМЕННОСТЬ 60 стр' },
  { albumId: 'pregnancy_a5', folder: 'Блок БЕРЕМЕННОСТЬ A5 другой блок' },
  { albumId: 'kids_48', folder: 'Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр' },
  { albumId: 'family_blank', folder: 'Блок СЕМЕЙНЫЙ альбом 20 стр' },
  { albumId: 'holidays_blank', folder: 'Блок ПРАЗДНИКИ 20 стр' },
];

function loadPhotoSlotsTs(projectRoot) {
  const file = path.join(projectRoot, 'constants', 'photo-slots.ts');
  const source = fs.readFileSync(file, 'utf8');
  const albums = {};

  for (const { albumId } of ALBUM_FOLDERS) {
    const re = new RegExp(`${albumId}:\\s*\\{([\\s\\S]*?)\\n  \\}`, 'm');
    const block = source.match(re)?.[1] ?? '';
    const pages = new Set();

    for (const m of block.matchAll(/'(\d+)':/g)) pages.add(m[1]);
    const eventMatch = block.match(/eventPages\(\[([\d,\s]+)\]/);
    if (eventMatch) {
      eventMatch[1].split(',').forEach((n) => pages.add(n.trim()));
    }
    const blankMatch = block.match(/blankAlbumPages\((\d+)\)/);
    if (blankMatch) {
      const count = Number(blankMatch[1]);
      for (let i = 1; i <= count; i += 1) pages.add(String(i));
    }

    albums[albumId] = [...pages];
  }

  return albums;
}

function parseVariantSlots(source, albumId, pageKey) {
  const variants = [];
  const albumRe = new RegExp(`${albumId}:\\s*\\{([\\s\\S]*?)\\n  \\}`, 'm');
  const albumBlock = source.match(albumRe)?.[1] ?? '';

  if (albumBlock.includes('...eventPages([') && !albumBlock.includes(`'${pageKey}':`)) {
    const eventMatch = albumBlock.match(/eventPages\(\[([\d,\s]+)\]/);
    if (eventMatch?.[1].split(',').map((n) => n.trim()).includes(pageKey)) {
      return parseVariantsFromHelper(source, 'EVENT_PHOTO_TEMPLATES');
    }
  }

  if (albumBlock.includes('blankAlbumPages(') && !albumBlock.includes(`'${pageKey}':`)) {
    return parseVariantsFromHelper(source, 'FULL_PHOTO_TEMPLATES');
  }

  const fnMatch = albumBlock.match(
    new RegExp(`'${pageKey}':\\s*([a-zA-Z]+(?:\\([^)]*\\))?)`),
  );
  if (!fnMatch) return variants;

  const fn = fnMatch[1];
  if (fn.startsWith('layoutsFromTemplates')) {
    const templatesMatch = fn.match(/\[([\s\S]*?)\]/);
    const templateIds = templatesMatch?.[1]?.match(/'([^']+)'/g)?.map((s) => s.slice(1, -1)) ?? [];
    return templateIds.map((id) => ({ variantId: id, slots: defaultSlotsForVariant(id) }));
  }
  if (fn.includes('pregnancyPhotoLayouts')) {
    return parseVariantsFromHelper(source, 'FULL_PHOTO_TEMPLATES');
  }
  if (fn.includes('eventPhotoLayouts')) {
    return parseVariantsFromHelper(source, 'EVENT_PHOTO_TEMPLATES');
  }

  return variants;
}

function parseVariantsFromHelper(source, constName) {
  const re = new RegExp(`const ${constName} = \\[([\\s\\S]*?)\\] as const`);
  const ids = source.match(re)?.[1]?.match(/'([^']+)'/g)?.map((s) => s.slice(1, -1)) ?? [];
  return ids.map((id) => ({ variantId: id, slots: defaultSlotsForVariant(id) }));
}

function defaultSlotsForVariant(variantId) {
  const counts = {
    one_large: 1,
    one_horizontal: 1,
    two_photos: 2,
    two_horizontal: 2,
    two_vertical: 2,
    three_hero: 3,
    four_grid: 4,
    four_vertical: 4,
  };
  const n = counts[variantId] ?? 1;
  return Array.from({ length: n }, (_, i) => ({
    x: 0.12,
    y: 0.25 + i * 0.15,
    width: 0.76,
    height: 0.12,
  }));
}

async function main() {
  const projectRoot = process.cwd();
  const photoSlotsSource = fs.readFileSync(
    path.join(projectRoot, 'constants', 'photo-slots.ts'),
    'utf8',
  );
  const albumPages = loadPhotoSlotsTs(projectRoot);
  const outRoot = path.join(projectRoot, 'assets', 'debug', 'photo-slots');
  fs.mkdirSync(outRoot, { recursive: true });

  const onlyAlbum = process.env.ONLY_ALBUM;

  for (const spec of ALBUM_FOLDERS) {
    if (onlyAlbum && onlyAlbum !== spec.albumId) continue;
    const pages = albumPages[spec.albumId];
    if (!pages?.length) continue;

    const folderPath = path.join(projectRoot, 'assets', 'pdfs', spec.folder);
    if (!fs.existsSync(folderPath)) {
      console.warn('Skip visualize', spec.albumId, 'no folder', folderPath);
      continue;
    }

    const albumOut = path.join(outRoot, spec.albumId);
    fs.mkdirSync(albumOut, { recursive: true });

    for (const pageKey of pages) {
      const pageNum = Number(pageKey);
      const fileName = `page_${String(pageNum).padStart(3, '0')}.png`;
      const filePath = path.join(folderPath, fileName);
      if (!fs.existsSync(filePath)) continue;

      const png = await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(new PNG())
          .on('parsed', function parsed() {
            resolve(this);
          })
          .on('error', reject);
      });

      const variants = parseVariantSlots(photoSlotsSource, spec.albumId, pageKey);
      const twoPhotoVariant = variants.find((v) => v.variantId === 'two_photos') ?? variants[0];
      if (!twoPhotoVariant?.slots?.length) continue;

      for (const slot of twoPhotoVariant.slots) {
        const top = Math.round((slot.y - slot.height / 2) * png.height);
        const left = Math.round(slot.x * png.width);
        const w = Math.round(slot.width * png.width);
        const h = Math.max(2, Math.round(slot.height * png.height));

        for (let dy = 0; dy < h; dy += 1) {
          for (let dx = 0; dx < w; dx += 1) {
            const px = left + dx;
            const py = top + dy;
            if (px < 0 || py < 0 || px >= png.width || py >= png.height) continue;
            const idx = (png.width * py + px) << 2;
            png.data[idx] = 255;
            png.data[idx + 1] = 64;
            png.data[idx + 2] = 128;
            png.data[idx + 3] = 180;
          }
        }
      }

      const outPath = path.join(albumOut, `page_${String(pageNum).padStart(3, '0')}_slots.png`);
      await new Promise((resolve, reject) => {
        png
          .pack()
          .pipe(fs.createWriteStream(outPath))
          .on('finish', resolve)
          .on('error', reject);
      });
      console.log('Wrote', outPath);
    }

    const previewDir = path.join(folderPath, 'preview_variants');
    if (process.env.USE_PREVIEW_VARIANTS === '1' && fs.existsSync(previewDir)) {
      const previewOut = path.join(albumOut, 'preview_variants');
      fs.mkdirSync(previewOut, { recursive: true });
      for (const file of fs.readdirSync(previewDir).filter((f) => f.endsWith('.png'))) {
        const pageMatch = file.match(/page_(\d+)_/);
        if (!pageMatch) continue;
        const pageKey = String(Number(pageMatch[1]));
        const filePath = path.join(previewDir, file);
        const png = await new Promise((resolve, reject) => {
          fs.createReadStream(filePath)
            .pipe(new PNG())
            .on('parsed', function parsed() {
              resolve(this);
            })
            .on('error', reject);
        });
        const variants = parseVariantSlots(photoSlotsSource, spec.albumId, pageKey);
        const variant = variants[0];
        if (!variant?.slots?.length) continue;
        for (const slot of variant.slots) {
          const top = Math.round((slot.y - slot.height / 2) * png.height);
          const left = Math.round(slot.x * png.width);
          const w = Math.round(slot.width * png.width);
          const h = Math.max(2, Math.round(slot.height * png.height));
          for (let dy = 0; dy < h; dy += 1) {
            for (let dx = 0; dx < w; dx += 1) {
              const px = left + dx;
              const py = top + dy;
              if (px < 0 || py < 0 || px >= png.width || py >= png.height) continue;
              const idx = (png.width * py + px) << 2;
              png.data[idx] = 64;
              png.data[idx + 1] = 200;
              png.data[idx + 2] = 255;
              png.data[idx + 3] = 160;
            }
          }
        }
        const outPath = path.join(previewOut, file.replace('.png', '_slots.png'));
        await new Promise((resolve, reject) => {
          png
            .pack()
            .pipe(fs.createWriteStream(outPath))
            .on('finish', resolve)
            .on('error', reject);
        });
        console.log('Wrote preview overlay', outPath);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
