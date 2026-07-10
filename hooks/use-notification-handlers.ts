import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import type { NotificationResponse } from 'expo-notifications';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useNotificationTabContext } from '@/contexts/notification-tab-context';
import { recordNotificationToInbox } from '@/utils/notificationInbox';
import { syncWidgetSnapshot } from '@/utils/widgetSnapshot';

const isExpoGo = Constants.executionEnvironment === 'storeClient';
const LAST_HANDLED_RESPONSE_KEY = '@last_handled_notification_response';

function getResponseKey(response: NotificationResponse): string {
  return `${response.notification.request.identifier}:${response.actionIdentifier}:${response.notification.date}`;
}

async function shouldHandleResponse(response: NotificationResponse): Promise<boolean> {
  const key = getResponseKey(response);
  const lastHandled = await AsyncStorage.getItem(LAST_HANDLED_RESPONSE_KEY);
  if (lastHandled === key) {
    return false;
  }
  await AsyncStorage.setItem(LAST_HANDLED_RESPONSE_KEY, key);
  return true;
}

async function openNotificationsScreen() {
  router.replace('/(tabs)/notifications' as Href);
}

export function useNotificationHandlers() {
  const { activateNotificationTab } = useNotificationTabContext();
  const handledInSessionRef = useRef(new Set<string>());

  useEffect(() => {
    if (isExpoGo || Platform.OS === 'web') return;

    const handleNotificationResponse = async (response: NotificationResponse) => {
      const key = getResponseKey(response);
      if (handledInSessionRef.current.has(key)) {
        return;
      }
      handledInSessionRef.current.add(key);

      const shouldHandle = await shouldHandleResponse(response);
      if (!shouldHandle) {
        return;
      }

      await recordNotificationToInbox(response.notification);
      void syncWidgetSnapshot();
      activateNotificationTab();
      await openNotificationsScreen();
    };

    const receivedSubscription = Notifications.addNotificationReceivedListener(async (event) => {
      await recordNotificationToInbox(event);
      void syncWidgetSnapshot();
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void handleNotificationResponse(response);
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        void handleNotificationResponse(response);
      }
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [activateNotificationTab]);
}
