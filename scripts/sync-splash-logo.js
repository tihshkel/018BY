/**
 * Синхронизирует splash: синий логотип (logo-source.svg) на кремовом фоне #FAF8F5.
 * Иконка приложения (розовая) сюда не попадает — иначе на части Android другой splash.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const svgPath = path.join(root, 'assets/images/logo-source.svg');
const assetsDir = path.join(root, 'assets/images');
const androidRes = path.join(root, 'android/app/src/main/res');
const iosSplashDir = path.join(
  root,
  'ios/018BY/Images.xcassets/SplashScreenLogo.imageset',
);

const SPLASH_BG = { r: 250, g: 248, b: 245, alpha: 1 }; // #FAF8F5
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

const ANDROID_DENSITIES = {
  mdpi: 1,
  hdpi: 1.5,
  xhdpi: 2,
  xxhdpi: 3,
  xxxhdpi: 4,
};

async function main() {
  if (!fs.existsSync(svgPath)) {
    throw new Error('Missing assets/images/logo-source.svg');
  }

  // Expo / JS splash: синий логотип на креме (как на целевом скриншоте).
  await sharp(svgPath)
    .resize(1024, 1024, { fit: 'contain', background: SPLASH_BG })
    .flatten({ background: SPLASH_BG })
    .png()
    .toFile(path.join(assetsDir, 'splash-icon.png'));

  // Android 12+ animated icon: синий на прозрачном — фон рисует theme (#FAF8F5).
  for (const [density, scale] of Object.entries(ANDROID_DENSITIES)) {
    const size = Math.round(288 * scale);
    const outDir = path.join(androidRes, `drawable-${density}`);
    fs.mkdirSync(outDir, { recursive: true });
    await sharp(svgPath)
      .resize(size, size, { fit: 'contain', background: TRANSPARENT })
      .png()
      .toFile(path.join(outDir, 'splashscreen_logo.png'));
  }

  if (fs.existsSync(iosSplashDir)) {
    await sharp(svgPath)
      .resize(200, 200, { fit: 'contain', background: TRANSPARENT })
      .png()
      .toFile(path.join(iosSplashDir, 'image.png'));
    await sharp(svgPath)
      .resize(400, 400, { fit: 'contain', background: TRANSPARENT })
      .png()
      .toFile(path.join(iosSplashDir, 'image@2x.png'));
    await sharp(svgPath)
      .resize(600, 600, { fit: 'contain', background: TRANSPARENT })
      .png()
      .toFile(path.join(iosSplashDir, 'image@3x.png'));
  }

  console.log('Splash synced from logo-source.svg (blue on #FAF8F5 / transparent).');
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
