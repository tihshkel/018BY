import { colors, createShadow, radii, sansFont } from '@/constants/design-tokens';
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
    ? `Новая версия уже в ${storeName}. Обновите приложение, чтобы получить исправления и улучшения.`
    : 'Новая версия уже скачана. Установите её сейчас — это займёт несколько секунд.';
  const primaryLabel = isStoreUpdate ? `Открыть ${storeName}` : 'Установить сейчас';
  const handlePrimaryPress = isStoreUpdate ? onOpenStore : onApplyOta;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onDismiss} accessibilityLabel="Закрыть" />
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>Обновление</Text>
              <Text style={styles.title}>{title}</Text>
            </View>
            <Pressable
              style={styles.closeButton}
              onPress={onDismiss}
              disabled={isApplyingOta}
              accessibilityRole="button"
              accessibilityLabel="Закрыть"
            >
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </Pressable>
          </View>

          <Text style={styles.subtitle}>{description}</Text>

          {isStoreUpdate ? (
            <View style={styles.versionBlock}>
              <Text style={styles.versionValue}>{prompt.latestVersion}</Text>
              <Text style={styles.versionHint}>
                сейчас у вас {prompt.currentVersion}
              </Text>
            </View>
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
            style={styles.laterButton}
            onPress={onDismiss}
            disabled={isApplyingOta}
            accessibilityRole="button"
            accessibilityLabel="Позже"
          >
            <Text style={styles.laterButtonText}>Позже</Text>
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
    paddingVertical: 28,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(45, 38, 32, 0.45)',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '400',
  },
  title: {
    fontSize: 26,
    color: colors.textPrimary,
    fontFamily: sansFont('bold'),
    fontWeight: '700',
    lineHeight: 32,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    marginBottom: 20,
  },
  versionBlock: {
    alignItems: 'center',
    marginBottom: 18,
    gap: 4,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  versionValue: {
    fontSize: 32,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    lineHeight: 36,
  },
  versionHint: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  laterButton: {
    marginTop: 14,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterButtonText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#B5A89A',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
  },
});
