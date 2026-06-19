/**
 * Maps logical TZ pages (1–48) to PNG indices in the legacy 60-page asset folder
 * «Блок ДНЕЙ РОЖДЕНИЯ 60 стр».
 *
 * The 48-page TZ omits legacy pages 4–5 («Чувства и эмоции мамы/папы»).
 * From logical page 4 onward, asset index = logical + 2.
 * Logical page 48 (letter) uses legacy page 60 (pages 58–59 are duplicate letter variants).
 */

export const BIRTHDAY_48_PAGE_COUNT = 48;

/** Legacy asset pages skipped in the 48-page TZ (mom/dad emotions intro). */
export const BIRTHDAY_48_LEGACY_SKIP_PAGES = [4, 5] as const;

/** Expected banner text on each legacy asset page (OCR from print PNGs). */
export const BIRTHDAY_48_LEGACY_ASSET_HEADINGS: Readonly<Record<number, string>> = {
  1: 'Этот альбом принадлежит',
  2: 'Привет, мир!',
  3: 'Цвет волос / Цвет глаз',
  6: 'Мне 1 годик',
  8: 'Мне 2 года',
  10: 'Мне 3 года',
  12: 'Мне 4 года',
  14: 'Мне 5 лет',
  16: 'Мне 6 лет',
  18: 'Мне 7 лет',
  20: 'Мне 8 лет',
  22: 'Мне 9 лет',
  24: 'Мне 10 лет',
  26: 'Мне 11 лет',
  28: 'Мне 12 лет',
  30: 'Мне 13 лет',
  32: 'Мне 14 лет',
  34: 'Мне 15 лет',
  36: 'Мне 16 лет',
  38: 'Мне 17 лет',
  40: 'Мне 18 лет',
  42: 'Мои путешествия',
  60: 'Письмо во взрослую жизнь',
};

/** Logical page number (1–48) → asset file page index in «Блок ДНЕЙ РОЖДЕНИЯ 60 стр». */
export function getBirthday48AssetPageNumber(logicalPage: number): number {
  if (logicalPage < 1 || logicalPage > BIRTHDAY_48_PAGE_COUNT) {
    return Math.max(1, logicalPage);
  }
  if (logicalPage <= 3) return logicalPage;
  if (logicalPage === 48) return 60;
  return logicalPage + 2;
}

export function isBirthday48Album(albumId: string | null | undefined): boolean {
  return albumId === 'holidays_birthday_60';
}
