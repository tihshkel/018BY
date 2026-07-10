/**
 * PNG-калибровка inline-tail на недельных стр. (norm X 0–1 от ширины страницы).
 * p9: «начало» — сразу после «:», «конец» — правый край линии (планы — до блока «Вес»).
 */
export type PregnancyWeeklyInlineTailFieldCalib = {
  labelEndNormX: number;
  lineRightNormX: number;
  lineLeftNormX: number;
};

export const PREGNANCY_WEEKLY_P9_INLINE_TAIL = {
  /** continuationGroup 3 — «Планы на неделю» */
  plans: {
    labelEndNormX: 0.302,
    lineRightNormX: 0.572,
    lineLeftNormX: 0.06522,
  },
  /** continuationGroup 5 — «Мои ощущения…» */
  feelings: {
    labelEndNormX: 0.528,
    lineRightNormX: 0.935,
    lineLeftNormX: 0.06522,
  },
} as const satisfies Record<string, PregnancyWeeklyInlineTailFieldCalib>;

export function getPregnancyWeeklyInlineTailFieldCalib(
  lineGuideId: string | undefined,
  page: number,
  continuationGroup: number | undefined,
): PregnancyWeeklyInlineTailFieldCalib | null {
  if (lineGuideId !== 'pregnancy_60' || page !== 9) return null;
  if (continuationGroup === 3) return PREGNANCY_WEEKLY_P9_INLINE_TAIL.plans;
  if (continuationGroup === 5) return PREGNANCY_WEEKLY_P9_INLINE_TAIL.feelings;
  return null;
}
