import React from 'react';
import { Platform } from 'react-native';

import { ExportSubscriptionAndroidGate } from './export-subscription-android-gate';
import {
  ExportSubscriptionContext,
  exportSubscriptionDefaultValue,
  type ExportSubscriptionContextValue,
  useExportSubscription,
} from './export-subscription-context-core';
import { ExportSubscriptionStoreProvider } from './export-subscription-store-provider';

export type { ExportSubscriptionContextValue };
export { ExportSubscriptionContext, useExportSubscription };

export function ExportSubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  if (Platform.OS === 'ios') {
    return <ExportSubscriptionStoreProvider>{children}</ExportSubscriptionStoreProvider>;
  }

  if (Platform.OS === 'android') {
    return <ExportSubscriptionAndroidGate>{children}</ExportSubscriptionAndroidGate>;
  }

  const webValue: ExportSubscriptionContextValue = {
    ...exportSubscriptionDefaultValue,
    isSubscribed: true,
    isStoreConnected: true,
    purchase: async () => true,
    restore: async () => true,
  };

  return (
    <ExportSubscriptionContext.Provider value={webValue}>
      {children}
    </ExportSubscriptionContext.Provider>
  );
}
