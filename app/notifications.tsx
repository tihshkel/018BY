import { router, type Href } from 'expo-router';
import { useEffect } from 'react';

import { useNotificationTabContext } from '@/contexts/notification-tab-context';

/**
 * Deep link target for widget taps: app018by://notifications
 * Mirrors push notification tap → history tab.
 */
export default function NotificationsDeepLinkScreen() {
  const { activateNotificationTab } = useNotificationTabContext();

  useEffect(() => {
    activateNotificationTab();
    router.replace('/(tabs)/notifications' as Href);
  }, [activateNotificationTab]);

  return null;
}
