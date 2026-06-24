/** Cover IDs that use square 21×21 blank interior (product team extends this set). */
export const SQUARE_BLANK_COVER_IDS = new Set<string>([
  'family_sq_01',
  'family_sq_02',
  'wedding_sa1',
  'wedding_sa2',
  'wedding_sa3',
  'wedding_sa4',
  'wedding_sa5',
]);

export function usesSquareBlankInterior(coverType?: string | null): boolean {
  if (!coverType) return false;
  return SQUARE_BLANK_COVER_IDS.has(coverType);
}
