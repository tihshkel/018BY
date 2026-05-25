import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Экспорт пар ключей из AsyncStorage по префиксам (синхронизация).
 */
export async function exportAccountData(params: { allowPrefixes: string[] }) {
  const keys = await AsyncStorage.getAllKeys();
  const allowed = keys.filter((k) => params.allowPrefixes.some((p) => k === p || k.startsWith(p)));
  if (allowed.length === 0) return {};
  const pairs = await AsyncStorage.multiGet(allowed);
  const data: Record<string, string> = {};
  for (const [k, v] of pairs) {
    if (!k) continue;
    if (typeof v !== 'string') continue;
    data[k] = v;
  }
  return data;
}
