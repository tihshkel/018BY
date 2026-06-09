import Constants from 'expo-constants';

function parseTruthy(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
  }
  return false;
}

/** Подсветка зон строк PDF (розовые рамки). Только при явном EXPO_PUBLIC_SHOW_LINE_SLOT_DEBUG=1 */
export function isLineSlotDebugEnabled(): boolean {
  if (parseTruthy(process.env.EXPO_PUBLIC_SHOW_LINE_SLOT_DEBUG)) return true;
  if (parseTruthy(Constants.expoConfig?.extra?.showLineSlotDebug)) return true;
  return false;
}
