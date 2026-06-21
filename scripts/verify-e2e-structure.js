#!/usr/bin/env node
/**
 * Verifies E2E Maestro flow files and testID hooks exist in the app.
 * node scripts/verify-e2e-structure.js
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

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function listYamlFlows(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listYamlFlows(full));
    } else if (entry.name.endsWith('.yaml')) {
      results.push(full);
    }
  }
  return results;
}

const flowsDir = path.join(root, 'e2e/maestro/flows');
assert(fs.existsSync(flowsDir), 'e2e/maestro/flows exists');

const flows = listYamlFlows(flowsDir);
assert(flows.length >= 20, `at least 20 maestro flows (found ${flows.length})`);

const requiredFlows = [
  '00-smoke/onboarding-to-home.yaml',
  '02-profile/profile-edit-name.yaml',
  '03-album-create/create-kids.yaml',
  '03-album-create/create-diary.yaml',
  '04-album-fill/fill-diary-brown-p41-friends.yaml',
  '04-album-fill/fill-diary-brown-p34-schedule.yaml',
  '04-album-fill/fill-diary-brown-p57-free-photo.yaml',
  '04-album-fill/fill-diary-brown-p60-static.yaml',
  '04-album-fill/fill-diary-purple-p28-friends.yaml',
  '04-album-fill/fill-birthday-p3-free.yaml',
  '04-album-fill/fill-birthday-p40-travel.yaml',
  '04-album-fill/fill-birthday-p48-letter.yaml',
  '04-album-fill/fill-pregnancy-a5-p44.yaml',
  '04-album-fill/fill-pregnancy-p56-variant.yaml',
  '04-album-fill/fill-kids-p6-variant.yaml',
  '04-album-fill/fill-kids-p2-static.yaml',
  '05-export/export-electronic.yaml',
  '05-export/export-pregnancy-a5-smoke.yaml',
  '05-export/export-pregnancy-60-smoke.yaml',
  '05-export/export-diary-brown-smoke.yaml',
  '05-export/export-birthday-smoke.yaml',
  '05-export/export-blank-smoke.yaml',
  '03-album-create/create-blank-family.yaml',
];

for (const rel of requiredFlows) {
  assert(
    flows.some((f) => f.endsWith(rel)),
    `flow present: ${rel}`,
  );
}

const testIdChecks = [
  ['app/onboarding.tsx', 'onboarding-next'],
  ['app/name-input.tsx', 'name-input-field'],
  ['app/login.tsx', 'login-email'],
  ['app/(tabs)/profile.tsx', 'profile-edit-name'],
  ['app/(tabs)/_layout.tsx', 'tabBarButtonTestID'],
  ['components/avatar-picker-sheet.tsx', 'avatar-preset-'],
  ['app/export-review.tsx', 'export-start'],
  ['app/album-page-form.tsx', 'unified-editor-save'],
  ['app/album-page-form.tsx', 'form-save'],
  ['app/album-page-photos.tsx', 'unified-editor-save'],
  ['components/album/album-variant-bar.tsx', 'variant-chip-'],
  ['components/album/photo-slot-gesture-layer.tsx', 'photo-slot-'],
  ['components/album/photo-block-group-gesture.tsx', 'photo-edit-mode-'],
  ['app/(tabs)/projects.tsx', 'project-category-'],
  ['app/projects/templates.tsx', 'cover-'],
];

for (const [file, needle] of testIdChecks) {
  const src = read(file);
  assert(src.includes(needle), `${file} contains ${needle}`);
}

const pkg = JSON.parse(read('package.json'));
assert(pkg.scripts['test:preflight'], 'package.json test:preflight script');
assert(pkg.scripts['test:e2e'], 'package.json test:e2e script');

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}

console.log('\nAll E2E structure checks passed.');
