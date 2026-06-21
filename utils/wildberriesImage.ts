import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@wb_image_url_cache_v1';
const MAX_BASKETS = 12;

type CacheMap = Record<string, string>;

function parseJsonSafely(raw: string | null): CacheMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: CacheMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof k === 'string' && typeof v === 'string' && v.length > 0) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function extractWbNmId(link: string | null | undefined): string | null {
  if (!link) return null;
  // Пример: https://www.wildberries.ru/catalog/66837050/detail.aspx
  const m = String(link).match(/\/catalog\/(\d+)\//i);
  return m?.[1] ?? null;
}

function buildWbImagePath(nmId: string): string {
  const nm = Number(nmId);
  if (!Number.isFinite(nm) || nm <= 0) return '';
  const vol = Math.floor(nm / 100000);
  const part = Math.floor(nm / 1000);
  return `/vol${vol}/part${part}/${nm}/images/big/1.webp`;
}

function buildCandidateUrls(nmId: string): string[] {
  const path = buildWbImagePath(nmId);
  if (!path) return [];
  const urls: string[] = [];
  for (let i = 1; i <= MAX_BASKETS; i += 1) {
    urls.push(`https://basket-${String(i).padStart(2, '0')}.wb.ru${path}`);
  }
  return urls;
}

async function headOk(url: string, timeoutMs: number): Promise<boolean> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      // Иногда HEAD не поддержан — попробуем GET с Range, если сервер вернёт 206/200.
    } as any);
    if (res.ok) return true;
  } catch {
    // ignore
  } finally {
    clearTimeout(t);
  }

  const controller2 = new AbortController();
  const t2 = setTimeout(() => controller2.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-0' },
      signal: controller2.signal,
    } as any);
    return res.status === 206 || res.status === 200;
  } catch {
    return false;
  } finally {
    clearTimeout(t2);
  }
}

export async function resolveWildberriesImageUrl(
  nmIdOrLink: string,
  options?: { timeoutMs?: number }
): Promise<string | null> {
  const timeoutMs = Math.max(350, options?.timeoutMs ?? 900);
  const nmId = /^\d+$/.test(nmIdOrLink) ? nmIdOrLink : extractWbNmId(nmIdOrLink);
  if (!nmId) return null;

  // 1) local cache (AsyncStorage)
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    const map = parseJsonSafely(raw);
    const hit = map[nmId];
    if (hit) return hit;
  } catch {
    // ignore
  }

  // 2) probe baskets (ограничиваем параллельность)
  const candidates = buildCandidateUrls(nmId);
  if (candidates.length === 0) return null;

  const concurrency = 4;
  let idx = 0;
  let found: string | null = null;

  const worker = async () => {
    while (true) {
      const cur = idx;
      idx += 1;
      if (cur >= candidates.length || found) return;
      const url = candidates[cur];
      const ok = await headOk(url, timeoutMs);
      if (ok && !found) found = url;
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  if (found) {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      const map = parseJsonSafely(raw);
      map[nmId] = found;
      // Не даём кешу разрастаться бесконечно
      const keys = Object.keys(map);
      if (keys.length > 300) {
        for (const k of keys.slice(0, keys.length - 300)) delete map[k];
      }
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(map));
    } catch {
      // ignore
    }
  }

  return found;
}

