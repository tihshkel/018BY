/**
 * Hybrid textLineSlots: tip diary refine logic + checkpoint kids/pregnancy paths.
 * Never applies kids/pregnancy uniform insets from tip.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const ROOT = path.join(__dirname, '..');
const TIP = '6858f3d';
const CK = 'HEAD'; // checkpoint/pre-diary-port

function gitShow(rev, file) {
  return execSync(`git show ${rev}:${file}`, { encoding: 'utf8', maxBuffer: 80e6 });
}

function extractFn(src, name) {
  const start = src.search(new RegExp('(?:export )?function ' + name + '\\('));
  if (start < 0) return null;
  const i = src.indexOf('{', start);
  let depth = 0;
  for (let p = i; p < src.length; p++) {
    if (src[p] === '{') depth++;
    else if (src[p] === '}') {
      depth--;
      if (depth === 0) return src.slice(start, p + 1);
    }
  }
  return null;
}

let tip = gitShow(TIP, 'utils/textLineSlots.ts');
const ck = gitShow(CK, 'utils/textLineSlots.ts');

// Drop pregnancy phone refine
tip = tip.replace(
  /\n\s*if \(lineGuideId === 'pregnancy_60' && page === 4\) \{\n\s*return refinePregnancy60RegistrationPhoneSlots\(filtered\);\n\s*\}\n/,
  '\n',
);
tip = tip.replace(/\nfunction refinePregnancy60RegistrationPhoneSlots\([\s\S]*?\n\}\n/, '\n');

// Fix imports: diary only extras, no kids/pregnancy uniform
tip = tip.replace(
  /import \{[\s\S]*?\} from '@\/constants\/album-text-margins';/,
  `import {
  getAlbumTextMargins,
  getKids48BottomDateLineStrokeY,
  getKidsMonthAnswerLineLayout,
  getKidsMonthAnswerStrokeY,
  getKidsMonthAnswerWritableBounds,
  getTemplateTypographyProfile,
  isBlankLineGuideAlbum,
  isKids48BottomDateLineSlot,
  isKidsMonthPage,
  KIDS48_P8_DATE_LINE,
  KIDS48_P13_CRAWLS_LINE,
  KIDS48_P16_DREAMS_DATE_LINE,
  KIDS48_P10_FIRST_BRUSHING_LINE,
  KIDS48_TEETH_TOOTH_DATE_SLOT_WIDTH,
  KIDS_MONTH_LINE_BAND_HEIGHT,
  DIARY_UNIFORM_LINE_X_INSET,
  BROWN_MY_DAY_DATE_UNDER_TITLE,
  PURPLE_MY_DAY_DATE_AFTER_TODAY,
  isPurpleMyDayPage,
  isBrownMyDayPage,
} from '@/constants/album-text-margins';`,
);

// Remove applyKids48 / applyPregnancy helpers
tip = tip.replace(
  /\nfunction applyKids48UniformLineInset\(norm: NormalizedLineSlot\): NormalizedLineSlot \{\n[\s\S]*?\n\}\n\nfunction applyPregnancyUniformLineInset\(norm: NormalizedLineSlot\): NormalizedLineSlot \{\n[\s\S]*?\n\}\n\n/,
  '\n',
);

// Hybrid refineNormalizedSlotForTextLayout: ck kids header + tip diary body
const ckHeader = ck.match(
  /function refineNormalizedSlotForTextLayout\([\s\S]*?\n  if \(!lineGuideId\?\.startsWith\('diary_interior_'\)\) \{\n    return norm;\n  \}/,
);
if (!ckHeader) throw new Error('ck refine header missing');

const tipDiaryBody = tip.match(
  /if \(!lineGuideId\?\.startsWith\('diary_interior_'\)\) \{\n    return norm;\n  \}([\s\S]*?return applyDiaryUniformLineInset\(refined\);\n\})/,
);
if (!tipDiaryBody) throw new Error('tip diary refine body missing');

const hybrid = ckHeader[0] + tipDiaryBody[1];
tip = tip.replace(
  /function refineNormalizedSlotForTextLayout\([\s\S]*?return applyDiaryUniformLineInset\(refined\);\n\}/,
  hybrid,
);

// Scrub any leftover uniform refs
if (/applyKids48UniformLineInset|applyPregnancyUniformLineInset|KIDS48_UNIFORM_LINE_X_INSET|PREGNANCY_UNIFORM_LINE_X_INSET|refinePregnancy60RegistrationPhoneSlots/.test(tip)) {
  tip = tip
    .replace(/return applyKids48UniformLineInset\(\s*([\s\S]*?)\s*\);/g, 'return $1;')
    .replace(/return applyPregnancyUniformLineInset\(\s*([\s\S]*?)\s*\);/g, 'return $1;');
}

const bad = tip.match(
  /applyKids48UniformLineInset|applyPregnancyUniformLineInset|KIDS48_UNIFORM_LINE_X_INSET|PREGNANCY_UNIFORM_LINE_X_INSET|refinePregnancy60RegistrationPhoneSlots/g,
);
if (bad) throw new Error('still has protected refs: ' + [...new Set(bad)].join(', '));

parser.parse(tip, { sourceType: 'module', plugins: ['typescript'] });
fs.writeFileSync(path.join(ROOT, 'utils/textLineSlots.ts'), tip);
console.log('OK textLineSlots hybrid', tip.length);
