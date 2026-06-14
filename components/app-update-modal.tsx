import type { AppUpdatePrompt } from '@/hooks/use-app-updates';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { AppButton, AppCenterModal, AppText } from '@/components/ui';
import { colors, spacing } from '@/constants/design-tokens';

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
    <AppCenterModal
      visible
      onClose={onDismiss}
      title={title}
      subtitle="Обновление"
      dismissOnBackdrop={!isApplyingOta}
      footer={
        <View style={styles.footer}>
          <AppButton
            title={primaryLabel}
            onPress={handlePrimaryPress}
            loading={isApplyingOta}
            disabled={isApplyingOta}
          />
          <AppButton
            title="Позже"
            variant="ghost"
            onPress={onDismiss}
            disabled={isApplyingOta}
          />
        </View>
      }
    >
      <AppText variant="bodySm" style={styles.description}>
        {description}
      </AppText>

      {isStoreUpdate ? (
        <View style={styles.versionBlock}>
          <AppText variant="titleSm">{prompt.latestVersion}</AppText>
          <AppText variant="caption">сейчас у вас {prompt.currentVersion}</AppText>
        </View>
      ) : null}
    </AppCenterModal>
  );
}

const styles = StyleSheet.create({
  description: {
    marginBottom: spacing.md,
  },
  versionBlock: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  footer: {
    gap: spacing.sm,
  },
});
