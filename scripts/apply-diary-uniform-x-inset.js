/**
 * Единый левый отступ 0.008 (≈1 пробел) для введённого текста
 * в альбомах «Мои истории: дневники» (diary_interior_brown / diary_interior_purple).
 *
 * Сам отступ применяется в рантайме: utils/textLineSlots.ts → applyDiaryUniformLineInset
 * (константа DIARY_UNIFORM_LINE_X_INSET = 0.008). Скрипт проверяет, что константа
 * и вызов на месте, и печатает сводку по слотам JSON.
 *
 * Запуск:
 *   node scripts/apply-diary-uniform-x-inset.js
 *   npm run fix:diary-x-inset
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const INSET = 0.008;
const ALBUMS = ['diary_interior_brown', 'diary_interior_purple'];

function readUtf8(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function main() {
  const margins = readUtf8('constants/album-text-margins.ts');
  const slotsTs = readUtf8('utils/textLineSlots.ts');

  const hasConst =
    /export const DIARY_UNIFORM_LINE_X_INSET\s*=\s*KIDS48_UNIFORM_LINE_X_INSET/.test(margins) ||
    /DIARY_UNIFORM_LINE_X_INSET\s*=\s*0\.008/.test(margins);
  const hasKidsInset = /KIDS_MONTH_LINE_X_INSET\s*=\s*0\.008/.test(margins);
  const appliesInset = /applyDiaryUniformLineInset\(refined\)/.test(slotsTs);
  const wireComplete =
    /return applyDiaryUniformLineInset\(refined\);/.test(slotsTs) &&
    !/Wish-голова p6\/p7: 0\.008 уже заложен/.test(slotsTs);

  console.log('DIARY_UNIFORM_LINE_X_INSET = 0.008:', hasConst && hasKidsInset ? 'OK' : 'MISSING');
  console.log('applyDiaryUniformLineInset wired:', appliesInset ? 'OK' : 'MISSING');
  console.log('no early-skip for wish head:', wireComplete ? 'OK' : 'CHECK');

  const lineSlots = JSON.parse(readUtf8('constants/line-slots.json'));
  let pages = 0;
  let slots = 0;
  let lineLike = 0;

  for (const albumId of ALBUMS) {
    const byPage = lineSlots[albumId] ?? {};
    for (const [page, list] of Object.entries(byPage)) {
      pages += 1;
      for (const slot of list) {
        slots += 1;
        const h = slot.height ?? 0.028;
        const isCompactBlock = slot.inputKind === 'block' && h <= 0.04;
        if (slot.inputKind === 'line' || isCompactBlock || slot.inputKind == null) {
          lineLike += 1;
        }
      }
      if (page === '7' || page === '11' || page === '28') {
        const sample = list.slice(0, 3).map((s) => ({
          y: s.y,
          x: s.x,
          w: s.width,
          kind: s.inputKind,
          afterInsetX: +(s.x + INSET).toFixed(4),
        }));
        console.log(`sample ${albumId} p${page}:`, JSON.stringify(sample));
      }
    }
  }

  console.log(
    `\nAlbums: ${ALBUMS.join(', ')}\nPages: ${pages}\nSlots: ${slots}\nLine-like (inset at draw): ${lineLike}`,
  );
  console.log(
    `\nГотово: при отрисовке ко всем line/compact-block слотам дневников\nдобавляется x += ${INSET} (один пробел слева от введённого текста).`,
  );

  if (!(hasConst && hasKidsInset && appliesInset)) {
    process.exitCode = 1;
    console.error('\nОшибка: отступ не полностью подключён — см. флаги выше.');
  }
}

main();
