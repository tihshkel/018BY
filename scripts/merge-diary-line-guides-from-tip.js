const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const tip = '6858f3d';

function gitShow(file) {
  return execSync(`git show ${tip}:${file}`, {
    maxBuffer: 80 * 1024 * 1024,
    encoding: 'utf8',
  });
}

// line-guides.json splice
const currentGuides = JSON.parse(
  fs.readFileSync(path.join(root, 'constants/line-guides.json'), 'utf8'),
);
const tipGuides = JSON.parse(gitShow('constants/line-guides.json'));
for (const album of ['diary_interior_brown', 'diary_interior_purple']) {
  currentGuides[album] = tipGuides[album];
  console.log('merged line-guides.json', album);
}
fs.writeFileSync(
  path.join(root, 'constants/line-guides.json'),
  JSON.stringify(currentGuides, null, 2) + '\n',
);

// line-guides.ts — if it's generated similarly
const guidesTsPath = path.join(root, 'constants/line-guides.ts');
const guidesTs = fs.readFileSync(guidesTsPath, 'utf8');
if (guidesTs.includes('Auto-generated') || guidesTs.includes('LINE_GUIDES')) {
  // Prefer rewriting from tip's diary sections by regenerating from JSON if structure matches
  const tipTs = gitShow('constants/line-guides.ts');
  // Safer: take tip file only for diary is hard in TS; rewrite whole from JSON if export style known
  const m = guidesTs.match(/^([\s\S]*?export const LINE_GUIDES\s*=\s*)/);
  if (m) {
    fs.writeFileSync(guidesTsPath, m[1] + JSON.stringify(currentGuides, null, 2) + ' as const;\n');
    console.log('rewrote line-guides.ts from merged JSON');
  } else {
    console.log('line-guides.ts unexpected format, skipped auto rewrite');
  }
}

console.log('done guides');
