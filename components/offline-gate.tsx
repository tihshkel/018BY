import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Network from 'expo-network';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Modal, StyleSheet, View } from 'react-native';
import { AppButton, AppScreen, AppText } from '@/components/ui';
import { checkInternetConnection, isNetworkDisconnected } from '@/utils/network-status';

/** Keep navigation and unsaved form state mounted while connectivity is restored. */
export function OfflineGate() {
  const [offline, setOffline] = useState(false);
  const [checking, setChecking] = useState(false);
  const [retried, setRetried] = useState(false);
  const mounted = useRef(false);
  const generation = useRef(0);
  const pending = useRef<Promise<void> | null>(null);

  const check = useCallback(() => {
    if (pending.current) return pending.current;
    const current = generation.current;
    setChecking(true);
    const task = checkInternetConnection()
      .then((online) => {
        if (mounted.current && current === generation.current) setOffline(!online);
      })
      .finally(() => {
        pending.current = null;
        if (mounted.current) setChecking(false);
      });
    pending.current = task;
    return task;
  }, []);

  useEffect(() => {
    mounted.current = true;
    void check();
    const network = Network.addNetworkStateListener((state) => {
      if (isNetworkDisconnected(state)) {
        generation.current++;
        setOffline(true);
      } else {
        if (pending.current)
          void pending.current.then(() => {
            if (mounted.current) void check();
          });
        else void check();
      }
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => {
      mounted.current = false;
      // This is a request counter, not a DOM ref. Invalidate checks from the previous mount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
      network.remove();
      appState.remove();
    };
  }, [check]);

  useEffect(() => {
    if (!offline) {
      setRetried(false);
      return;
    }
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void check();
    }, 12000);
    return () => clearInterval(timer);
  }, [offline, check]);

  return (
    <Modal
      visible={offline}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={() => {}}
    >
      <OfflineScreen
        checking={checking}
        retried={retried}
        onRetry={() => {
          setRetried(true);
          void check();
        }}
      />
    </Modal>
  );
}

export function OfflineScreen({
  checking,
  retried,
  onRetry,
}: {
  checking: boolean;
  retried: boolean;
  onRetry: () => void;
}) {
  return (
    <AppScreen scroll style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.content} testID="offline-screen">
        <AppText style={styles.brand}>018BY</AppText>
        <View style={styles.art}>
          <Image
            source={require('@/assets/images/illustrations/offline-unicorn.png')}
            style={styles.image}
            contentFit="contain"
            accessibilityLabel="Единорог с альбомом ждёт подключения к облаку"
          />
        </View>
        <View style={styles.pill}>
          <Ionicons name="cloud-offline-outline" size={16} color="#A5556B" />
          <AppText variant="caption" style={styles.pillText}>
            Нет соединения
          </AppText>
        </View>
        <AppText accessibilityRole="header" style={styles.title}>
          Давайте вернёмся{'\n'}на связь
        </AppText>
        <AppText style={styles.description}>
          Для работы приложения нужен интернет.{'\n'}Подключитесь к Wi-Fi или мобильной сети — и
          продолжим вашу историю.
        </AppText>
        <View style={styles.actions}>
          <AppButton
            title="Попробовать снова"
            testID="offline-retry"
            loading={checking}
            onPress={onRetry}
          />
          <AppText accessibilityLiveRegion="polite" style={styles.hint}>
            {retried && !checking
              ? 'Соединения пока нет. Проверьте настройки сети.'
              : 'Продолжим автоматически, когда появится связь.'}
          </AppText>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#FFF9FA' },
  container: { flexGrow: 1, justifyContent: 'center' },
  content: { width: '100%', maxWidth: 470, alignSelf: 'center', alignItems: 'center', padding: 28 },
  brand: { letterSpacing: 3, fontSize: 15, fontWeight: '700', color: '#8C727B', marginBottom: 18 },
  art: { width: '100%', maxWidth: 290, aspectRatio: 1, marginBottom: 18 },
  image: { width: '100%', height: '100%' },
  pill: {
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
    backgroundColor: '#FBECEF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 30,
  },
  pillText: { color: '#A5556B', fontWeight: '500' },
  title: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.8,
    fontWeight: '700',
    textAlign: 'center',
    color: '#40343B',
    marginTop: 20,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    color: '#887780',
    marginTop: 16,
  },
  actions: { width: '100%', marginTop: 30, gap: 14 },
  hint: { fontSize: 12, lineHeight: 18, color: '#9B858E', textAlign: 'center' },
});
