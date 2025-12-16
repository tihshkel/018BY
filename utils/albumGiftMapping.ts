import { GIFT_ITEMS, type GiftItem, COVER_BY_SKU } from '@/app/(tabs)/gifts';
import type { ImageSourcePropType } from 'react-native';

/**
 * Находит товар в каталоге по SKU
 */
export function getGiftItemBySku(sku: string): GiftItem | null {
  return GIFT_ITEMS.find(gift => gift.sku === sku) || null;
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
 * Получает ссылку на Wildberries для альбома по названию
 * Пытается найти по изображению, если не найдено - по названию
 */
export function getWildberriesLink(albumName: string, thumbnailPath?: ImageSourcePropType): string | null {
  // Сначала пытаемся найти по изображению (более точное сопоставление)
  if (thumbnailPath) {
    const giftItemByImage = getGiftItemByImage(thumbnailPath);
    if (giftItemByImage?.link) {
      return giftItemByImage.link;
    }
  }
  
  // Если не найдено по изображению, ищем по названию
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

