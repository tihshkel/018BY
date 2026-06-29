const ALBUM_DATE_PATTERN = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;

export function formatAlbumDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${day}.${month}.${date.getFullYear()}`;
}

export function parseAlbumDate(value: string | undefined | null): Date | null {
  if (!value?.trim()) return null;

  const match = value.trim().match(ALBUM_DATE_PATTERN);
  if (match) {
    const parsed = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const fallback = new Date(value);
  if (!Number.isNaN(fallback.getTime())) return fallback;

  return null;
}

/** iOS UIDatePicker crashes if value is outside minimumDate/maximumDate. */
export function clampDateToBounds(
  date: Date,
  minimumDate?: Date,
  maximumDate?: Date,
): Date {
  if (!Number.isFinite(date.getTime())) {
    const fallback = minimumDate ?? maximumDate ?? new Date();
    return new Date(fallback.getTime());
  }

  let time = date.getTime();
  if (minimumDate && Number.isFinite(minimumDate.getTime()) && time < minimumDate.getTime()) {
    time = minimumDate.getTime();
  }
  if (maximumDate && Number.isFinite(maximumDate.getTime()) && time > maximumDate.getTime()) {
    time = maximumDate.getTime();
  }

  return new Date(time);
}
