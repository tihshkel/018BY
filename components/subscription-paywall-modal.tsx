import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import {
  AppButton,
  AppCenterModal,
  AppText,
} from '@/components/ui';
import { colors, spacing } from '@/constants/design-tokens';
import { useExportSubscription } from '@/contexts/export-subscription-context';

type SubscriptionPaywallModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubscribed?: () => void;
};

const BENEFITS = [
  'PDF для печати в твёрдой обложке',
  'PDF для печати в мягкой обложке',
  'Электронная версия остаётся бесплатной',
] as const;

export function SubscriptionPaywallModal({
  visible,
  onClose,
  onSubscribed,
}: SubscriptionPaywallModalProps) {
  const { priceLabel, purchase, restore, isLoading } = useExportSubscription();
  const [busy, setBusy] = useState<'purchase' | 'restore' | null>(null);

  const handlePurchase = async () => {
    setBusy('purchase');
    try {
      const ok = await purchase();
      if (ok) {
        onSubscribed?.();
        onClose();
      }
    } finally {
      setBusy(null);
    }
  };

  const handleRestore = async () => {
    setBusy('restore');
    try {
      const ok = await restore();
      if (ok) {
        onSubscribed?.();
        onClose();
      }
    } finally {
      setBusy(null);
    }
  };

  const isBusy = busy !== null || isLoading;
  const priceText = priceLabel ?? '—';

  return (
    <AppCenterModal
      visible={visible}
      onClose={onClose}
      title="Экспорт для печати"
      subtitle="Разовая покупка · PDF для типографии"
      dismissOnBackdrop={!isBusy}
      footer={
        <View style={styles.footer}>
          <AppButton
            title={`Купить доступ${priceLabel ? ` · ${priceLabel}` : ''}`}
            onPress={handlePurchase}
            loading={busy === 'purchase'}
            disabled={isBusy}
          />
          <AppButton
            title="Восстановить покупки"
            variant="outline"
            onPress={handleRestore}
            loading={busy === 'restore'}
            disabled={isBusy}
          />
          <AppButton title="Позже" variant="ghost" onPress={onClose} disabled={isBusy} />
        </View>
      }
    >
      <AppText variant="bodySm" style={styles.intro}>
        PDF для твёрдой и мягкой обложки. Без подписки и ежемесячных списаний.
      </AppText>

      <View style={styles.benefitsList}>
        {BENEFITS.map((text) => (
          <BenefitRow key={text} text={text} />
        ))}
      </View>

      <View style={styles.priceBlock}>
        <AppText variant="display" style={styles.priceValue}>
          {priceText}
        </AppText>
        <AppText variant="caption" style={styles.priceHint}>
          один раз · навсегда на этом Apple ID
        </AppText>
      </View>

      {Platform.OS === 'ios' ? (
        <AppText variant="caption" style={styles.legal}>
          Оплата через Apple ID. При смене устройства нажмите «Восстановить покупки».
        </AppText>
      ) : null}
    </AppCenterModal>
  );
}

function BenefitRow({ text }: { text: string }) {
  return (
    <View style={styles.benefitRow}>
      <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
      <AppText variant="bodySm" style={styles.benefitText}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: {
    marginBottom: spacing.md,
  },
  benefitsList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  benefitText: {
    flex: 1,
    color: colors.textPrimary,
  },
  priceBlock: {
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: 4,
  },
  priceValue: {
    fontSize: 28,
    lineHeight: 34,
  },
  priceHint: {
    textAlign: 'center',
  },
  legal: {
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  footer: {
    gap: spacing.sm,
  },
});
