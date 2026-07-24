/** Cover IDs that use square 21×21 blank interior (product team extends this set). */
export const SQUARE_BLANK_COVER_IDS = new Set<string>([
  'family_sq_01',
  'family_sq_02',
  'family_sdfa1',
  'family_sdfa2',
  'family_sdfa3',
  'family_sdfa4',
  'family_sdfa5',
  'family_sdfa6',
  'family_sdfa7',
  'album_rozovyy',
  'album_pilot',
  'wedding_sa1',
  'wedding_sa2',
  'wedding_sa3',
  'wedding_sa4',
  'wedding_sa5',
]);

export function usesSquareBlankInterior(coverType?: string | null): boolean {
  if (!coverType) return false;
  if (SQUARE_BLANK_COVER_IDS.has(coverType)) return true;
  // Все семейные обложки SDFA* — квадратный блок 21×21.
  return coverType.startsWith('family_sdfa');
}
