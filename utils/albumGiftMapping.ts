import { GIFT_ITEMS, type GiftItem, COVER_BY_SKU } from '@/app/(tabs)/gifts';
import type { ImageSourcePropType } from 'react-native';

/**
 * Находит товар в каталоге по SKU
 */
export function getGiftItemBySku(sku: string): GiftItem | null {
  return GIFT_ITEMS.find(gift => gift.sku === sku) || null;
}

/** Название товара из каталога (Wildberries), без внутренних артикулов DB1/DFA5. */
export function getGiftDisplayTitle(sku: string, fallback = ''): string {
  const gift = getGiftItemBySku(sku);
  const title = gift?.title?.trim();
  return title && title.length > 0 ? title : fallback;
}

/**
 * Находит товар в каталоге по изображению обложки
 * Сопоставляет thumbnailPath с COVER_BY_SKU для получения SKU
 */
export function getGiftItemByImage(thumbnailPath: ImageSourcePropType | undefined): GiftItem | null {
  if (!thumbnailPath) return null;
  
  // Ищем SKU по изображению в COVER_BY_SKU
  // В React Native require() модули имеют уникальные числовые идентификаторы,
  // поэтому сравниваем по ссылке на объект
  const sku = Object.keys(COVER_BY_SKU).find(sku => {
    const coverImage = COVER_BY_SKU[sku as keyof typeof COVER_BY_SKU];
    // Сравниваем require() модули по их числовому значению
    if (typeof thumbnailPath === 'number' && typeof coverImage === 'number') {
      return thumbnailPath === coverImage;
    }
    return false;
  });
  
  if (sku) {
    return getGiftItemBySku(sku);
  }
  
  return null;
}

/**
 * Находит товар в каталоге по названию альбома
 * Сопоставляет album.name с gift.title
 */
export function getGiftItemByAlbumName(albumName: string): GiftItem | null {
  // Ищем точное совпадение или частичное совпадение названия
  const matchingItem = GIFT_ITEMS.find(gift => {
    // Точное совпадение
    if (gift.title === albumName) {
      return true;
    }
    
    // Частичное совпадение (если название альбома содержит название товара или наоборот)
    const albumNameLower = albumName.toLowerCase();
    const giftTitleLower = gift.title.toLowerCase();
    
    if (albumNameLower.includes(giftTitleLower) || giftTitleLower.includes(albumNameLower)) {
      return true;
    }
    
    return false;
  });
  
  return matchingItem || null;
}

/**
 * Получает ссылку на Wildberries для альбома
 * Пытается найти по изображению, по ID альбома (для детских), по SKU (для дневников), или по названию
 */
export function getWildberriesLink(albumName: string, thumbnailPath?: ImageSourcePropType, albumId?: string): string | null {
  // Сначала пытаемся найти по изображению (более точное сопоставление)
  if (thumbnailPath) {
    const giftItemByImage = getGiftItemByImage(thumbnailPath);
    if (giftItemByImage?.link) {
      return giftItemByImage.link;
    }
  }
  
  // Для дневников (diary_*) или если albumId является SKU дневника (DD1-DD21)
  // Пытаемся найти по SKU
  if (albumId) {
    // Если albumId начинается с diary_, извлекаем SKU из названия
    if (albumId.startsWith('diary_')) {
      // Извлекаем номер из diary_dd1 -> DD1, diary_dd21 -> DD21
      const match = albumId.match(/diary_dd(\d+)/i);
      if (match) {
        const sku = `DD${match[1]}`;
        const giftItemBySku = getGiftItemBySku(sku);
        if (giftItemBySku?.link) {
          return giftItemBySku.link;
        }
      }
    }
    // Если albumId уже является SKU дневника (DD1, DD2, ..., DD21)
    else if (/^DD\d+$/i.test(albumId)) {
      const sku = albumId.toUpperCase();
      const giftItemBySku = getGiftItemBySku(sku);
      if (giftItemBySku?.link) {
        return giftItemBySku.link;
      }
    }
  }
  
  // Для детских альбомов (dfa_*) пытаемся найти по ID альбома
  // Преобразуем dfa_7 -> DFA7, dfa_8 -> DFA8 и т.д.
  if (albumId && albumId.startsWith('dfa_')) {
    const sku = albumId.replace('dfa_', 'DFA').toUpperCase();
    const giftItemBySku = getGiftItemBySku(sku);
    if (giftItemBySku?.link) {
      return giftItemBySku.link;
    }
  }
  
  // Если не найдено по изображению или ID, ищем по названию
  const giftItem = getGiftItemByAlbumName(albumName);
  return giftItem?.link || null;
}

/**
 * Получает ссылку на Wildberries по изображению обложки
 */
export function getWildberriesLinkByImage(thumbnailPath: ImageSourcePropType | undefined): string | null {
  const giftItem = getGiftItemByImage(thumbnailPath);
  return giftItem?.link || null;
}

