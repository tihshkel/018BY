/**
 * Generates app icon assets from assets/images/logo-source.svg (logov2).
 * Updates Expo assets, iOS AppIcon, and Android mipmap launchers.
 */
const fs = require('fs');
const path = require('path');

const sharp = require('sharp');

const root = path.join(__dirname, '..');
const sourceLogo = path.join(root, 'assets/images/logo-source.svg');
const assetsDir = path.join(root, 'assets/images');
const iosIcon = path.join(
  root,
  'ios/018BY/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png'
);
const androidRes = path.join(root, 'android/app/src/main/res');

const WHITE_BG = { r: 255, g: 255, b: 255, alpha: 1 };
const TRANSPARENT_BG = { r: 0, g: 0, b: 0, alpha: 0 };

const ANDROID_DENSITIES = {
  mdpi: 1,
  hdpi: 1.5,
  xhdpi: 2,
  xxhdpi: 3,
  xxxhdpi: 4,
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function loadLogo() {
  return sharp(sourceLogo).resize(1024, 1024, {
    fit: 'contain',
    background: TRANSPARENT_BG,
  });
}

async function iconPipeline(size, background = WHITE_BG) {
  return loadLogo().resize(size, size, { fit: 'contain', background }).png();
}

async function logoPipeline(size) {
  return loadLogo().resize(size, size, { fit: 'contain', background: TRANSPARENT_BG }).png();
}

async function whiteSilhouette(size) {
  const { data, info } = await loadLogo()
    .resize(size, size, { fit: 'contain', background: WHITE_BG })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    const isBackground = a < 16 || (r > 235 && g > 235 && b > 235);

    if (isBackground) {
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
  await writePng(await logoPipeline(1024), path.join(assetsDir, 'splash-icon.png'));
  await writePng(await iconPipeline(48), path.join(assetsDir, 'favicon.png'));
  await writePng(
    await whiteSilhouette(96),
    path.join(assetsDir, 'notification-icon.png')
  );
}

async function syncIosIcon() {
  await writePng(await iconPipeline(1024), iosIcon);
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
      background: WHITE_BG,
    });
    const foreground = sharp(masterForeground).resize(foregroundSize, foregroundSize, {
      fit: 'contain',
      background: WHITE_BG,
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
  if (!fs.existsSync(sourceLogo)) {
    console.error('Missing source logo:', sourceLogo);
    process.exit(1);
  }

  await syncExpoAssets();
  await syncIosIcon();
  await syncAndroidMipmaps();

  console.log('App logo synced from logo-source.svg to all targets.');
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
