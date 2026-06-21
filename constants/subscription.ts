/**
 * App Store Connect (обязательно перед релизом IAP):
 * 1. Покупки в приложении → Non-Consumable (не подписка!)
 * 2. Product ID ниже, цена Tier ~$4.99 (разовая оплата)
 * 3. Sandbox Tester для тестов на iPhone
 */
export const EXPORT_PRINT_UNLOCK_SKU = 'com.tihshkel.x018BY.export_print_unlock';

export const EXPORT_PRINT_UNLOCK_SKUS = [EXPORT_PRINT_UNLOCK_SKU] as const;

/** @deprecated Используйте EXPORT_PRINT_UNLOCK_SKU */
export const EXPORT_PRINT_SUBSCRIPTION_SKU = EXPORT_PRINT_UNLOCK_SKU;

/** @deprecated Используйте EXPORT_PRINT_UNLOCK_SKUS */
export const EXPORT_PRINT_SUBSCRIPTION_SKUS = EXPORT_PRINT_UNLOCK_SKUS;

/** Форматы экспорта, требующие разовой покупки на iOS */
export type PrintExportFormatType = 'hard' | 'soft';

export function requiresPrintSubscription(
  formatType: 'electronic' | 'hard' | 'soft'
): formatType is PrintExportFormatType {
  return formatType === 'hard' || formatType === 'soft';
}

/** История покупок Apple ID (для восстановления разовых покупок) */
export const APPLE_PURCHASE_HISTORY_URL =
  'https://apps.apple.com/account/purchases';

/** История заказов Google Play */
export const GOOGLE_PLAY_PURCHASE_HISTORY_URL =
  'https://play.google.com/store/account/orderhistory';

/** @deprecated Для разовой покупки не используется */
export const APPLE_MANAGE_SUBSCRIPTIONS_URL = APPLE_PURCHASE_HISTORY_URL;
