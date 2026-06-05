import { getNotificationInbox, type NotificationInboxItem } from '@/utils/notificationInbox';
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
import { SafeAreaView } from 'react-native-safe-area-context';

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
          <Ionicons name="notifications-outline" size={20} color="#C9A89A" />
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
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadInbox();
    }, [loadInbox])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>История уведомлений</Text>
        <Text style={styles.headerSubtitle}>Все полученные push-уведомления</Text>
      </View>

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
            <Ionicons name="notifications-off-outline" size={48} color="#D4C4B5" />
            <Text style={styles.emptyTitle}>Уведомлений пока нет</Text>
            <Text style={styles.emptyText}>
              Когда вы получите напоминание, оно появится здесь
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  headerSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#9B8E7F',
    lineHeight: 20,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 112,
    gap: 12,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F0EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTime: {
    fontSize: 12,
    color: '#9B8E7F',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B5D4F',
    marginBottom: 4,
  },
  cardBody: {
    fontSize: 14,
    color: '#8B6F5F',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#8B6F5F',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#9B8E7F',
    textAlign: 'center',
    lineHeight: 20,
  },
});
