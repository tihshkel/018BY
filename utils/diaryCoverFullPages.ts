import type { ImageSourcePropType } from 'react-native';

/**
 * Полноразмерные first_page дневников (~6 MB).
 * Подключать только в export / first-last pages — не в списках категории.
 */
const DIARY_FIRST_PAGE_BY_SKU: Record<string, ImageSourcePropType> = {
  DD1: require('@/albums/diary/DD1/first_page.png'),
  DD2: require('@/albums/diary/DD2/first_page.png'),
  DD3: require('@/albums/diary/DD3/first_page.png'),
  DD4: require('@/albums/diary/DD4/first_page.png'),
  DD5: require('@/albums/diary/DD5/first_page.png'),
  DD6: require('@/albums/diary/DD6/first_page.png'),
  DD7: require('@/albums/diary/DD7/first_page.png'),
  DD8: require('@/albums/diary/DD8/first_page.png'),
  DD9: require('@/albums/diary/DD9/first_page.png'),
  DD10: require('@/albums/diary/DD10/first_page.png'),
  DD11: require('@/albums/diary/DD11/first_page.png'),
  DD12: require('@/albums/diary/DD12/first_page.png'),
  DD13: require('@/albums/diary/DD13/first_page.png'),
  DD14: require('@/albums/diary/DD14/first_page.png'),
  DD15: require('@/albums/diary/DD15/first_page.png'),
  DD16: require('@/albums/diary/DD16/first_page.png'),
  DD17: require('@/albums/diary/DD17/first_page.png'),
  DD18: require('@/albums/diary/DD18/first_page.png'),
  DD20: require('@/albums/diary/DD20/first_page.png'),
  DD21: require('@/albums/diary/DD21/first_page.png'),
};

export function getDiaryFullCoverBySku(sku: string): ImageSourcePropType | null {
  return DIARY_FIRST_PAGE_BY_SKU[sku] ?? null;
}

/** albumId вида diary_dd1 / diary_dd21 → full first_page */
export function getDiaryFullCoverById(albumId: string): ImageSourcePropType | null {
  const match = albumId.match(/^diary_dd(\d+)$/i);
  if (!match) return null;
  return getDiaryFullCoverBySku(`DD${match[1]}`);
}
