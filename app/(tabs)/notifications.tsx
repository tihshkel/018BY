import { AppHeader, AppScreen, AppText } from '@/components/ui';
import { colors, createShadow, radii, sansFont } from '@/constants/design-tokens';
import { getNotificationInbox, type NotificationInboxItem } from '@/utils/notificationInbox';
import { syncWidgetSnapshot } from '@/utils/widgetSnapshot';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

function formatReceivedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function NotificationRow({ item }: { item: NotificationInboxItem }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconWrap}>
          <Ionicons name="notifications-outline" size={20} color={colors.primary} />
        </View>
        <Text style={styles.cardTime}>{formatReceivedAt(item.receivedAt)}</Text>
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
      {item.body ? <Text style={styles.cardBody}>{item.body}</Text> : null}
    </View>
  );
}

export default function NotificationsScreen() {
  const [items, setItems] = useState<NotificationInboxItem[]>([]);

  const loadInbox = useCallback(async () => {
    const inbox = await getNotificationInbox();
    setItems(inbox);
    void syncWidgetSnapshot();
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadInbox();
    }, [loadInbox])
  );

  return (
    <AppScreen tabletShell contentMaxWidth={640} edges={['top']}>
      <AppHeader title="История уведомлений" showBack={false} />
      <AppText variant="bodySm" style={styles.headerSubtitle}>
        Все полученные push-уведомления
      </AppText>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotificationRow item={item} />}
        contentContainerStyle={[
          styles.listContent,
          items.length === 0 ? styles.listContentEmpty : null,
        ]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={48} color={colors.tabInactive} />
            <Text style={styles.emptyTitle}>Уведомлений пока нет</Text>
            <Text style={styles.emptyText}>
              Когда вы получите напоминание, оно появится здесь
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  headerSubtitle: {
    color: colors.textSecondary,
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 24,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: 16,
    marginBottom: 12,
    ...createShadow('sm'),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTime: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: sansFont('regular'),
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    marginBottom: 4,
  },
  cardBody: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
  },
});
