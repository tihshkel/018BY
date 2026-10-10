import { EXPORT_PRINT_UNLOCK_SKU, EXPORT_PRINT_UNLOCK_SKUS } from '@/constants/subscription';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ErrorCode,
  fetchProducts,
  getAvailablePurchases,
  syncIOS,
  useIAP,
  type Purchase,
} from 'expo-iap';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';

import { ExportSubscriptionContext, type ExportSubscriptionContextValue } from './export-subscription-context';

const STORE_TIMEOUT_MS = 15_000;
const PURCHASE_TIMEOUT_MS = 90_000;
const UNAVAILABLE = 'Продукт недоступен. Проверьте подключение к интернету и повторите попытку.';
const DISCONNECTED = 'Не удалось подключиться к App Store. Проверьте интернет и нажмите «Повторить».';
const ACTIVE_PURCHASES = { onlyIncludeActiveItemsIOS: true, alsoPublishToEventListenerIOS: false };
const OTHER_ACCOUNT = 'Эта покупка Apple ID связана с другим аккаунтом 018BY. Войдите в аккаунт, в котором покупали доступ. Повторная оплата не нужна.';
const LEGACY_PURCHASE = 'Найдена покупка из прежней версии без привязки к аккаунту 018BY. Обратитесь в поддержку для привязки покупки; повторно оплачивать её не нужно.';

type PendingPurchase = { resolve: (ok: boolean) => void; timer: ReturnType<typeof setTimeout> };

function withTimeout<T>(promise: Promise<T>, ms = STORE_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('store-timeout')), ms);
    promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

function isOurPurchase(purchase: Purchase): boolean {
  return (purchase.productId || purchase.id) === EXPORT_PRINT_UNLOCK_SKU;
}

function unlocksExport(purchase: Purchase): boolean {
  return isOurPurchase(purchase) && purchase.purchaseState === 'purchased' &&
    !('revocationDateIOS' in purchase && purchase.revocationDateIOS != null);
}

function errorCode(error: unknown): unknown {
  return error && typeof error === 'object' && 'code' in error ? error.code : undefined;
}

function purchaseErrorMessage(error: unknown): string {
  switch (errorCode(error)) {
    case ErrorCode.NetworkError:
      return 'Нет связи с App Store. Проверьте интернет и повторите попытку.';
    case ErrorCode.ItemUnavailable:
    case ErrorCode.SkuNotFound:
      return UNAVAILABLE;
    case ErrorCode.Pending:
    case ErrorCode.DeferredPayment:
      return 'Покупка ожидает подтверждения Apple. Доступ откроется после подтверждения; повторная оплата не нужна.';
    default:
      return 'App Store не подтвердил покупку. Повторите попытку или нажмите «Восстановить покупки», если оплата уже прошла.';
  }
}

