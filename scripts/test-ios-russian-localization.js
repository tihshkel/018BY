#!/usr/bin/env node
/**
 * node scripts/test-ios-russian-localization.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
    return;
  }
  console.log(`OK: ${message}`);
}

const appJson = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
assert(
  appJson.expo.locales?.ru === './locales/ru.json',
  'app.json declares ru locale',
);
assert(
  appJson.expo.ios.infoPlist.CFBundleDevelopmentRegion === 'ru',
  'app.json sets CFBundleDevelopmentRegion=ru',
);
assert(
  appJson.expo.ios.infoPlist.CFBundleLocalizations?.includes('ru'),
  'app.json lists ru in CFBundleLocalizations',
);

const infoPlist = fs.readFileSync(path.join(root, 'ios/018BY/Info.plist'), 'utf8');
assert(infoPlist.includes('<string>ru</string>'), 'ios Info.plist uses ru development region');
assert(infoPlist.includes('CFBundleLocalizations'), 'ios Info.plist declares localizations');

const pbxproj = fs.readFileSync(
  path.join(root, 'ios/018BY.xcodeproj/project.pbxproj'),
  'utf8',
);
assert(pbxproj.includes('developmentRegion = ru;'), 'Xcode project developmentRegion is ru');
assert(pbxproj.includes('ru,'), 'Xcode project knownRegions includes ru');

const pluginSource = fs.readFileSync(
  path.join(root, 'plugins/with-ios-russian-localization.js'),
  'utf8',
);
assert(pluginSource.includes("CFBundleDevelopmentRegion = 'ru'"), 'config plugin sets ru region');

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}

console.log('\nAll iOS Russian localization checks passed.');
