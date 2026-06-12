import { colors, createShadow, radii, sansFont } from '@/constants/design-tokens';
import { useExportSubscription } from '@/contexts/export-subscription-context';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Закрыть" />
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>Разовая покупка</Text>
              <Text style={styles.title}>Экспорт для печати</Text>
            </View>
            <Pressable
              style={styles.closeButton}
              onPress={onClose}
              disabled={isBusy}
              accessibilityRole="button"
              accessibilityLabel="Закрыть"
            >
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </Pressable>
          </View>

          <Text style={styles.subtitle}>
            PDF для типографии — твёрдая и мягкая обложка. Без подписки и ежемесячных списаний.
          </Text>

          <View style={styles.benefitsList}>
            {BENEFITS.map((text) => (
              <BenefitRow key={text} text={text} />
            ))}
          </View>

          <View style={styles.priceBlock}>
            <Text style={styles.priceValue}>{priceText}</Text>
            <Text style={styles.priceHint}>один раз · навсегда на этом Apple ID</Text>
          </View>

          <Pressable
            style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
            onPress={handlePurchase}
            disabled={isBusy}
            accessibilityRole="button"
            accessibilityLabel="Купить доступ"
          >
            {busy === 'purchase' ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Купить доступ</Text>
            )}
          </Pressable>

          <Pressable
            style={[styles.restoreButton, isBusy && styles.buttonDisabled]}
            onPress={handleRestore}
            disabled={isBusy}
            accessibilityRole="button"
            accessibilityLabel="Восстановить покупки"
          >
            {busy === 'restore' ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Text style={styles.restoreButtonText}>Восстановить покупки</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.laterButton}
            onPress={onClose}
            disabled={isBusy}
            accessibilityRole="button"
            accessibilityLabel="Позже"
          >
            <Text style={styles.laterButtonText}>Позже</Text>
          </Pressable>

          {Platform.OS === 'ios' ? (
            <Text style={styles.legal}>
              Оплата через Apple ID. При смене устройства нажмите «Восстановить покупки».
            </Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function BenefitRow({ text }: { text: string }) {
  return (
    <View style={styles.benefitRow}>
      <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
      <Text style={styles.benefitText}>{text}</Text>
    </View>
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
  benefitsList: {
    gap: 12,
    marginBottom: 22,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    color: '#5B4D3F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '400',
  },
  priceBlock: {
    alignItems: 'center',
    marginBottom: 18,
    gap: 4,
  },
  priceValue: {
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
  priceHint: {
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
  buttonDisabled: {
    opacity: 0.6,
  },
  restoreButton: {
    marginTop: 14,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restoreButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  laterButton: {
    marginTop: 6,
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
  legal: {
    marginTop: 16,
    fontSize: 11,
    lineHeight: 16,
    color: '#C4B8AC',
    textAlign: 'center',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
  },
});
