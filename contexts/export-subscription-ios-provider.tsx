import {
  EXPORT_PRINT_UNLOCK_SKU,
  EXPORT_PRINT_UNLOCK_SKUS,
} from '@/constants/subscription';
import {
  ErrorCode,
  getAvailablePurchases as getAvailablePurchasesDirect,
  useIAP,
  type Purchase,
} from 'expo-iap';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import {
  ExportSubscriptionContext,
  type ExportSubscriptionContextValue,
} from './export-subscription-context';

type PendingAction = { resolve: (ok: boolean) => void } | null;

function purchaseUnlocksExport(purchase: Purchase): boolean {
  const id = purchase.productId ?? purchase.id;
  return EXPORT_PRINT_UNLOCK_SKUS.includes(
    id as (typeof EXPORT_PRINT_UNLOCK_SKUS)[number]
  );
}

export function ExportSubscriptionIosProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [priceLabel, setPriceLabel] = useState<string | null>(null);
  const pendingPurchaseRef = useRef<PendingAction>(null);

  const {
    connected,
    products,
    availablePurchases,
    fetchProducts,
    requestPurchase,
    finishTransaction,
    restorePurchases,
    getAvailablePurchases,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      try {
        await finishTransaction({ purchase, isConsumable: false });
      } catch {
        // ignore
      }
      const unlocked = purchaseUnlocksExport(purchase);
      setIsSubscribed(unlocked);
      pendingPurchaseRef.current?.resolve(unlocked);
      pendingPurchaseRef.current = null;
    },
    onPurchaseError: (error) => {
      if (error.code === ErrorCode.UserCancelled) {
        pendingPurchaseRef.current?.resolve(false);
        pendingPurchaseRef.current = null;
        return;
      }
      pendingPurchaseRef.current?.resolve(false);
      pendingPurchaseRef.current = null;
    },
  });

  const syncUnlockFromPurchases = useCallback((purchases: Purchase[]) => {
    const unlocked = purchases.some(purchaseUnlocksExport);
    setIsSubscribed(unlocked);
    return unlocked;
  }, []);

  const loadOwnedPurchases = useCallback(async (): Promise<boolean> => {
    const purchases = await getAvailablePurchasesDirect();
    return syncUnlockFromPurchases(purchases);
  }, [syncUnlockFromPurchases]);

  const refresh = useCallback(async () => {
    if (!connected) return;
    setIsLoading(true);
    try {
      await getAvailablePurchases();
      await loadOwnedPurchases();
    } catch {
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }, [connected, getAvailablePurchases, loadOwnedPurchases]);

  useEffect(() => {
    syncUnlockFromPurchases(availablePurchases);
  }, [availablePurchases, syncUnlockFromPurchases]);

  useEffect(() => {
    if (!connected) return;
    fetchProducts({
      skus: [...EXPORT_PRINT_UNLOCK_SKUS],
      type: 'in-app',
    }).catch(() => {});
  }, [connected, fetchProducts]);

  useEffect(() => {
    const product = products.find((p) => p.id === EXPORT_PRINT_UNLOCK_SKU);
    if (product?.displayPrice) {
      setPriceLabel(product.displayPrice);
    }
  }, [products]);

  useEffect(() => {
    if (!connected) return;
    refresh();
  }, [connected, refresh]);

  useEffect(() => {
    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        refresh();
      }
    };
    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [refresh]);

  const purchase = useCallback(async (): Promise<boolean> => {
    if (!connected) return false;
    if (isSubscribed) return true;

    return new Promise<boolean>((resolve) => {
      pendingPurchaseRef.current = { resolve };
      requestPurchase({
        request: { apple: { sku: EXPORT_PRINT_UNLOCK_SKU } },
      }).catch(() => {
        pendingPurchaseRef.current?.resolve(false);
        pendingPurchaseRef.current = null;
      });
    });
  }, [connected, isSubscribed, requestPurchase]);

  const restore = useCallback(async (): Promise<boolean> => {
    if (!connected) return false;
    setIsLoading(true);
    try {
      await restorePurchases();
      await getAvailablePurchases();
      return await loadOwnedPurchases();
    } catch {
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [connected, restorePurchases, getAvailablePurchases, loadOwnedPurchases]);

  const value = useMemo<ExportSubscriptionContextValue>(
    () => ({
      isSubscribed,
      isLoading,
      isIapEnabled: true,
      priceLabel,
      purchase,
      restore,
      refresh,
    }),
    [isSubscribed, isLoading, priceLabel, purchase, restore, refresh]
  );

  return (
    <ExportSubscriptionContext.Provider value={value}>
      {children}
    </ExportSubscriptionContext.Provider>
  );
}
