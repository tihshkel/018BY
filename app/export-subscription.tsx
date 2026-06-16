import { colors, createShadow, radii, sansFont } from '@/constants/design-tokens';
import { APPLE_PURCHASE_HISTORY_URL } from '@/constants/subscription';
import { useExportSubscription } from '@/contexts/export-subscription-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfileSubscriptionStatusBadge } from '@/components/profile-subscription-status-badge';

function BenefitRow({ text }: { text: string }) {
  return (
    <View style={styles.benefitRow}>
      <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

export default function ExportSubscriptionScreen() {
  const opacity = useSharedValue(0);
  const {
    isSubscribed,
    isLoading: isSubscriptionLoading,
    isIapEnabled,
    priceLabel,
    purchase,
    restore,
    refresh,
  } = useExportSubscription();
  const [isRestoringPurchases, setIsRestoringPurchases] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
  }, [opacity]);

  useFocusEffect(
    useCallback(() => {
      if (isIapEnabled) {
        refresh();
      }
    }, [isIapEnabled, refresh])
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleRestorePurchases = async () => {
    setIsRestoringPurchases(true);
    try {
      const restored = await restore();
      Alert.alert(
        restored ? 'Готово' : 'Покупки не найдены',
        restored
          ? 'Доступ к экспорту для печати восстановлен.'
          : 'Покупка для этого Apple ID не найдена.'
      );
    } finally {
      setIsRestoringPurchases(false);
    }
  };

  const handlePurchase = async () => {
    setIsPurchasing(true);
    try {
      const ok = await purchase();
      if (ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Готово', 'Доступ к экспорту для печати активирован.');
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleOpenPurchaseHistory = () => {
    Linking.openURL(APPLE_PURCHASE_HISTORY_URL).catch(() => {});
  };

  const statusText = isSubscriptionLoading
    ? 'Проверяем статус…'
    : isSubscribed
      ? 'Куплено — PDF для твёрдой и мягкой обложки навсегда'
      : priceLabel
        ? `Не куплено · ${priceLabel} (один раз)`
        : 'Не куплено';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']} testID="export-subscription-screen">
      <Animated.View style={[styles.content, animatedStyle]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Экспорт для печати</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.heroCard}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logo}
              contentFit="contain"
            />
            <ProfileSubscriptionStatusBadge
              isPremium={isSubscribed}
              isLoading={isSubscriptionLoading}
            />
            <Text style={styles.statusText}>{statusText}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Что входит</Text>
            <BenefitRow text="PDF для печати в твёрдой обложке" />
            <BenefitRow text="PDF для печати в мягкой обложке" />
            <BenefitRow text="Электронная версия остаётся бесплатной" />
          </View>

          {isIapEnabled && !isSubscribed ? (
            <Pressable
              style={[styles.primaryButton, isPurchasing && styles.buttonDisabled]}
              onPress={handlePurchase}
              disabled={isPurchasing || isSubscriptionLoading}
            >
              {isPurchasing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Купить доступ{priceLabel ? ` · ${priceLabel}` : ''}
                </Text>
              )}
            </Pressable>
          ) : null}

          {isIapEnabled ? (
            <View style={styles.actionsCard}>
              <TouchableOpacity
                style={[styles.actionRow, styles.actionRowFirst]}
                onPress={handleRestorePurchases}
                disabled={isRestoringPurchases}
                activeOpacity={0.7}
              >
                <View style={styles.actionIcon}>
                  <Ionicons name="refresh-outline" size={24} color={colors.primary} />
                </View>
                <Text style={styles.actionText}>
                  {isRestoringPurchases ? 'Восстановление…' : 'Восстановить покупки'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionRow}
                onPress={handleOpenPurchaseHistory}
                activeOpacity={0.7}
              >
                <View style={styles.actionIcon}>
                  <Ionicons name="receipt-outline" size={24} color={colors.primary} />
                </View>
                <Text style={styles.actionText}>История покупок Apple ID</Text>
                <Ionicons name="open-outline" size={18} color={colors.tabInactive} />
              </TouchableOpacity>
            </View>
          ) : null}

          {Platform.OS === 'ios' && isIapEnabled ? (
            <Text style={styles.legal}>
              Разовая оплата через Apple ID. Доступ сохраняется на этом Apple ID; при смене
              устройства используйте «Восстановить покупки».
            </Text>
          ) : null}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    color: colors.textPrimary,
    fontFamily: sansFont('bold'),
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  heroCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 16,
    marginBottom: 16,
  },
  statusText: {
    marginTop: 14,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
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
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  actionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionRowFirst: {
    borderTopWidth: 0,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  legal: {
    marginTop: 20,
    fontSize: 12,
    lineHeight: 18,
    color: '#B5A89A',
    textAlign: 'center',
  },
});