export function ExportSubscriptionIosProvider({ children, accountId }: { children: React.ReactNode; accountId: string }) {
  const cacheKey = `iap:${EXPORT_PRINT_UNLOCK_SKU}:v2:${accountId.toLowerCase()}`;
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [priceLabel, setPriceLabel] = useState<string | null>(null);
  const [storeError, setStoreError] = useState<string | null>(null);
  const mounted = useRef(true);
  const unlocked = useRef(false);
  const revision = useRef(0);
  const operation = useRef<'purchase' | 'restore' | 'refresh' | null>(null);
  const pending = useRef<PendingPurchase | null>(null);
  const cacheWrite = useRef(Promise.resolve());
  const cacheRead = useRef<Promise<void> | null>(null);
  const ownershipError = useRef<string | null>(null);
  const processingTransactions = useRef(new Set<string>());
  const finishedTransactions = useRef(new Set<string>());
  const belongsToAccount = useCallback((purchase: Purchase) =>
    'appAccountToken' in purchase && purchase.appAccountToken?.toLowerCase() === accountId.toLowerCase(), [accountId]);
  const ownershipMessage = useCallback((purchase: Purchase) =>
    'appAccountToken' in purchase && purchase.appAccountToken ? OTHER_ACCOUNT : LEGACY_PURCHASE, []);

  const saveUnlock = useCallback((value: boolean) => {
    if (!mounted.current) return;
    revision.current += 1;
    unlocked.current = value;
    setIsUnlocked(value);
    // Serialize writes so an older refresh cannot overwrite a new purchase on disk.
    cacheWrite.current = cacheWrite.current.then(() =>
      withTimeout(AsyncStorage.setItem(cacheKey, value ? '1' : '0'), 1000)
    ).catch(() => {});
  }, [cacheKey]);

  const completePurchase = useCallback((ok: boolean, action = pending.current) => {
    if (!action || pending.current !== action) return;
    clearTimeout(action.timer);
    pending.current = null;
    operation.current = null;
    if (mounted.current) setIsLoading(false);
    action.resolve(ok);
  }, []);

  const loadOwned = useCallback(async () => {
    const startRevision = revision.current;
    const purchases = await withTimeout(getAvailablePurchases(ACTIVE_PURCHASES));
    if (mounted.current && startRevision === revision.current) {
      const owned = purchases.some((purchase) => unlocksExport(purchase) && belongsToAccount(purchase));
      const other = purchases.find((purchase) => unlocksExport(purchase) && !belongsToAccount(purchase));
      ownershipError.current = !owned && other ? ownershipMessage(other) : null;
      saveUnlock(owned);
    }
    return unlocked.current;
  }, [saveUnlock, belongsToAccount, ownershipMessage]);

  const handlePurchaseError = useCallback(async (error: unknown, action = pending.current) => {
    if (!action || action !== pending.current) return;
    if (errorCode(error) === ErrorCode.UserCancelled) {
      completePurchase(false, action);
      return;
    }
    if (errorCode(error) === ErrorCode.AlreadyOwned || errorCode(error) === ErrorCode.DuplicatePurchase) {
      try {
        if (await loadOwned()) {
          completePurchase(true, action);
          return;
        }
      } catch { /* Show the recovery message below. */ }
    }
    if (mounted.current && pending.current === action) {
      Alert.alert('Покупка не завершена', ownershipError.current ?? purchaseErrorMessage(error));
      completePurchase(false, action);
    }
  }, [completePurchase, loadOwned]);

  const { connected, requestPurchase, finishTransaction, restorePurchases, reconnect } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      if (!mounted.current || !isOurPurchase(purchase)) return;
      if (!belongsToAccount(purchase)) {
        if (unlocksExport(purchase)) {
          ownershipError.current = ownershipMessage(purchase);
          setStoreError(ownershipError.current);
          if (pending.current) Alert.alert('Доступ не открыт', ownershipError.current);
          completePurchase(false);
        }
        return;
      }
      if (!unlocksExport(purchase)) {
        if ('revocationDateIOS' in purchase && purchase.revocationDateIOS != null) {
          saveUnlock(false);
          completePurchase(false);
          return;
        }
        await handlePurchaseError({
          code: purchase.purchaseState === 'pending' ? ErrorCode.Pending : ErrorCode.PurchaseVerificationFailed,
        });
        return;
      }
      const transactionId = purchase.transactionId || purchase.id;
      if (processingTransactions.current.has(transactionId) || finishedTransactions.current.has(transactionId)) return;
      processingTransactions.current.add(transactionId);
      // OpenIAP checks StoreKit 2 VerificationResult before emitting this transaction.
      // Grant before finishing, including transactions replayed after a previous crash/timeout.
      const action = pending.current;
      ownershipError.current = null;
      saveUnlock(true);
      try {
        await withTimeout(finishTransaction({ purchase, isConsumable: false }));
        finishedTransactions.current.add(transactionId);
      } catch {
        // The entitlement remains valid. StoreKit will replay the unfinished transaction.
        if (mounted.current) setStoreError('Доступ открыт. Не удалось завершить обработку покупки; откройте приложение позже с интернетом.');
      } finally {
        processingTransactions.current.delete(transactionId);
      }
      completePurchase(true, action);
    },
    onPurchaseError: (error) => {
      if (error.productId && error.productId !== EXPORT_PRINT_UNLOCK_SKU) return;
      void handlePurchaseError(error);
    },
  });

  useEffect(() => {
    mounted.current = true;
    const startRevision = revision.current;
    cacheRead.current = withTimeout(AsyncStorage.getItem(cacheKey), 1000).then((value) => {
      if (mounted.current && revision.current === startRevision) {
        unlocked.current = value === '1';
        setIsUnlocked(value === '1');
      }
    }).catch(() => {});
    return () => {
      mounted.current = false;
      completePurchase(false);
    };
  }, [completePurchase, cacheKey]);

  const refresh = useCallback(async () => {
    if (operation.current) return;
    operation.current = 'refresh';
    setIsLoading(true);
    setStoreError(null);
    try {
      await cacheRead.current;
      if (!connected && !await withTimeout(reconnect())) throw new Error('not-connected');
      // Direct API returns this request's catalogue. useIAP.products merges stale products.
      const results = await Promise.allSettled([
        withTimeout(fetchProducts({ skus: [...EXPORT_PRINT_UNLOCK_SKUS], type: 'in-app' })),
        loadOwned(),
      ]);
      if (!mounted.current) return;
      const catalogue = results[0];
      const product = catalogue.status === 'fulfilled'
        ? catalogue.value?.find((item) => item.id === EXPORT_PRINT_UNLOCK_SKU && item.type === 'in-app')
        : undefined;
      setPriceLabel(product?.displayPrice || null);
      if (!product?.displayPrice) setStoreError(UNAVAILABLE);
      else if (results[1].status === 'rejected') {
        setStoreError('Не удалось проверить покупки. Повторите проверку с интернетом; сохранённый статус не изменён.');
      } else if (ownershipError.current) setStoreError(ownershipError.current);
    } catch {
      if (mounted.current) {
        setPriceLabel(null);
        setStoreError(DISCONNECTED);
      }
    } finally {
      operation.current = null;
      if (mounted.current) setIsLoading(false);
    }
  }, [connected, reconnect, loadOwned]);

  useEffect(() => {
    if (connected) {
      void refresh();
      return;
    }
    const timer = setTimeout(() => {
      if (mounted.current && !operation.current) {
        setStoreError(DISCONNECTED);
        setIsLoading(false);
      }
    }, STORE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [connected, refresh]);

  useEffect(() => {
    let previous = AppState.currentState;
    const sub = AppState.addEventListener('change', (state) => {
      const returning = previous !== 'active' && state === 'active';
      previous = state;
      // Apple's purchase sheet also changes AppState: don't race the pending purchase.
      if (returning) void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const purchase = useCallback(async (): Promise<boolean> => {
    if (operation.current) return false;
    if (unlocked.current) return true;
    if (!connected || !priceLabel) {
      Alert.alert('Покупка недоступна', connected ? UNAVAILABLE : DISCONNECTED);
      return false;
    }
    operation.current = 'purchase';
    setIsLoading(true);
    setStoreError(null);
    try {
      // Detect ownership on this Apple ID before showing a sheet: a non-consumable
      // already linked elsewhere cannot be bought again for a second app account.
      const owned = await loadOwned();
      if (!mounted.current) return false;
      if (owned || ownershipError.current) {
        operation.current = null;
        setIsLoading(false);
        if (ownershipError.current) {
          setStoreError(ownershipError.current);
          Alert.alert('Доступ не открыт', ownershipError.current);
        }
        return owned;
      }
    } catch {
      operation.current = null;
      if (mounted.current) {
        setIsLoading(false);
        setStoreError(DISCONNECTED);
        Alert.alert('Покупка недоступна', DISCONNECTED);
      }
      return false;
    }
    return new Promise<boolean>((resolve) => {
      const action: PendingPurchase = {
        resolve,
        timer: setTimeout(() => {
          if (pending.current !== action) return;
          if (mounted.current && !unlocked.current) {
            Alert.alert('Ожидание покупки завершено', 'Apple пока не подтвердил покупку. Если оплата прошла, нажмите «Восстановить покупки». Позднее подтверждение откроет доступ автоматически.');
          }
          completePurchase(unlocked.current, action);
        }, PURCHASE_TIMEOUT_MS),
      };
      pending.current = action;
      // The promise only dispatches the request; success comes from the listener.
      Promise.resolve().then(() => requestPurchase({
        type: 'in-app',
        request: { apple: { sku: EXPORT_PRINT_UNLOCK_SKU, appAccountToken: accountId } },
      })).catch((error: unknown) => void handlePurchaseError(error, action));
    });
  }, [connected, priceLabel, requestPurchase, completePurchase, handlePurchaseError, loadOwned, accountId]);

  const restore = useCallback(async (): Promise<boolean> => {
    if (operation.current) return false;
    operation.current = 'restore';
    setIsLoading(true);
    setStoreError(null);
    try {
      await cacheRead.current;
      if (!connected && !await withTimeout(reconnect())) throw new Error('not-connected');
      // expo-iap 4.3.1 restorePurchases swallows syncIOS failures. Check sync explicitly
      // so offline/cancelled authentication cannot be reported as "no purchases".
      if (!await withTimeout(syncIOS())) throw new Error('sync-failed');
      await withTimeout(restorePurchases(ACTIVE_PURCHASES));
      const restored = await loadOwned();
      if (mounted.current) Alert.alert(
        restored ? 'Готово' : ownershipError.current ? 'Доступ не открыт' : 'Покупки не найдены',
        restored ? 'Доступ к экспорту для печати восстановлен.' : ownershipError.current ?? 'Покупка для этого аккаунта 018BY не найдена. Проверьте аккаунт приложения и Apple ID, с которыми покупали доступ.',
      );
      if (mounted.current && ownershipError.current) setStoreError(ownershipError.current);
      return restored;
    } catch (error) {
      if (mounted.current && errorCode(error) !== ErrorCode.UserCancelled) {
        Alert.alert('Не удалось восстановить покупки', 'Проверьте интернет и вход в Apple ID, затем повторите попытку. Сохранённый доступ не изменён.');
      }
      return false;
    } finally {
      operation.current = null;
      if (mounted.current) setIsLoading(false);
    }
  }, [connected, reconnect, restorePurchases, loadOwned]);

  const value = useMemo<ExportSubscriptionContextValue>(() => ({
    isUnlocked,
    isSubscribed: isUnlocked, // Compatibility alias for existing consumers.
    isLoading,
    isIapEnabled: true,
    priceLabel,
    storeError,
    purchaseBlocked: ownershipError.current !== null,
    purchaseBlockReason: ownershipError.current === LEGACY_PURCHASE ? 'legacy-purchase' :
      ownershipError.current === OTHER_ACCOUNT ? 'other-account' : undefined,
    purchase,
    restore,
    refresh,
  }), [isUnlocked, isLoading, priceLabel, storeError, purchase, restore, refresh]);

  return <ExportSubscriptionContext.Provider value={value}>{children}</ExportSubscriptionContext.Provider>;
}
