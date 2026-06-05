import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type NotificationTabContextValue = {
  isNotificationTabActive: boolean;
  activateNotificationTab: () => void;
  deactivateNotificationTab: () => void;
};

const NotificationTabContext = createContext<NotificationTabContextValue | null>(null);

export function NotificationTabProvider({ children }: { children: React.ReactNode }) {
  const [isNotificationTabActive, setIsNotificationTabActive] = useState(false);

  const activateNotificationTab = useCallback(() => {
    setIsNotificationTabActive(true);
  }, []);

  const deactivateNotificationTab = useCallback(() => {
    setIsNotificationTabActive(false);
  }, []);

  const value = useMemo(
    () => ({
      isNotificationTabActive,
      activateNotificationTab,
      deactivateNotificationTab,
    }),
    [activateNotificationTab, deactivateNotificationTab, isNotificationTabActive]
  );

  return (
    <NotificationTabContext.Provider value={value}>{children}</NotificationTabContext.Provider>
  );
}

export function useNotificationTabContext(): NotificationTabContextValue {
  const context = useContext(NotificationTabContext);
  if (!context) {
    throw new Error('useNotificationTabContext must be used within NotificationTabProvider');
  }
  return context;
}
