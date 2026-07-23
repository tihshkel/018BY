/**
 * Exact wrap/char-limit parity using the same width*charWidthRatio model as templateLineText.
 * Compares WORKTREE vs e24a739 for every slot in target albums.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const IOS_REF = 'e24a739d1ae04ca590c52e5da4af0c7edcbf8ef0';

const ALBUMS = [
  'pregnancy_60',
  'pregnancy_a5',
  'kids_48',
  'holidays_birthday_60',
  'diary_interior_brown',
  'diary_interior_purple',
];

function sh(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8', maxBuffer: 120 * 1024 * 1024 });
}

function extractProfiles(ts) {
  const profiles = {};
  // Match PROFILE-like entries in album-text-margins
  const blockRe =
    /([a-z0-9_]+)\s*:\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
  let m;
  while ((m = blockRe.exec(ts))) {
    const id = m[1];
    if (!ALBUMS.includes(id) && id !== 'default') continue;
    const body = m[2];
    const charWidth = body.match(/charWidthRatio\s*:\s*([0-9.]+)/);
    const fixed = body.match(/fixedLineFontSize\s*:\s*([0-9.]+)/);
    const x = body.match(/\bx\s*:\s*([0-9.]+)/);
    const width = body.match(/\bwidth\s*:\s*([0-9.]+)/);
    profiles[id] = {
      charWidthRatio: charWidth ? Number(charWidth[1]) : undefined,
      fixedLineFontSize: fixed ? Number(fixed[1]) : undefined,
      x: x ? Number(x[1]) : undefined,
      width: width ? Number(width[1]) : undefined,
    };
  }
  return profiles;
}

function maxChars(slotWidthNorm, fontSize, charWidthRatio, pageWidthPx = 1796) {
  const px = slotWidthNorm * pageWidthPx;
  const charW = Math.max(0.01, fontSize * charWidthRatio);
  // SPACE_WIDTH_FACTOR not needed for capacity of equal-width chars
  return Math.floor(px / charW);
}

function main() {
  const curSlots = JSON.parse(fs.readFileSync(path.join(ROOT, 'constants/line-slots.json'), 'utf8'));
  const iosSlots = JSON.parse(sh(`git show ${IOS_REF}:constants/line-slots.json`));
  const curMargins = fs.readFileSync(path.join(ROOT, 'constants/album-text-margins.ts'), 'utf8');
  const iosMargins = sh(`git show ${IOS_REF}:constants/album-text-margins.ts`);
  const curProf = extractProfiles(curMargins);
  const iosProf = extractProfiles(iosMargins);

  // Also compare albumFieldLimits source identity
  const limitsCur = fs.readFileSync(path.join(ROOT, 'utils/albumFieldLimits.ts'), 'utf8');
  const limitsIos = sh(`git show ${IOS_REF}:utils/albumFieldLimits.ts`);
  const limitsEqual = limitsCur.replace(/\r\n/g, '\n') === limitsIos.replace(/\r\n/g, '\n');

  const out = { limitsEqual, albums: {} };
  let allOk = limitsEqual;

  for (const album of ALBUMS) {
    const a = curSlots[album] || {};
    const b = iosSlots[album] || {};
    const pa = curProf[album] || {};
    const pb = iosProf[album] || {};
    const pages = new Set([...Object.keys(a), ...Object.keys(b)]);
    let checked = 0;
    let matched = 0;
    const samples = [];
    for (const page of pages) {
      const ca = a[page] || [];
      const cb = b[page] || [];
      const n = Math.max(ca.length, cb.length);
      for (let i = 0; i < n; i++) {
        const sa = ca[i];
        const sb = cb[i];
        if (!sa || !sb || typeof sa === 'number' || typeof sb === 'number') continue;
        const wa = sa.width ?? pa.width ?? 0.7;
        const wb = sb.width ?? pb.width ?? 0.7;
        const fa = pa.fixedLineFontSize ?? 16;
        const fb = pb.fixedLineFontSize ?? 16;
        const ra = pa.charWidthRatio ?? 0.55;
        const rb = pb.charWidthRatio ?? 0.55;
        const caN = maxChars(wa, fa, ra);
        const cbN = maxChars(wb, fb, rb);
        checked += 1;
        if (caN === cbN && wa === wb && fa === fb && ra === rb) matched += 1;
        else if (samples.length < 12) {
          samples.push({ page, index: i, android: { wa, fa, ra, chars: caN }, ios: { wb, fb, rb, chars: cbN } });
        }
      }
    }
    const ok = checked === matched && JSON.stringify(pa) === JSON.stringify(pb);
    allOk = allOk && ok;
    out.albums[album] = {
      ok,
      checked,
      matched,
      profileAndroid: pa,
      profileIos: pb,
      samples,
    };
  }

  out.overallPass = allOk;
  const reportPath = path.join(ROOT, 'scripts', 'audit-char-capacity-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(out, null, 2));
  console.log('albumFieldLimits identical:', limitsEqual);
  for (const album of ALBUMS) {
    const r = out.albums[album];
    console.log(
      album,
      r.ok ? 'OK' : 'DIFF',
      `${r.matched}/${r.checked}`,
      'profileEqual=',
      JSON.stringify(r.profileAndroid) === JSON.stringify(r.profileIos),
    );
  }
  console.log('overall:', allOk ? 'PASS' : 'FAIL');
  console.log('wrote', reportPath);
}

main();
