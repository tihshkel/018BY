import React, { createContext, useContext } from 'react';

export type ExportSubscriptionContextValue = {
  isSubscribed: boolean;
  isLoading: boolean;
  isIapEnabled: boolean;
  /** Google Play / App Store billing connection is ready */
  isStoreConnected: boolean;
  priceLabel: string | null;
  purchase: () => Promise<boolean>;
  restore: () => Promise<boolean>;
  refresh: () => Promise<void>;
  /** Android: подключить billing только когда нужен (не при старте приложения). */
  warmUpStore?: () => void;
};

export const exportSubscriptionDefaultValue: ExportSubscriptionContextValue = {
  isSubscribed: false,
  isLoading: false,
  isIapEnabled: false,
  isStoreConnected: false,
  priceLabel: null,
  purchase: async () => false,
  restore: async () => false,
  refresh: async () => {},
};

export const ExportSubscriptionContext =
  createContext<ExportSubscriptionContextValue>(exportSubscriptionDefaultValue);

export function useExportSubscription(): ExportSubscriptionContextValue {
  return useContext(ExportSubscriptionContext);
}
