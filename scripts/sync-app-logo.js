/**
 * App icon (launcher / iOS home screen): assets/images/app-icon-source.jpg
 * Splash & in-app logo (logov2 blue): assets/images/logo-source.svg
 */
const fs = require('fs');
const path = require('path');

const sharp = require('sharp');

const root = path.join(__dirname, '..');
const splashLogo = path.join(root, 'assets/images/logo-source.svg');
const appIconSource = path.join(root, 'assets/images/app-icon-source.jpg');
const assetsDir = path.join(root, 'assets/images');
const iosIconSet = path.join(root, 'ios/018BY/Images.xcassets/AppIcon.appiconset');
const iosIcon = path.join(iosIconSet, 'App-Icon-1024x1024@1x.png');
const iosLogoJpg = path.join(iosIconSet, 'logo.jpg');
const androidRes = path.join(root, 'android/app/src/main/res');

const iosSplashDir = path.join(
  root,
  'ios/018BY/Images.xcassets/SplashScreenLogo.imageset'
);

const WHITE_BG = { r: 255, g: 255, b: 255, alpha: 1 };
const TRANSPARENT_BG = { r: 0, g: 0, b: 0, alpha: 0 };
/** Pink background from iOS app icon (logo.jpg). */
const APP_ICON_BG = { r: 233, g: 134, b: 155, alpha: 1 };

const ANDROID_DENSITIES = {
  mdpi: 1,
  hdpi: 1.5,
  xhdpi: 2,
  xxhdpi: 3,
  xxxhdpi: 4,
};

/** Expo splash `imageWidth: 200` → iOS 1x/2x/3x and Android mdpi base 288. */
const IOS_SPLASH_FILES = {
  'image.png': 200,
  'image@2x.png': 400,
  'image@3x.png': 600,
};
const ANDROID_SPLASH_BASE_PX = 288;
const ANDROID_NOTIFICATION_BASE_PX = 24;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function loadSplashLogo() {
  return sharp(splashLogo).resize(1024, 1024, {
    fit: 'contain',
    background: TRANSPARENT_BG,
  });
}

function loadAppIcon() {
  return sharp(appIconSource).resize(1024, 1024, {
    fit: 'cover',
    background: APP_ICON_BG,
  });
}

async function appIconPipeline(size) {
  return loadAppIcon().resize(size, size, { fit: 'cover', background: APP_ICON_BG }).png();
}

async function splashLogoPipeline(size) {
  return loadSplashLogo()
    .resize(size, size, { fit: 'contain', background: TRANSPARENT_BG })
    .png();
}

async function appIconSilhouette(size) {
  const { data, info } = await loadAppIcon()
    .resize(size, size, { fit: 'cover', background: APP_ICON_BG })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    const isBackground =
      a < 16 ||
      (Math.abs(r - APP_ICON_BG.r) < 24 &&
        Math.abs(g - APP_ICON_BG.g) < 24 &&
        Math.abs(b - APP_ICON_BG.b) < 24);

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

async function splashSilhouette(size) {
  const { data, info } = await loadSplashLogo()
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
  await writePng(await appIconPipeline(1024), path.join(assetsDir, 'icon.png'));
  await writePng(
    await appIconPipeline(1024),
    path.join(assetsDir, 'android-icon-foreground.png')
  );
  await writePng(
    await appIconSilhouette(1024),
    path.join(assetsDir, 'android-icon-monochrome.png')
  );
  await writePng(await splashLogoPipeline(1024), path.join(assetsDir, 'logo.png'));
  await writePng(await splashLogoPipeline(1024), path.join(assetsDir, 'splash-icon.png'));
  await writePng(await appIconPipeline(48), path.join(assetsDir, 'favicon.png'));
  await writePng(
    await splashSilhouette(96),
    path.join(assetsDir, 'notification-icon.png')
  );
}

async function syncIosIcon() {
  await writePng(await appIconPipeline(1024), iosIcon);
  fs.copyFileSync(appIconSource, iosLogoJpg);
}

async function syncIosSplash() {
  for (const [filename, size] of Object.entries(IOS_SPLASH_FILES)) {
    await writePng(await splashLogoPipeline(size), path.join(iosSplashDir, filename));
  }
}

async function syncAndroidDrawables() {
  const masterNotification = path.join(assetsDir, 'notification-icon.png');

  for (const [density, scale] of Object.entries(ANDROID_DENSITIES)) {
    const drawableDir = path.join(androidRes, `drawable-${density}`);
    const splashSize = Math.round(ANDROID_SPLASH_BASE_PX * scale);
    const notificationSize = Math.round(ANDROID_NOTIFICATION_BASE_PX * scale);

    await writePng(
      await splashLogoPipeline(splashSize),
      path.join(drawableDir, 'splashscreen_logo.png')
    );
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
      fit: 'cover',
      background: APP_ICON_BG,
    });
    const foreground = sharp(masterForeground).resize(foregroundSize, foregroundSize, {
      fit: 'cover',
      background: APP_ICON_BG,
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
  if (!fs.existsSync(splashLogo)) {
    console.error('Missing splash logo:', splashLogo);
    process.exit(1);
  }
  if (!fs.existsSync(appIconSource)) {
    console.error('Missing app icon source:', appIconSource);
    process.exit(1);
  }

  await syncExpoAssets();
  await syncIosIcon();
  await syncIosSplash();
  await syncAndroidDrawables();
  await syncAndroidMipmaps();

  console.log(
    'App logo synced: pink app icon (jpg) + blue splash (svg) → Expo, iOS, Android.'
  );
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
