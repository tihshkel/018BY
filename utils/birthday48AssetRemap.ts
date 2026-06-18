/**
 * Maps logical TZ pages (1–48) to PNG indices in the legacy 60-page asset folder.
 * Until a dedicated 48-page asset pack exists, most pages use the same index;
 * page 48 (letter) uses the legacy page 60 background.
 */

export const BIRTHDAY_48_PAGE_COUNT = 48;

const BIRTHDAY_48_ASSET_OVERRIDES: Readonly<Record<number, number>> = {
  48: 60,
};

/** Logical page number (1–48) → asset file page index in «Блок ДНЕЙ РОЖДЕНИЯ 60 стр». */
export function getBirthday48AssetPageNumber(logicalPage: number): number {
  if (logicalPage < 1 || logicalPage > BIRTHDAY_48_PAGE_COUNT) {
    return Math.max(1, logicalPage);
  }
  return BIRTHDAY_48_ASSET_OVERRIDES[logicalPage] ?? logicalPage;
}

export function isBirthday48Album(albumId: string | null | undefined): boolean {
  return albumId === 'holidays_birthday_60';
}
