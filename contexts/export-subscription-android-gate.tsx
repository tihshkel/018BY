import React, { useCallback, useMemo, useState } from 'react';

import {
  ExportSubscriptionContext,
  exportSubscriptionDefaultValue,
  type ExportSubscriptionContextValue,
} from './export-subscription-context-core';
import { ExportSubscriptionStoreProvider } from './export-subscription-store-provider';

/** Android: не вызываем useIAP при старте — только по запросу (экран подписки / paywall). */
export function ExportSubscriptionAndroidGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [storeActive, setStoreActive] = useState(false);

  const warmUpStore = useCallback(() => {
    setStoreActive(true);
  }, []);

  const idleValue = useMemo<ExportSubscriptionContextValue>(
    () => ({
      ...exportSubscriptionDefaultValue,
      isLoading: false,
      warmUpStore,
    }),
    [warmUpStore]
  );

  if (!storeActive) {
    return (
      <ExportSubscriptionContext.Provider value={idleValue}>
        {children}
      </ExportSubscriptionContext.Provider>
    );
  }

  return <ExportSubscriptionStoreProvider>{children}</ExportSubscriptionStoreProvider>;
}
