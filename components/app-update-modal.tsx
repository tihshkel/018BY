import type { AppUpdatePrompt } from '@/hooks/use-app-updates';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type AppUpdateModalProps = {
  prompt: AppUpdatePrompt | null;
  isApplyingOta: boolean;
  onDismiss: () => void;
  onOpenStore: () => void;
  onApplyOta: () => void;
};

export function AppUpdateModal({
  prompt,
  isApplyingOta,
  onDismiss,
  onOpenStore,
  onApplyOta,
}: AppUpdateModalProps) {
  if (!prompt) return null;

  const isStoreUpdate = prompt.kind === 'store';
  const storeName = Platform.OS === 'android' ? 'Google Play' : 'App Store';
  const title = isStoreUpdate ? 'Доступно обновление' : 'Обновление готово';
  const description = isStoreUpdate
    ? `В ${storeName} уже есть версия ${prompt.latestVersion}. Обновите приложение, чтобы получить новые функции и исправления.`
    : 'Новая версия приложения уже скачана. Установите её сейчас — это займёт несколько секунд.';
  const primaryLabel = isStoreUpdate ? `Обновить в ${storeName}` : 'Установить сейчас';
  const handlePrimaryPress = isStoreUpdate ? onOpenStore : onApplyOta;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onDismiss} accessibilityLabel="Закрыть" />
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="arrow-up-circle-outline" size={28} color="#8B6F5F" />
          </View>

          <Text style={styles.eyebrow}>Обновление</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          {isStoreUpdate ? (
            <Text style={styles.versionMeta}>
              Текущая версия {prompt.currentVersion}
            </Text>
          ) : null}

          <Pressable
            style={[styles.primaryButton, isApplyingOta && styles.buttonDisabled]}
            onPress={handlePrimaryPress}
            disabled={isApplyingOta}
            accessibilityRole="button"
            accessibilityLabel={primaryLabel}
          >
            {isApplyingOta ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={onDismiss}
            disabled={isApplyingOta}
            accessibilityRole="button"
            accessibilityLabel="Позже"
          >
            <Text style={styles.secondaryButtonText}>Позже</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(45, 35, 30, 0.42)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    borderWidth: 1,
    borderColor: '#F0E8E0',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 8,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '500',
    marginBottom: 6,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    marginBottom: 12,
  },
  versionMeta: {
    fontSize: 13,
    lineHeight: 18,
    color: '#B5A89A',
    marginBottom: 18,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
  },
  primaryButton: {
    backgroundColor: '#8B6F5F',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginBottom: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: '#9B8E7F',
    fontSize: 15,
    fontWeight: '500',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
  },
});
