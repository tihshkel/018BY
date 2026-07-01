import AsyncStorage from '@react-native-async-storage/async-storage';

import { WB_NM_ID_TO_BASKET } from '@/utils/wildberriesProductImage';
import { extractWbNmId } from '@/utils/wildberriesImage';

const CACHE_KEY = '@wb_product_info_v1';
const MAX_BASKETS = 25;
const FETCH_TIMEOUT_MS = 1200;

export type WildberriesProductInfo = {
  nmId: string;
  title: string;
  description: string;
  imageUrl: string;
};

type CacheMap = Record<string, WildberriesProductInfo>;

type WbCardJson = {
  nm_id?: number;
  imt_name?: string;
  description?: string;
};

const memoryCache = new Map<string, WildberriesProductInfo>();
const inflight = new Map<string, Promise<WildberriesProductInfo | null>>();

/** Синхронное чтение из памяти — без лишнего setState при скролле. */
export function peekWildberriesProductInfo(
  link: string | null | undefined,
): WildberriesProductInfo | null {
  if (!link) return null;
  const nmId = extractWbNmId(link);
  if (!nmId) return null;
  return memoryCache.get(nmId) ?? null;
}

function parseCache(raw: string | null): CacheMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: CacheMap = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
      const row = value as Record<string, unknown>;
      const title = typeof row.title === 'string' ? row.title.trim() : '';
      const description = typeof row.description === 'string' ? row.description.trim() : '';
      const imageUrl = typeof row.imageUrl === 'string' ? row.imageUrl.trim() : '';
      const nmId = typeof row.nmId === 'string' ? row.nmId.trim() : key;
      if (title && imageUrl) {
        out[key] = { nmId, title, description, imageUrl };
      }
    }
    return out;
  } catch {
    return {};
  }
}

function buildVolPart(nmId: string): { vol: number; part: number } | null {
  const nm = Number(nmId);
  if (!Number.isFinite(nm) || nm <= 0) return null;
  return {
    vol: Math.floor(nm / 100_000),
    part: Math.floor(nm / 1_000),
  };
}

function buildCardJsonUrl(basket: number, nmId: string): string | null {
  const dims = buildVolPart(nmId);
  if (!dims) return null;
  const host = `basket-${String(basket).padStart(2, '0')}.wbbasket.ru`;
  return `https://${host}/vol${dims.vol}/part${dims.part}/${nmId}/info/ru/card.json`;
}

function buildImageUrl(basket: number, nmId: string, size: 'c516x688' | 'big' = 'c516x688'): string | null {
  const dims = buildVolPart(nmId);
  if (!dims) return null;
  const host = `basket-${String(basket).padStart(2, '0')}.wbbasket.ru`;
  return `https://${host}/vol${dims.vol}/part${dims.part}/${nmId}/images/${size}/1.webp`;
}

function normalizeDescription(raw: string | undefined): string {
  if (!raw) return '';
  return raw.replace(/\s+/g, ' ').trim();
}

async function fetchJson<T>(url: string, timeoutMs: number): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function loadPersistentCache(nmId: string): Promise<WildberriesProductInfo | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    const map = parseCache(raw);
    return map[nmId] ?? null;
  } catch {
    return null;
  }
}

async function persistCacheEntry(info: WildberriesProductInfo): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    const map = parseCache(raw);
    map[info.nmId] = info;
    const keys = Object.keys(map);
    if (keys.length > 400) {
      for (const key of keys.slice(0, keys.length - 400)) {
        delete map[key];
      }
    }
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch {
    // ignore cache write errors
  }
}

function getKnownBasket(nmId: string): number | null {
  const basket = WB_NM_ID_TO_BASKET[Number(nmId)];
  return basket != null ? basket : null;
}

async function resolveBasketByCardJson(nmId: string): Promise<number | null> {
  const known = getKnownBasket(nmId);
  if (known != null) {
    const url = buildCardJsonUrl(known, nmId);
    if (url) {
      const card = await fetchJson<WbCardJson>(url, FETCH_TIMEOUT_MS);
      if (card?.imt_name) return known;
    }
  }

  const baskets = Array.from({ length: MAX_BASKETS }, (_, index) => index + 1);
  let cursor = 0;
  let found: number | null = null;

  const worker = async () => {
    while (cursor < baskets.length && found == null) {
      const basket = baskets[cursor];
      cursor += 1;
      const url = buildCardJsonUrl(basket, nmId);
      if (!url) continue;
      const card = await fetchJson<WbCardJson>(url, FETCH_TIMEOUT_MS);
      if (card?.imt_name && found == null) {
        found = basket;
      }
    }
  };

  await Promise.all(Array.from({ length: 4 }, () => worker()));
  return found;
}

async function fetchWildberriesProductInfo(link: string): Promise<WildberriesProductInfo | null> {
  const nmId = extractWbNmId(link);
  if (!nmId) return null;

  const cached = memoryCache.get(nmId) ?? (await loadPersistentCache(nmId));
  if (cached) {
    memoryCache.set(nmId, cached);
    return cached;
  }

  const basket = await resolveBasketByCardJson(nmId);
  if (basket == null) return null;

  const cardUrl = buildCardJsonUrl(basket, nmId);
  if (!cardUrl) return null;

  const card = await fetchJson<WbCardJson>(cardUrl, FETCH_TIMEOUT_MS);
  const title = card?.imt_name?.trim();
  if (!title) return null;

  const imageUrl = buildImageUrl(basket, nmId) ?? buildImageUrl(basket, nmId, 'big');
  if (!imageUrl) return null;

  const info: WildberriesProductInfo = {
    nmId,
    title,
    description: normalizeDescription(card?.description),
    imageUrl,
  };

  memoryCache.set(nmId, info);
  await persistCacheEntry(info);
  return info;
}

/** Загружает название, описание и фото с CDN Wildberries (card.json). */
export async function getWildberriesProductInfo(
  link: string | null | undefined,
): Promise<WildberriesProductInfo | null> {
  if (!link) return null;

  const nmId = extractWbNmId(link);
  if (!nmId) return null;

  const cached = memoryCache.get(nmId);
  if (cached) return cached;

  const existing = inflight.get(nmId);
  if (existing) return existing;

  const promise = fetchWildberriesProductInfo(link).finally(() => {
    inflight.delete(nmId);
  });
  inflight.set(nmId, promise);
  return promise;
}

/** Предзагрузка карточек каталога (best-effort). */
export async function prefetchWildberriesProductInfo(
  links: string[],
  limit = 24,
): Promise<void> {
  const uniqueLinks = [...new Set(links.filter(Boolean))].slice(0, limit);
  await Promise.all(
    uniqueLinks.map((link) =>
      getWildberriesProductInfo(link).catch(() => null),
    ),
  );
}
