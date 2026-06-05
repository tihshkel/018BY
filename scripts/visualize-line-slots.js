/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const ALBUM_FOLDERS = [
  { albumId: 'pregnancy_60', folder: 'Блок БЕРЕМЕННОСТЬ 60 стр' },
  { albumId: 'pregnancy_a5', folder: 'Блок БЕРЕМЕННОСТЬ A5 другой блок' },
  { albumId: 'kids_48', folder: 'Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр' },
  { albumId: 'holidays_birthday_60', folder: 'Блок ДНЕЙ РОЖДЕНИЯ 60 стр' },
  {
    albumId: 'diary_interior_brown',
    folder: 'albums/diary/cover/in album/Блок коричневый _180х240_print',
  },
  {
    albumId: 'diary_interior_purple',
    folder: 'albums/diary/cover/in album/Блок фиолетовый_180х240_print',
  },
];

function loadLineSlots(projectRoot) {
  const jsonFile = path.join(projectRoot, 'constants', 'line-slots.json');
  if (fs.existsSync(jsonFile)) {
    return JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  }
  throw new Error('Run npm run generate:line-slots first (constants/line-slots.json missing)');
}

async function main() {
  const projectRoot = process.cwd();
  const lineSlots = loadLineSlots(projectRoot);
  const outRoot = path.join(projectRoot, 'assets', 'debug', 'line-slots');
  fs.mkdirSync(outRoot, { recursive: true });

  const onlyAlbum = process.env.ONLY_ALBUM;

  for (const spec of ALBUM_FOLDERS) {
    if (onlyAlbum && onlyAlbum !== spec.albumId) continue;
    const albumSlots = lineSlots[spec.albumId];
    if (!albumSlots) continue;

    const folderPath = path.join(
      projectRoot,
      spec.folder.startsWith('albums/') ? spec.folder : path.join('assets', 'pdfs', spec.folder)
    );
    if (!fs.existsSync(folderPath)) {
      console.warn('Skip visualize', spec.albumId, 'no folder');
      continue;
    }

    const albumOut = path.join(outRoot, spec.albumId);
    fs.mkdirSync(albumOut, { recursive: true });

    for (const [pageKey, slots] of Object.entries(albumSlots)) {
      if (!slots?.length) continue;
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

      for (const slot of slots) {
        const top = Math.round((slot.y - slot.height / 2) * png.height);
        const left = Math.round(slot.x * png.width);
        const w = Math.round(slot.width * png.width);
        const h = Math.max(2, Math.round(slot.height * png.height));

        for (let dy = 0; dy < h; dy += 1) {
          const y = top + dy;
          if (y < 0 || y >= png.height) continue;
          for (let x = left; x < left + w && x < png.width; x += 1) {
            const idx = (png.width * y + x) << 2;
            png.data[idx] = 255;
            png.data[idx + 1] = 0;
            png.data[idx + 2] = 120;
            png.data[idx + 3] = 90;
          }
        }
      }

      const outPath = path.join(albumOut, fileName);
      await new Promise((resolve, reject) => {
        png
          .pack()
          .pipe(fs.createWriteStream(outPath))
          .on('finish', resolve)
          .on('error', reject);
      });
    }

    console.log('✅', spec.albumId, '→', path.relative(projectRoot, albumOut));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
