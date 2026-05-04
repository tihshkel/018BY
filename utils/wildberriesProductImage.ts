/**
 * Превью товара с CDN Wildberries (как на сайте WB).
 * Карта nmId → хост basket-XX: `constants/wb-nm-to-basket.json`
 * (обновляется скриптом `node scripts/probe-wb-baskets.mjs` при добавлении новых ссылок в каталог).
 */

import wbNmToBasket from '@/constants/wb-nm-to-basket.json';

const WB_NM_ID_TO_BASKET: Record<number, number> = Object.fromEntries(
  Object.entries(wbNmToBasket as Record<string, number>).map(([k, v]) => [Number(k), v])
);

export { WB_NM_ID_TO_BASKET };

const CATALOG_PATH_RE = /wildberries\.ru\/catalog\/(\d+)\//i;

export function parseWildberriesNmId(catalogUrl: string): number | null {
  const m = catalogUrl.match(CATALOG_PATH_RE);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

export type WbImageSize = 'c516x688' | 'big';

/**
 * URL главного фото карточки на CDN WB (webp).
 * @returns null если ссылка не WB или nmId нет в карте хостов.
 */
export function getWildberriesProductImageUrl(
  catalogUrl: string,
  options?: { size?: WbImageSize; imageIndex?: number }
): string | null {
  const nmId = parseWildberriesNmId(catalogUrl);
  if (nmId == null) return null;

  const basket = WB_NM_ID_TO_BASKET[nmId];
  if (basket == null) return null;

  const vol = Math.floor(nmId / 100_000);
  const part = Math.floor(nmId / 1000);
  const size = options?.size ?? 'c516x688';
  const imageIndex = options?.imageIndex ?? 1;
  const host = `basket-${String(basket).padStart(2, '0')}.wbbasket.ru`;
  return `https://${host}/vol${vol}/part${part}/${nmId}/images/${size}/${imageIndex}.webp`;
}
