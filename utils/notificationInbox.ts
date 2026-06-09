import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Notification } from 'expo-notifications';

export type NotificationInboxItem = {
  id: string;
  title: string;
  body: string;
  receivedAt: string;
  source: 'local' | 'remote';
};

const INBOX_STORAGE_KEY = '@notification_inbox';
const MAX_INBOX_ITEMS = 200;

function parseInbox(raw: string | null): NotificationInboxItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is NotificationInboxItem =>
        typeof item === 'object' &&
        item != null &&
        typeof (item as NotificationInboxItem).id === 'string' &&
        typeof (item as NotificationInboxItem).title === 'string' &&
        typeof (item as NotificationInboxItem).body === 'string' &&
        typeof (item as NotificationInboxItem).receivedAt === 'string'
    );
  } catch {
    return [];
  }
}

async function saveInbox(items: NotificationInboxItem[]): Promise<void> {
  await AsyncStorage.setItem(INBOX_STORAGE_KEY, JSON.stringify(items.slice(0, MAX_INBOX_ITEMS)));
}

export async function getNotificationInbox(): Promise<NotificationInboxItem[]> {
  const raw = await AsyncStorage.getItem(INBOX_STORAGE_KEY);
  return parseInbox(raw);
}

export async function appendNotificationToInbox(
  item: NotificationInboxItem
): Promise<NotificationInboxItem[]> {
  const existing = await getNotificationInbox();
  if (existing.some((entry) => entry.id === item.id)) {
    return existing;
  }

  const next = [item, ...existing].slice(0, MAX_INBOX_ITEMS);
  await saveInbox(next);
  return next;
}

export async function clearNotificationInbox(): Promise<void> {
  await AsyncStorage.removeItem(INBOX_STORAGE_KEY);
}

function inferSource(notification: Notification): 'local' | 'remote' {
  const trigger = notification.request.trigger;
  if (trigger && typeof trigger === 'object' && 'type' in trigger) {
    const triggerType = String((trigger as { type?: string }).type ?? '');
    if (triggerType === 'push') return 'remote';
  }
  return 'local';
}

export function notificationToInboxItem(notification: Notification): NotificationInboxItem {
  const content = notification.request.content;
  const deliveryMs =
    typeof notification.date === 'number' && Number.isFinite(notification.date)
      ? notification.date
      : Date.now();
  const baseId = notification.request.identifier || 'notification';
  const id = `${baseId}_${deliveryMs}`;

  return {
    id,
    title: content.title ?? 'Уведомление',
    body: content.body ?? '',
    receivedAt: new Date(deliveryMs).toISOString(),
    source: inferSource(notification),
  };
}

export async function recordNotificationToInbox(
  notification: Notification
): Promise<NotificationInboxItem[]> {
  return appendNotificationToInbox(notificationToInboxItem(notification));
}
