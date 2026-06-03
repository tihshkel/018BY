import React, { createContext, useContext } from 'react';
import { Platform } from 'react-native';

import { ExportSubscriptionIosProvider } from './export-subscription-ios-provider';

export type ExportSubscriptionContextValue = {
  isSubscribed: boolean;
  isLoading: boolean;
  isIapEnabled: boolean;
  priceLabel: string | null;
  purchase: () => Promise<boolean>;
  restore: () => Promise<boolean>;
  refresh: () => Promise<void>;
};

const defaultValue: ExportSubscriptionContextValue = {
  isSubscribed: true,
  isLoading: false,
  isIapEnabled: false,
  priceLabel: null,
  purchase: async () => true,
  restore: async () => true,
  refresh: async () => {},
};

export const ExportSubscriptionContext =
  createContext<ExportSubscriptionContextValue>(defaultValue);

export function useExportSubscription(): ExportSubscriptionContextValue {
  return useContext(ExportSubscriptionContext);
}

export function ExportSubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  if (Platform.OS === 'ios') {
    return <ExportSubscriptionIosProvider>{children}</ExportSubscriptionIosProvider>;
  }

  return (
    <ExportSubscriptionContext.Provider value={defaultValue}>
      {children}
    </ExportSubscriptionContext.Provider>
  );
}
