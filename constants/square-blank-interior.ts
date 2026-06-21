/** Cover IDs that use square 21×21 blank interior (product team extends this set). */
export const SQUARE_BLANK_COVER_IDS = new Set<string>([
  'family_sq_01',
  'family_sq_02',
]);

export function usesSquareBlankInterior(coverType?: string | null): boolean {
  if (!coverType) return false;
  return SQUARE_BLANK_COVER_IDS.has(coverType);
}
