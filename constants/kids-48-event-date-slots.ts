import {
  KIDS_48_EVENT_DATE_LINE_REF_PX,
  KIDS_MONTH_LINE_BAND_HEIGHT,
} from '@/constants/album-text-margins';

/** Ручная разметка на assets/debug/kids-48-date-lines/page_*_300dpi.png (2481×2481). */
const REF = KIDS_48_EVENT_DATE_LINE_REF_PX;

/** kids_48 p8 «Первый день дома» — штрих «ДАТА» (px: x=1031, y=2223). */
export const KIDS_48_P8_EVENT_DATE_STROKE_Y = 2223 / REF;

/** kids_48 p9 «Первое купание» — штрих «ДАТА» (px: x=1031, y=463). */
export const KIDS_48_P9_EVENT_DATE_STROKE_Y = 463 / REF;

/** Начало линии ввода (после подписи «ДАТА»), ширина до x=1612. */
const KIDS_48_EVENT_DATE_LINE_X = 1031 / REF;
const KIDS_48_EVENT_DATE_LINE_WIDTH = 582 / REF;

/**
 * kids_48 p8 — writable-полоса; y = верх band, штрих = y + height.
 */
export const KIDS_48_P8_EVENT_DATE_LINE = {
  x: KIDS_48_EVENT_DATE_LINE_X,
  y: KIDS_48_P8_EVENT_DATE_STROKE_Y - KIDS_MONTH_LINE_BAND_HEIGHT,
  width: KIDS_48_EVENT_DATE_LINE_WIDTH,
  height: KIDS_MONTH_LINE_BAND_HEIGHT,
} as const;

/** kids_48 p9 — writable-полоса под заголовком. */
export const KIDS_48_P9_EVENT_DATE_LINE = {
  x: KIDS_48_EVENT_DATE_LINE_X,
  y: KIDS_48_P9_EVENT_DATE_STROKE_Y - KIDS_MONTH_LINE_BAND_HEIGHT,
  width: KIDS_48_EVENT_DATE_LINE_WIDTH,
  height: KIDS_MONTH_LINE_BAND_HEIGHT,
} as const;

export function getKids48EventDateLineNorm(
  page: number,
  slotIndex: number,
): { x: number; y: number; width: number; height: number } | null {
  if (page === 8 && slotIndex === 0) return KIDS_48_P8_EVENT_DATE_LINE;
  if (page === 9 && slotIndex === 0) return KIDS_48_P9_EVENT_DATE_LINE;
  return null;
}
