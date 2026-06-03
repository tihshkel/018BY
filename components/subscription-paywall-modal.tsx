import { useExportSubscription } from '@/contexts/export-subscription-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
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
  const priceText = priceLabel ?? 'разовая покупка';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={styles.title}>Экспорт для печати</Text>
          <Text style={styles.subtitle}>
            Разовая покупка открывает экспорт PDF для твёрдой и мягкой обложки — готово для
            типографии. Платите один раз, без ежемесячных списаний.
          </Text>

          <View style={styles.benefits}>
            <BenefitRow text="PDF для печати в твёрдой обложке" />
            <BenefitRow text="PDF для печати в мягкой обложке" />
            <BenefitRow text="Электронная версия остаётся бесплатной" />
          </View>

          <Text style={styles.price}>{priceText} · один раз</Text>

          <Pressable
            style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
            onPress={handlePurchase}
            disabled={isBusy}
          >
            {busy === 'purchase' ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Купить доступ</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={handleRestore}
            disabled={isBusy}
          >
            {busy === 'restore' ? (
              <ActivityIndicator color="#8B6F5F" />
            ) : (
              <Text style={styles.secondaryButtonText}>Восстановить покупки</Text>
            )}
          </Pressable>

          <Pressable style={styles.tertiaryButton} onPress={onClose} disabled={isBusy}>
            <Text style={styles.tertiaryButtonText}>Позже</Text>
          </Pressable>

          {Platform.OS === 'ios' ? (
            <Text style={styles.legal}>
              Разовая оплата через Apple ID. Доступ сохраняется на этом Apple ID; при смене
              устройства используйте «Восстановить покупки».
            </Text>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function BenefitRow({ text }: { text: string }) {
  return (
    <View style={styles.benefitRow}>
      <Ionicons name="checkmark-circle" size={18} color="#C9A89A" />
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FAF8F5',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0E8E0',
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#8B6F5F',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#9B8E7F',
    textAlign: 'center',
    marginBottom: 20,
  },
  benefits: {
    alignSelf: 'stretch',
    gap: 10,
    marginBottom: 20,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    color: '#5B4D3F',
    lineHeight: 20,
  },
  price: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B6F5F',
    marginBottom: 16,
  },
  primaryButton: {
    alignSelf: 'stretch',
    backgroundColor: '#C9A89A',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  secondaryButton: {
    alignSelf: 'stretch',
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 4,
  },
  secondaryButtonText: {
    color: '#8B6F5F',
    fontSize: 15,
    fontWeight: '500',
  },
  tertiaryButton: {
    paddingVertical: 8,
  },
  tertiaryButtonText: {
    color: '#9B8E7F',
    fontSize: 15,
  },
  legal: {
    marginTop: 12,
    fontSize: 11,
    lineHeight: 16,
    color: '#B5A89A',
    textAlign: 'center',
  },
});
