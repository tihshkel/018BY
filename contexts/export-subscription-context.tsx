import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

import { ExportSubscriptionIosProvider } from './export-subscription-ios-provider';
import { getSupabase } from '@/lib/supabase';

export type ExportSubscriptionContextValue = {
  isUnlocked: boolean;
  /** @deprecated Compatibility alias for isUnlocked; this is a one-time purchase. */
  isSubscribed: boolean;
  isLoading: boolean;
  isIapEnabled: boolean;
  priceLabel: string | null;
  storeError: string | null;
  purchaseBlocked?: boolean;
  purchaseBlockReason?: 'legacy-purchase' | 'other-account' | 'sign-in-required';
  purchase: () => Promise<boolean>;
  restore: () => Promise<boolean>;
  refresh: () => Promise<void>;
};

const defaultValue: ExportSubscriptionContextValue = {
  isUnlocked: false,
  isSubscribed: false,
  isLoading: false,
  isIapEnabled: false,
  priceLabel: null,
  storeError: null,
  purchaseBlocked: true,
  purchase: async () => false,
  restore: async () => false,
  refresh: async () => {},
};

function IosAccountProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<{ id: string | null; loading: boolean }>({ id: null, loading: true });
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setAccount({ id: null, loading: false });
      return;
    }
    let active = true;
    let authChanged = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'INITIAL_SESSION' && authChanged) return;
      authChanged = true;
      setAccount({ id: session?.user.id ?? null, loading: false });
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (active && !authChanged) setAccount({ id: error ? null : data.session?.user.id ?? null, loading: false });
    }).catch(() => {
      if (active && !authChanged) setAccount({ id: null, loading: false });
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (account.id) {
    // A new session gets fresh state/listeners. An old account's pending StoreKit
    // request must never grant access to the next signed-in account.
    return <ExportSubscriptionIosProvider key={account.id} accountId={account.id}>{children}</ExportSubscriptionIosProvider>;
  }
  const message = 'Войдите в аккаунт 018BY, чтобы купить или восстановить доступ к печати.';
  const unavailable = async () => {
    Alert.alert('Нужен вход в аккаунт', message);
    return false;
  };
  return <ExportSubscriptionContext.Provider value={{
    ...defaultValue,
    isIapEnabled: true,
    isLoading: account.loading,
    storeError: account.loading ? null : message,
    purchaseBlockReason: account.loading ? undefined : 'sign-in-required',
    purchase: unavailable,
    restore: unavailable,
  }}>{children}</ExportSubscriptionContext.Provider>;
}

export const ExportSubscriptionContext =
  createContext<ExportSubscriptionContextValue | undefined>(undefined);

export function useExportSubscription(): ExportSubscriptionContextValue {
  const value = useContext(ExportSubscriptionContext);
  if (!value) throw new Error('ExportSubscriptionProvider is required');
  return value;
}

export function ExportSubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  if (Platform.OS === 'ios') {
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
      const message = 'Покупки недоступны в Expo Go. Установите dev build или сборку TestFlight.';
      const unavailable = async () => {
        Alert.alert('Покупка недоступна', message);
        return false;
      };
      return (
        <ExportSubscriptionContext.Provider value={{
          ...defaultValue,
          isIapEnabled: true,
          isUnlocked: false,
          isSubscribed: false,
          storeError: message,
          purchase: unavailable,
          restore: unavailable,
        }}>
          {children}
        </ExportSubscriptionContext.Provider>
      );
    }
    return <IosAccountProvider>{children}</IosAccountProvider>;
  }

  return (
    <ExportSubscriptionContext.Provider value={{ ...defaultValue, isUnlocked: true, isSubscribed: true, purchaseBlocked: false }}>
      {children}
    </ExportSubscriptionContext.Provider>
  );
}
