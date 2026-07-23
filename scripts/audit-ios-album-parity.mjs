/**
 * Deep audit: working tree album layout vs iOS commit e24a739.
 * Checks slots/guides, photo templates, char limits, captions, key source files.
 *
 * Usage: node scripts/audit-ios-album-parity.mjs
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const IOS_REF = 'e24a739d1ae04ca590c52e5da4af0c7edcbf8ef0';

const ALBUM_KEYS = [
  'pregnancy_60',
  'pregnancy_a5',
  'kids_48',
  'holidays_birthday_60',
  'diary_interior_brown',
  'diary_interior_purple',
];

const ALBUM_LABELS = {
  pregnancy_60: 'Ожидание чуда 60',
  pregnancy_a5: 'Ожидание чуда 48 (A5)',
  kids_48: 'Первые годы малыша',
  holidays_birthday_60: 'Праздники и события',
  diary_interior_brown: 'Мои истории / дневник коричневый',
  diary_interior_purple: 'Мои истории / дневник фиолетовый',
};

const CRITICAL_FILES = [
  'constants/line-slots.json',
  'constants/line-guides.json',
  'constants/line-slots-overrides.json',
  'constants/photo-pages-by-album.json',
  'constants/photo-layout-templates.ts',
  'constants/photo-block-presets.ts',
  'constants/photo-print-margins.ts',
  'constants/photo-page-template-manifest.json',
  'constants/sparse-photo-album-config.ts',
  'constants/album-text-margins.ts',
  'constants/album-fonts.ts',
  'constants/album-page-schema-overrides.json',
  'constants/kids-48-event-date-slots.ts',
  'constants/kids-48-teeth-slots.ts',
  'utils/templateLineText.ts',
  'utils/textLineSlots.ts',
  'utils/templateTextLayout.ts',
  'utils/templateTextMeasure.ts',
  'utils/templateTextAnnotations.ts',
  'utils/exportTemplateText.ts',
  'utils/photoCaptionLayout.ts',
  'utils/photoBlockLayout.ts',
  'utils/photoBlockSafeZone.ts',
  'utils/photoSlots.ts',
  'utils/photoSlotTransform.ts',
  'utils/photoZoneLayout.ts',
  'utils/designedAlbumPerPhotoCaptions.ts',
  'utils/albumFieldLimits.ts',
  'utils/pageValuesAdapter.ts',
  'utils/schemaPhotoBlocks.ts',
  'utils/resolvePhotoPageLayouts.ts',
  'components/pdf-annotations.tsx',
  'components/read-only-page-annotations.tsx',
  'components/template-line-editor.tsx',
  'components/album/page-form-fields.tsx',
  'components/album/album-page-unified-editor.tsx',
  'components/album/album-page-fill-form.tsx',
  'components/album/album-page-form-editor.tsx',
  'components/album/photo-slot-gesture-layer.tsx',
  'components/album/album-preview-photo-block-editor.tsx',
  'hooks/use-album-page-photo-editor.ts',
];

const MUST_KEEP_ANDROID = [
  'utils/crossDeviceMedia.ts',
  'albums/diary/interiors/brown',
  'albums/diary/interiors/purple',
];

function sh(cmd) {
  return execSync(cmd, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 120 * 1024 * 1024,
  });
}

function gitShow(ref, file) {
  try {
    return sh(`git show ${ref}:${file.replace(/\\/g, '/')}`);
  } catch {
    return null;
  }
}

function readWork(file) {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8');
}

function norm(s) {
  return (s ?? '').replace(/\r\n/g, '\n');
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function slotFingerprint(slot) {
  if (slot == null) return null;
  if (typeof slot === 'number') return { y: slot };
  const keys = [
    'x',
    'y',
    'width',
    'height',
    'hasLabel',
    'continuationGroup',
    'inputKind',
    'textAnchorTop',
    'lineStrokeAtBottom',
    'teethDate',
    'strokeAtNormY',
    'inlineLabelTail',
  ];
  const out = {};
  for (const k of keys) {
    if (slot[k] !== undefined) out[k] = slot[k];
  }
  return out;
}

function compareAlbumSlots(name, curAlbum, iosAlbum) {
  const pages = new Set([
    ...Object.keys(curAlbum || {}),
    ...Object.keys(iosAlbum || {}),
  ]);
  const mismatches = [];
  let matchedPages = 0;
  let matchedSlots = 0;
  let totalSlots = 0;

  for (const page of [...pages].sort((a, b) => Number(a) - Number(b))) {
    const cur = curAlbum?.[page] ?? null;
    const ios = iosAlbum?.[page] ?? null;
    if (deepEqual(cur, ios)) {
      matchedPages += 1;
      const n = Array.isArray(cur) ? cur.length : 0;
      matchedSlots += n;
      totalSlots += n;
      continue;
    }
    const curArr = Array.isArray(cur) ? cur : [];
    const iosArr = Array.isArray(ios) ? ios : [];
    const max = Math.max(curArr.length, iosArr.length);
    totalSlots += max;
    const pageDiffs = [];
    for (let i = 0; i < max; i++) {
      const a = slotFingerprint(curArr[i]);
      const b = slotFingerprint(iosArr[i]);
      if (!deepEqual(a, b)) {
        pageDiffs.push({ index: i, android: a, ios: b });
      } else {
        matchedSlots += 1;
      }
    }
    mismatches.push({
      page,
      androidCount: curArr.length,
      iosCount: iosArr.length,
      diffs: pageDiffs.slice(0, 8),
      diffCount: pageDiffs.length,
    });
  }

  return {
    name,
    label: ALBUM_LABELS[name] || name,
    pagesTotal: pages.size,
    pagesMatched: matchedPages,
    pagesMismatched: mismatches.length,
    slotsMatched: matchedSlots,
    slotsTotal: totalSlots,
    mismatches,
    ok: mismatches.length === 0,
  };
}

function estimateCharsForSlot(slot, charWidthRatio = 0.55, fontSize = 16) {
  // Approximate max chars in one line from normalized width (same formula family as template wrap).
  const width = typeof slot === 'number' ? 0.7 : Number(slot?.width ?? slot?.normWidth ?? 0.7);
  if (!Number.isFinite(width) || width <= 0) return null;
  // Assume design page ~1796px wide for portrait albums; char ~ fontSize * ratio.
  const pageW = 1796;
  const px = width * pageW;
  const charW = Math.max(1, fontSize * charWidthRatio);
  return Math.max(1, Math.floor(px / charW));
}

function compareCharCapacity(name, curAlbum, iosAlbum, marginsCur, marginsIos) {
  const pages = new Set([
    ...Object.keys(curAlbum || {}),
    ...Object.keys(iosAlbum || {}),
  ]);
  const diffs = [];
  let checked = 0;
  let matched = 0;

  const profileCur = marginsCur?.[name] ?? marginsCur?.default ?? {};
  const profileIos = marginsIos?.[name] ?? marginsIos?.default ?? {};
  const ratioCur = profileCur.charWidthRatio ?? 0.55;
  const ratioIos = profileIos.charWidthRatio ?? 0.55;
  const fontCur = profileCur.fixedLineFontSize ?? 16;
  const fontIos = profileIos.fixedLineFontSize ?? 16;

  for (const page of pages) {
    const curArr = Array.isArray(curAlbum?.[page]) ? curAlbum[page] : [];
    const iosArr = Array.isArray(iosAlbum?.[page]) ? iosAlbum[page] : [];
    const max = Math.max(curArr.length, iosArr.length);
    for (let i = 0; i < max; i++) {
      const c = estimateCharsForSlot(curArr[i], ratioCur, fontCur);
      const s = estimateCharsForSlot(iosArr[i], ratioIos, fontIos);
      if (c == null || s == null) continue;
      checked += 1;
      if (c === s) matched += 1;
      else if (diffs.length < 20) {
        diffs.push({ page, index: i, androidChars: c, iosChars: s, delta: c - s });
      }
    }
  }

  return {
    name,
    label: ALBUM_LABELS[name] || name,
    checked,
    matched,
    mismatched: checked - matched,
    sampleDiffs: diffs,
    typography: {
      android: { charWidthRatio: ratioCur, fixedLineFontSize: fontCur },
      ios: { charWidthRatio: ratioIos, fixedLineFontSize: fontIos },
      typographyEqual: deepEqual(
        { charWidthRatio: ratioCur, fixedLineFontSize: fontCur },
        { charWidthRatio: ratioIos, fixedLineFontSize: fontIos },
      ),
    },
    ok: checked === matched && ratioCur === ratioIos && fontCur === fontIos,
  };
}

function parseTsExportObjectish(source, exportName) {
  // Best-effort: for JSON-like consts we already handle via JSON files.
  return source;
}

function extractTypographyProfiles(tsSource) {
  // album-text-margins.ts holds getTemplateTypographyProfile data; compare whole file hash +
  // extract TYPOGRAPHY / PROFILE blocks if present.
  const profiles = {};
  const re =
    /(pregnancy_60|pregnancy_a5|kids_48|holidays_birthday_60|diary_interior_brown|diary_interior_purple)\s*:\s*\{([^}]{0,800})\}/g;
  let m;
  while ((m = re.exec(tsSource))) {
    const body = m[2];
    const charWidth = body.match(/charWidthRatio\s*:\s*([0-9.]+)/);
    const fixed = body.match(/fixedLineFontSize\s*:\s*([0-9.]+)/);
    profiles[m[1]] = {
      charWidthRatio: charWidth ? Number(charWidth[1]) : undefined,
      fixedLineFontSize: fixed ? Number(fixed[1]) : undefined,
    };
  }
  return profiles;
}

function fileDiffStat(file) {
  const cur = readWork(file);
  const ios = gitShow(IOS_REF, file);
  if (cur == null && ios == null) return { file, status: 'MISSING_BOTH' };
  if (cur == null) return { file, status: 'MISSING_ANDROID' };
  if (ios == null) return { file, status: 'MISSING_IOS_OR_ANDROID_ONLY' };
  const same = norm(cur) === norm(ios);
  if (same) return { file, status: 'IDENTICAL' };
  // Ignore only our intentional additive Android-only bits when comparing photo-slots optional field
  if (file === 'constants/photo-slots.ts') {
    const strip = (s) =>
      norm(s).replace(/\s*\/\*\* Index in variant\.slots[\s\S]*?\*\/\s*slotIndex\?: number;\n/, '');
    if (strip(cur) === strip(ios)) return { file, status: 'IDENTICAL_COMPAT' };
  }
  let curLines = norm(cur).split('\n').length;
  let iosLines = norm(ios).split('\n').length;
  return {
    file,
    status: 'DIFF',
    androidLines: curLines,
    iosLines: iosLines,
    lineDelta: curLines - iosLines,
  };
}

function checkTextResizeApis(curEditor, iosEditor, curFields, iosFields) {
  const checks = [];
  const need = [
    'fieldTextStyles',
    'onFieldStyleChange',
    'fontSize',
    'FieldTextStyle',
  ];
  for (const token of need) {
    checks.push({
      token,
      androidEditor: (curEditor || '').includes(token),
      iosEditor: (iosEditor || '').includes(token),
      androidFields: (curFields || '').includes(token),
      iosFields: (iosFields || '').includes(token),
    });
  }
  const ok = checks.every(
    (c) =>
      c.androidEditor === c.iosEditor &&
      c.androidFields === c.iosFields &&
      (c.token !== 'fieldTextStyles' || c.androidEditor),
  );
  return { ok, checks };
}

function checkCaptionApis(files) {
  const tokens = [
    'photoCaptionLayout',
    'resolvePhotoCaptionViewportLayouts',
    'usesDesignedAlbumPerPhotoCaptions',
    'photoCaptions',
    'captionTextStyle',
    'fillCornerRadiusRatio',
  ];
  const out = [];
  for (const token of tokens) {
    const present = files.filter((f) => (readWork(f) || '').includes(token));
    const iosPresent = files.filter((f) => (gitShow(IOS_REF, f) || '').includes(token));
    out.push({
      token,
      androidFiles: present.length,
      iosFiles: iosPresent.length,
      ok: present.length > 0 && iosPresent.length > 0,
    });
  }
  return out;
}

function listDiaryInteriorFiles(dirRel) {
  const abs = path.join(ROOT, dirRel);
  if (!fs.existsSync(abs)) return { exists: false, count: 0, sample: [] };
  const walk = (d, acc = []) => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p, acc);
      else acc.push(path.relative(ROOT, p).replace(/\\/g, '/'));
    }
    return acc;
  };
  const files = walk(abs);
  return {
    exists: true,
    count: files.length,
    sample: files.slice(0, 8),
    hasNonAsciiPath: files.some((f) => /[^\x00-\x7F]/.test(f)),
  };
}

function main() {
  const report = {
    ref: IOS_REF,
    generatedAt: new Date().toISOString(),
    albums: {},
    charCapacity: {},
    criticalFiles: [],
    textResize: null,
    captions: null,
    diaryInteriors: {},
    mustKeepAndroid: {},
    summary: {},
  };

  const curSlots = JSON.parse(readWork('constants/line-slots.json'));
  const iosSlots = JSON.parse(gitShow(IOS_REF, 'constants/line-slots.json'));
  const curGuides = JSON.parse(readWork('constants/line-guides.json'));
  const iosGuides = JSON.parse(gitShow(IOS_REF, 'constants/line-guides.json'));
  const curPhotoPages = JSON.parse(readWork('constants/photo-pages-by-album.json'));
  const iosPhotoPages = JSON.parse(gitShow(IOS_REF, 'constants/photo-pages-by-album.json'));

  const marginsCurSrc = readWork('constants/album-text-margins.ts') || '';
  const marginsIosSrc = gitShow(IOS_REF, 'constants/album-text-margins.ts') || '';
  const profilesCur = extractTypographyProfiles(marginsCurSrc);
  const profilesIos = extractTypographyProfiles(marginsIosSrc);

  for (const key of ALBUM_KEYS) {
    report.albums[key] = {
      slots: compareAlbumSlots(key, curSlots[key], iosSlots[key]),
      guides: compareAlbumSlots(key, curGuides[key], iosGuides[key]),
      photoPagesEqual: deepEqual(curPhotoPages[key], iosPhotoPages[key]),
    };
    report.charCapacity[key] = compareCharCapacity(
      key,
      curSlots[key],
      iosSlots[key],
      profilesCur,
      profilesIos,
    );
  }

  // family/wedding blank guides may live under other keys
  const blankKeys = Object.keys(curSlots)
    .filter((k) => /family|wedding|blank|holidays_blank/i.test(k))
    .sort();
  report.extraSlotKeys = {
    android: Object.keys(curSlots).sort(),
    ios: Object.keys(iosSlots).sort(),
    blankish: blankKeys,
  };

  for (const file of CRITICAL_FILES) {
    report.criticalFiles.push(fileDiffStat(file));
  }

  report.textResize = checkTextResizeApis(
    readWork('components/album/album-page-form-editor.tsx'),
    gitShow(IOS_REF, 'components/album/album-page-form-editor.tsx'),
    readWork('components/album/page-form-fields.tsx'),
    gitShow(IOS_REF, 'components/album/page-form-fields.tsx'),
  );

  report.captions = checkCaptionApis([
    'utils/photoCaptionLayout.ts',
    'utils/designedAlbumPerPhotoCaptions.ts',
    'utils/pageValuesAdapter.ts',
    'utils/templateTextAnnotations.ts',
    'components/pdf-annotations.tsx',
    'components/read-only-page-annotations.tsx',
    'hooks/use-album-page-photo-editor.ts',
  ]);

  report.diaryInteriors = {
    brown: listDiaryInteriorFiles('albums/diary/interiors/brown'),
    purple: listDiaryInteriorFiles('albums/diary/interiors/purple'),
    loaderMentionsAscii: (readWork('utils/diaryAlbumsLoader.ts') || '').includes(
      'interiors/brown',
    ),
  };

  for (const p of MUST_KEEP_ANDROID) {
    const abs = path.join(ROOT, p);
    report.mustKeepAndroid[p] = fs.existsSync(abs);
  }

  // Field limits / maxLength parity from albumFieldLimits + schema overrides
  const limitsCur = readWork('utils/albumFieldLimits.ts') || '';
  const limitsIos = gitShow(IOS_REF, 'utils/albumFieldLimits.ts') || '';
  report.fieldLimitsFile = fileDiffStat('utils/albumFieldLimits.ts');
  report.fieldLimitsHasResize = {
    android: /fontSize/.test(limitsCur) && /getFieldCharacterLimit|clampFieldInput/.test(limitsCur),
    ios: /fontSize/.test(limitsIos) && /getFieldCharacterLimit|clampFieldInput/.test(limitsIos),
  };

  const slotOk = ALBUM_KEYS.every((k) => report.albums[k].slots.ok);
  const guideOk = ALBUM_KEYS.every((k) => report.albums[k].guides.ok);
  const photoOk = ALBUM_KEYS.every((k) => report.albums[k].photoPagesEqual);
  const charOk = ALBUM_KEYS.every((k) => report.charCapacity[k].ok);
  const criticalDiffs = report.criticalFiles.filter((f) => f.status === 'DIFF');
  const criticalMissing = report.criticalFiles.filter((f) =>
    String(f.status).startsWith('MISSING'),
  );

  report.summary = {
    slotsIdentical: slotOk,
    guidesIdentical: guideOk,
    photoPagesIdentical: photoOk,
    charCapacityIdentical: charOk,
    textResizeParity: report.textResize.ok,
    captionApisPresent: report.captions.every((c) => c.ok),
    diaryInteriorsPresent:
      report.diaryInteriors.brown.exists &&
      report.diaryInteriors.purple.exists &&
      !report.diaryInteriors.brown.hasNonAsciiPath &&
      !report.diaryInteriors.purple.hasNonAsciiPath,
    criticalFileDiffs: criticalDiffs.length,
    criticalMissing: criticalMissing.length,
    overallPass:
      slotOk &&
      guideOk &&
      photoOk &&
      charOk &&
      report.textResize.ok &&
      report.captions.every((c) => c.ok) &&
      report.diaryInteriors.brown.exists &&
      report.diaryInteriors.purple.exists,
  };

  const outPath = path.join(ROOT, 'scripts', 'audit-ios-album-parity-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

  // Human summary to stdout
  console.log('=== iOS album parity audit vs', IOS_REF.slice(0, 7), '===');
  console.log('Overall:', report.summary.overallPass ? 'PASS' : 'NEEDS ATTENTION');
  console.log('');
  for (const key of ALBUM_KEYS) {
    const a = report.albums[key];
    const c = report.charCapacity[key];
    console.log(`• ${a.slots.label}`);
    console.log(
      `  slots: ${a.slots.ok ? 'OK' : 'DIFF'} (${a.slots.pagesMatched}/${a.slots.pagesTotal} pages, ${a.slots.slotsMatched}/${a.slots.slotsTotal} slots)`,
    );
    console.log(
      `  guides: ${a.guides.ok ? 'OK' : 'DIFF'} (${a.guides.pagesMatched}/${a.guides.pagesTotal} pages)`,
    );
    console.log(`  photo-pages: ${a.photoPagesEqual ? 'OK' : 'DIFF'}`);
    console.log(
      `  char capacity: ${c.ok ? 'OK' : 'DIFF'} (${c.matched}/${c.checked}, typographyEqual=${c.typography.typographyEqual})`,
    );
  }
  console.log('');
  console.log('Text resize (fieldTextStyles):', report.textResize.ok ? 'OK' : 'DIFF');
  console.log(
    'Caption APIs:',
    report.captions.every((c) => c.ok) ? 'OK' : 'DIFF',
    report.captions.map((c) => `${c.token}:${c.ok ? 'y' : 'n'}`).join(' '),
  );
  console.log(
    'Diary interiors brown/purple:',
    report.diaryInteriors.brown.count,
    '/',
    report.diaryInteriors.purple.count,
    'files; nonAscii=',
    report.diaryInteriors.brown.hasNonAsciiPath ||
      report.diaryInteriors.purple.hasNonAsciiPath,
  );
  console.log('Critical file diffs:', criticalDiffs.length);
  if (criticalDiffs.length) {
    for (const d of criticalDiffs.slice(0, 25)) {
      console.log(`  - ${d.file} (Δlines ${d.lineDelta})`);
    }
  }
  if (criticalMissing.length) {
    console.log('Critical missing:');
    for (const d of criticalMissing) console.log(`  - ${d.file}: ${d.status}`);
  }
  console.log('');
  console.log('Report JSON:', outPath);
}

main();
