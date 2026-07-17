/**
 * Generates app icon assets from the master logo (PNG preferred, SVG fallback).
 * Updates Expo assets, iOS AppIcon, and Android mipmap launchers + notification icons.
 *
 * Важно: splash НЕ берётся из розового icon — только scripts/sync-splash-logo.js
 * (синий logo-source.svg). Иначе на части Android при запуске другой логотип.
 */
const fs = require('fs');
const path = require('path');

const sharp = require('sharp');

const root = path.join(__dirname, '..');
const sourceLogoPng = path.join(root, 'assets/images/logo-source.png');
const sourceLogoSvg = path.join(root, 'assets/images/logo-source.svg');
const assetsDir = path.join(root, 'assets/images');
const iosIcon = path.join(
  root,
  'ios/018BY/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png'
);
const androidRes = path.join(root, 'android/app/src/main/res');

const BRAND_PINK = { r: 241, g: 148, b: 162, alpha: 1 };
const TRANSPARENT_BG = { r: 0, g: 0, b: 0, alpha: 0 };

const ANDROID_DENSITIES = {
  mdpi: 1,
  hdpi: 1.5,
  xhdpi: 2,
  xxhdpi: 3,
  xxxhdpi: 4,
};

const ANDROID_NOTIFICATION_BASE_PX = 24;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function resolveSourcePath() {
  if (fs.existsSync(sourceLogoPng)) return sourceLogoPng;
  if (fs.existsSync(sourceLogoSvg)) return sourceLogoSvg;
  return null;
}

function loadLogo() {
  const sourcePath = resolveSourcePath();
  if (!sourcePath) {
    throw new Error('Missing assets/images/logo-source.png (or logo-source.svg)');
  }

  return sharp(sourcePath).resize(1024, 1024, {
    fit: 'contain',
    background: BRAND_PINK,
  });
}

function isSilhouetteBackground(r, g, b, a) {
  if (a < 16) return true;
  if (r > 235 && g > 235 && b > 235) return true;
  // Розовый фон основного логотипа (#F194A2 и близкие оттенки)
  if (r > 170 && g > 90 && b > 100 && r >= g - 20 && b >= g - 40) return true;
  return false;
}

async function iconPipeline(size) {
  return loadLogo().resize(size, size, { fit: 'contain', background: BRAND_PINK }).png();
}

async function logoPipeline(size) {
  return loadLogo().resize(size, size, { fit: 'contain', background: BRAND_PINK }).png();
}

async function whiteSilhouette(size) {
  const { data, info } = await loadLogo()
    .resize(size, size, { fit: 'contain', background: BRAND_PINK })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (isSilhouetteBackground(r, g, b, a)) {
      data[i + 3] = 0;
    } else {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 255;
    }
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png();
}

async function writePng(pipeline, targetPath) {
  ensureDir(path.dirname(targetPath));
  await pipeline.toFile(targetPath);
}

async function writeWebp(pipeline, targetPath) {
  ensureDir(path.dirname(targetPath));
  await pipeline.webp({ lossless: true }).toFile(targetPath);
}

async function syncExpoAssets() {
  await writePng(await iconPipeline(1024), path.join(assetsDir, 'icon.png'));
  await writePng(
    await iconPipeline(1024),
    path.join(assetsDir, 'android-icon-foreground.png')
  );
  await writePng(
    await whiteSilhouette(1024),
    path.join(assetsDir, 'android-icon-monochrome.png')
  );
  await writePng(await logoPipeline(1024), path.join(assetsDir, 'logo.png'));
  // splash-icon.png — только через sync-splash-logo.js (синий SVG), не розовый icon.
  await writePng(await iconPipeline(48), path.join(assetsDir, 'favicon.png'));
  await writePng(
    await whiteSilhouette(96),
    path.join(assetsDir, 'notification-icon.png')
  );
}

async function syncIosIcon() {
  await writePng(await iconPipeline(1024), iosIcon);
}

async function syncIosSplash() {
  // Splash — только цвет фона, без логотипа (см. ios/018BY/SplashScreen.storyboard).
}

async function syncAndroidDrawables() {
  const masterNotification = path.join(assetsDir, 'notification-icon.png');

  for (const [density, scale] of Object.entries(ANDROID_DENSITIES)) {
    const drawableDir = path.join(androidRes, `drawable-${density}`);
    const notificationSize = Math.round(ANDROID_NOTIFICATION_BASE_PX * scale);

    await writePng(
      sharp(masterNotification).resize(notificationSize, notificationSize, {
        fit: 'contain',
        background: TRANSPARENT_BG,
      }),
      path.join(drawableDir, 'notification_icon.png')
    );
  }
}

async function syncAndroidMipmaps() {
  const masterIcon = path.join(assetsDir, 'icon.png');
  const masterForeground = path.join(assetsDir, 'android-icon-foreground.png');
  const masterMonochrome = path.join(assetsDir, 'android-icon-monochrome.png');

  for (const [density, scale] of Object.entries(ANDROID_DENSITIES)) {
    const dir = path.join(androidRes, `mipmap-${density}`);
    const launcherSize = Math.round(48 * scale);
    const foregroundSize = Math.round(108 * scale);

    const launcher = sharp(masterIcon).resize(launcherSize, launcherSize, {
      fit: 'contain',
      background: BRAND_PINK,
    });
    const foreground = sharp(masterForeground).resize(foregroundSize, foregroundSize, {
      fit: 'contain',
      background: BRAND_PINK,
    });
    const monochrome = sharp(masterMonochrome).resize(foregroundSize, foregroundSize, {
      fit: 'contain',
      background: TRANSPARENT_BG,
    });

    await writeWebp(launcher, path.join(dir, 'ic_launcher.webp'));
    await writeWebp(launcher, path.join(dir, 'ic_launcher_round.webp'));
    await writeWebp(foreground, path.join(dir, 'ic_launcher_foreground.webp'));
    await writeWebp(monochrome, path.join(dir, 'ic_launcher_monochrome.webp'));
  }
}

async function main() {
  const sourcePath = resolveSourcePath();
  if (!sourcePath) {
    console.error('Missing source logo: assets/images/logo-source.png');
    process.exit(1);
  }

  console.log('Using logo source:', path.relative(root, sourcePath));

  await syncExpoAssets();
  await syncIosIcon();
  await syncIosSplash();
  await syncAndroidDrawables();
  await syncAndroidMipmaps();

  // Splash отдельно — синий логотип, единый на всех Android (светлая/тёмная тема).
  require('child_process').execFileSync(process.execPath, [path.join(__dirname, 'sync-splash-logo.js')], {
    stdio: 'inherit',
  });

  console.log(
    'App logo synced: Expo assets, iOS AppIcon, Android launcher/notifications + splash.'
  );
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
