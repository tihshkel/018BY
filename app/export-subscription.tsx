import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { AppButton, AppScreen, AppText } from '@/components/ui';
import { AuthErrorBanner } from '@/components/auth/auth-error-banner';
import { ProfileSubscriptionStatusBadge } from '@/components/profile-subscription-status-badge';
import { colors } from '@/constants/design-tokens';
import { APPLE_PURCHASE_HISTORY_URL } from '@/constants/subscription';
import { useExportSubscription } from '@/contexts/export-subscription-context';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
function Benefit({
  icon,
  title,
  description,
}: {
  icon: IconName;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.benefit}>
      <View style={styles.benefitIcon}>
        <Ionicons name={icon} size={22} color="#B36D80" />
      </View>
      <View style={styles.benefitCopy}>
        <AppText style={styles.benefitTitle}>{title}</AppText>
        <AppText style={styles.benefitDescription}>{description}</AppText>
      </View>
    </View>
  );
}

export default function ExportSubscriptionScreen() {
  const {
    isUnlocked,
    isLoading,
    isIapEnabled,
    priceLabel,
    storeError,
    purchaseBlocked,
    purchase,
    restore,
    refresh,
  } = useExportSubscription();
  const [action, setAction] = useState<'purchase' | 'restore' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const lock = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (isIapEnabled) void refresh();
    }, [isIapEnabled, refresh]),
  );
  const busy = isLoading || action !== null;
  const available = isUnlocked || !isIapEnabled;
  const runAction = async (kind: 'purchase' | 'restore') => {
    if (lock.current || isLoading) return;
    lock.current = true;
    setAction(kind);
    setActionError(null);
    try {
      if (kind === 'restore') await restore();
      else if (await purchase()) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        Alert.alert('Всё готово', 'Экспорт для печати теперь доступен для ваших альбомов.');
      }
    } catch {
      setActionError('Не удалось связаться с магазином. Попробуйте ещё раз.');
    } finally {
      lock.current = false;
      setAction(null);
    }
  };

  return (
    <AppScreen scroll style={styles.screen}>
      <View style={styles.wrap} testID="export-subscription-screen">
        <View style={styles.header}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Назад"
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <AppText style={styles.headerTitle}>Мой доступ</AppText>
          <View style={styles.headerDot}>
            <Ionicons name="heart-outline" size={19} color="#B36D80" />
          </View>
        </View>
        <View style={styles.hero}>
          <View
            style={styles.albumArt}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Image
              source={require('@/assets/images/illustrations/print-memories-unicorn.png')}
              style={styles.heroImage}
              contentFit="contain"
            />
          </View>
          <ProfileSubscriptionStatusBadge
            isPremium={available}
            isIapEnabled={isIapEnabled}
            isLoading={isLoading}
          />
          <AppText accessibilityRole="header" style={styles.title}>
            {isLoading
              ? 'Ваши воспоминания\nближе, чем кажется'
              : available
                ? 'Истории, которые\nможно обнять'
                : 'Из любимых моментов —\nв настоящий альбом'}
          </AppText>
          <AppText style={styles.subtitle}>
            {isLoading
              ? 'Проверяем доступ к экспорту для печати…'
              : available
                ? 'Экспорт для печати открыт. Превратите ваши воспоминания в альбом, который всегда рядом.'
                : 'Оформляйте страницы в приложении и сохраняйте готовый PDF для печати.'}
          </AppText>
        </View>
        <View style={styles.details}>
          <View style={styles.sectionHeader}>
            <AppText style={styles.sectionTitle}>Экспорт для печати</AppText>
            <Ionicons name="albums-outline" size={20} color="#AC8790" />
          </View>
          <Benefit
            icon="book-outline"
            title="Твёрдая обложка"
            description="PDF для альбома, который сохранится на годы"
          />
          <Benefit
            icon="layers-outline"
            title="Мягкая обложка"
            description="Ещё один формат для ваших историй"
          />
          <Benefit
            icon="phone-portrait-outline"
            title="Электронная версия"
            description="Всегда доступна бесплатно"
          />
        </View>
        <View style={[styles.accessCard, available && styles.accessCardOpen]}>
          <View style={styles.accessTop}>
            <View style={styles.benefitCopy}>
              <AppText style={styles.accessTitle}>
                {!isIapEnabled
                  ? 'Доступно бесплатно'
                  : isLoading
                    ? 'Проверяем покупку'
                    : isUnlocked
                      ? 'Ваш доступ активен'
                      : 'Одна покупка. Навсегда.'}
              </AppText>
              <AppText style={styles.accessDescription}>
                {isIapEnabled
                  ? 'Без подписки и ежемесячных списаний'
                  : 'PDF для твёрдой и мягкой обложки'}
              </AppText>
            </View>
            {isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : available ? (
              <Ionicons name="checkmark-circle" size={28} color="#668576" />
            ) : null}
          </View>
          {isIapEnabled && !isUnlocked && !isLoading ? (
            <AppText style={styles.price}>{priceLabel ?? 'Цена пока недоступна'}</AppText>
          ) : null}
          {storeError || actionError ? (
            <AuthErrorBanner message={actionError ?? storeError ?? ''} />
          ) : null}
          {isIapEnabled && !isUnlocked ? (
            <AppButton
              testID="print-unlock-purchase"
              title={priceLabel ? `Открыть доступ · ${priceLabel}` : 'Загрузка цены…'}
              loading={action === 'purchase' || isLoading}
              disabled={busy || !priceLabel || purchaseBlocked}
              onPress={() => void runAction('purchase')}
            />
          ) : null}
          {isIapEnabled && (storeError || (!priceLabel && !isLoading && !isUnlocked)) ? (
            <AppButton
              title="Обновить статус и цену"
              variant="outline"
              disabled={busy}
              onPress={() => {
                setActionError(null);
                void refresh();
              }}
            />
          ) : null}
          {available && !isLoading ? (
            <AppText style={styles.activeNote}>
              {isIapEnabled
                ? 'Покупка привязана к вашему аккаунту 018BY. Выбирайте альбом и переходите к экспорту.'
                : 'Выбирайте альбом и сохраняйте его в нужном формате.'}
            </AppText>
          ) : null}
        </View>
        {isIapEnabled ? (
          <View style={styles.actions}>
            <Pressable
              style={styles.actionRow}
              onPress={() => void runAction('restore')}
              disabled={busy}
              testID="print-unlock-restore"
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
            >
              <Ionicons name="refresh-outline" size={20} color="#8D7781" />
              <AppText style={styles.actionText}>
                {action === 'restore' ? 'Восстанавливаем…' : 'Восстановить покупки'}
              </AppText>
              {action === 'restore' ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={17} color="#B5A3AA" />
              )}
            </Pressable>
            <View style={styles.separator} />
            <Pressable
              style={styles.actionRow}
              accessibilityRole="link"
              onPress={() => {
                void Linking.openURL(APPLE_PURCHASE_HISTORY_URL).catch(() =>
                  setActionError('Не удалось открыть историю покупок. Попробуйте позже.'),
                );
              }}
            >
              <Ionicons name="receipt-outline" size={20} color="#8D7781" />
              <AppText style={styles.actionText}>История покупок Apple ID</AppText>
              <Ionicons name="open-outline" size={17} color="#B5A3AA" />
            </Pressable>
          </View>
        ) : null}
        {Platform.OS === 'ios' && isIapEnabled ? (
          <AppText style={styles.legal}>
            Разовая оплата через Apple ID. При смене устройства войдите с тем же Apple ID и нажмите
            «Восстановить покупки».
          </AppText>
        ) : null}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#FFFAFB' },
  wrap: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingBottom: 24,
    gap: 20,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 10 },
  back: {
    width: 44,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: '#46333D' },
  headerDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FBECEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: { alignItems: 'center', paddingBottom: 6, gap: 16 },
  albumArt: {
    width: 228,
    height: 210,
    maxWidth: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  heroImage: { width: '100%', height: '100%' },
  title: {
    fontSize: 29,
    lineHeight: 35,
    textAlign: 'center',
    letterSpacing: -0.8,
    color: '#40343B',
    fontWeight: '700',
  },
  subtitle: { fontSize: 14, lineHeight: 22, textAlign: 'center', color: '#8A7780', maxWidth: 370 },
  details: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1E5E9',
    gap: 21,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: '#46333D' },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  benefitIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFF4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitCopy: { flex: 1, gap: 4 },
  benefitTitle: { fontSize: 15, fontWeight: '600', color: '#54444C' },
  benefitDescription: { fontSize: 12, lineHeight: 18, color: '#95838B' },
  accessCard: { padding: 20, borderRadius: 24, backgroundColor: '#FCEEF2', gap: 16 },
  accessCardOpen: { backgroundColor: '#F0F5F1' },
  accessTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  accessTitle: { fontSize: 17, lineHeight: 23, fontWeight: '600', color: '#46333D' },
  accessDescription: { fontSize: 12, lineHeight: 18, color: '#8B7881' },
  price: { fontSize: 29, lineHeight: 36, fontWeight: '700', color: '#59404C' },
  activeNote: { fontSize: 13, lineHeight: 20, color: '#6C8274' },
  actions: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#F1E5E9',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 58,
    paddingVertical: 12,
  },
  actionText: { flex: 1, fontSize: 14, color: '#6C5862' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#EEE3E7' },
  legal: {
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    color: '#A08D96',
    paddingHorizontal: 8,
  },
});
