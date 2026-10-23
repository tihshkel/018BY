import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton, AppCenterModal, AppText } from '@/components/ui';
import { PURCHASE_SUPPORT_URL } from '@/constants/subscription';
import { useExportSubscription } from '@/contexts/export-subscription-context';

type SubscriptionPaywallModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubscribed?: () => void;
};

export function SubscriptionPaywallModal({ visible, onClose, onSubscribed }: SubscriptionPaywallModalProps) {
  const { priceLabel, purchase, restore, refresh, storeError, isLoading, loadingAction, isUnlocked, purchaseBlocked, purchaseBlockReason } = useExportSubscription();
  const [busy, setBusy] = useState<'purchase' | 'restore' | 'refresh' | 'support' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const lock = useRef(false);
  const delivered = useRef(false);
  useEffect(() => {
    if (!visible) {
      delivered.current = false;
      setActionError(null);
    } else if (isUnlocked && !delivered.current) {
      delivered.current = true;
      onSubscribed?.();
      onClose();
    }
  }, [visible, isUnlocked, onSubscribed, onClose]);

  const isBusy = busy !== null || isLoading;
  const close = () => { if (!isBusy && !lock.current) onClose(); };
  const run = async (kind: 'purchase' | 'restore' | 'refresh' | 'support') => {
    if (lock.current || isLoading || (kind === 'purchase' && (purchaseBlocked || !priceLabel))) return;
    lock.current = true;
    setBusy(kind);
    setActionError(null);
    try {
      if (kind === 'purchase') await purchase();
      else if (kind === 'restore') await restore();
      else if (kind === 'support') await Linking.openURL(PURCHASE_SUPPORT_URL);
      else await refresh();
    } catch {
      setActionError(kind === 'support' ? 'Не удалось открыть сайт. Попробуйте ещё раз.' : 'Нет связи с App Store. Попробуйте ещё раз.');
    } finally {
      lock.current = false;
      setBusy(null);
    }
  };

  const legacy = purchaseBlockReason === 'legacy-purchase';
  const restoreRequired = purchaseBlockReason === 'restore-required';
  const otherAccount = purchaseBlockReason === 'other-account';
  const needsLogin = purchaseBlockReason === 'sign-in-required';
  const ownershipIssue = legacy || otherAccount || restoreRequired;
  const blocked = !!purchaseBlocked;
  const statusText = restoreRequired
    ? 'Покупка найдена. Восстановите доступ в этом аккаунте и продолжайте оформлять альбом. Повторная оплата не потребуется.'
    : legacy
    ? 'App Store вернул покупку без привязки к аккаунту 018BY. Для подтверждения владельца обратитесь в поддержку с квитанцией Apple. Повторно платить не нужно.'
    : otherAccount
      ? 'Доступ куплен в другом аккаунте 018BY. Войдите в него, чтобы экспортировать альбом. Если нужна помощь — обратитесь в поддержку.'
      : needsLogin
        ? 'Войдите в 018BY, чтобы сохранить покупку в своём аккаунте.'
        : blocked
          ? 'Сейчас покупка недоступна. Проверьте доступ и попробуйте позже.'
          : null;
  const errorText = actionError ?? (!blocked && !isLoading ? storeError : null);
  const openLogin = () => {
    if (isBusy || lock.current) return;
    onClose();
    router.push('/login');
  };

  return (
    <AppCenterModal
      visible={visible}
      onClose={close}
      title={restoreRequired ? 'Восстановить доступ' : ownershipIssue ? 'Покупка уже есть' : needsLogin ? 'Нужен вход' : 'Экспорт Pro'}
      dismissOnBackdrop={!isBusy}
      showClose={!isBusy}
      scroll
      contentContainerStyle={styles.body}
      footer={
        <View style={styles.footer}>
          <AppButton
            title={restoreRequired ? 'Восстановить доступ' : needsLogin ? 'Войти в аккаунт' : otherAccount ? 'Войти в другой аккаунт' : legacy ? 'Связаться с поддержкой' : blocked || !priceLabel ? isLoading ? 'Загружаем цену…' : 'Проверить доступ' : `Открыть Pro · ${priceLabel}`}
            onPress={needsLogin || otherAccount ? openLogin : () => void run(restoreRequired ? 'restore' : legacy ? 'support' : blocked || !priceLabel ? 'refresh' : 'purchase')}
            loading={busy === 'purchase' || busy === 'refresh' || busy === 'support' || (restoreRequired && (busy === 'restore' || loadingAction === 'restore')) || (isLoading && loadingAction !== 'restore')}
            disabled={isBusy}
            style={styles.primary}
            testID={restoreRequired ? 'print-unlock-restore-access' : needsLogin || otherAccount ? 'print-unlock-login' : legacy ? 'print-unlock-support' : blocked || !priceLabel ? 'print-unlock-retry' : 'print-unlock-purchase'}
          />
          {!blocked && priceLabel ? <AppText style={styles.paymentHint}>Разовая оплата · Без подписки</AppText> : null}
          <View style={styles.secondaryActions}>
            {!restoreRequired ? <AppButton
              testID="print-unlock-restore"
              title={ownershipIssue ? 'Проверить покупку' : 'Уже покупали?'}
              variant="ghost"
              onPress={() => void run('restore')}
              loading={busy === 'restore' || loadingAction === 'restore'}
              disabled={isBusy}
              fullWidth={false}
              style={styles.secondary}
            /> : null}
            <AppButton testID="print-unlock-later" title="Позже" variant="ghost" onPress={close} disabled={isBusy} fullWidth={false} style={styles.secondary} />
          </View>
        </View>
      }
    >
      <View testID="print-unlock-paywall">
        <View style={styles.summary}>
          <View style={styles.icon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Ionicons name={ownershipIssue ? 'bag-check-outline' : needsLogin ? 'person-outline' : 'print-outline'} size={27} color="#B3637A" />
          </View>
          <AppText style={styles.summaryText}>{ownershipIssue ? 'Доступ к вашей покупке' : needsLogin ? 'Ваш доступ — в вашем аккаунте' : 'Готовый PDF для типографии'}</AppText>
        </View>
        {statusText ? <AppText accessibilityRole="alert" style={styles.status}>{statusText}</AppText> : (
          <>
            <View style={styles.formats}>
              <Format icon="book-outline" label="Твёрдая обложка" />
              <Format icon="layers-outline" label="Мягкая обложка" />
            </View>
            <AppText style={styles.description}>Одна покупка для всех ваших альбомов.</AppText>
            <AppText style={styles.free}>Электронный PDF — бесплатно</AppText>
          </>
        )}
        {otherAccount ? <AppButton title="Связаться с поддержкой" variant="ghost" testID="print-unlock-support" onPress={() => void run('support')} disabled={isBusy} loading={busy === 'support'} style={styles.secondary} /> : null}
        {errorText ? <View style={styles.error}><AppText accessibilityRole="alert" style={styles.errorText}>{errorText}</AppText></View> : null}
      </View>
    </AppCenterModal>
  );
}

function Format({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  return (
    <View style={styles.format}>
      <Ionicons name={icon} size={20} color="#B3637A" />
      <AppText style={styles.formatLabel}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: 20 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  icon: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#FFF0F4', alignItems: 'center', justifyContent: 'center' },
  summaryText: { flex: 1, fontSize: 17, lineHeight: 23, fontWeight: '600', color: '#40343B' },
  formats: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  format: { flex: 1, minHeight: 72, padding: 12, gap: 8, borderRadius: 14, backgroundColor: '#F8F6F7' },
  formatLabel: { fontSize: 14, lineHeight: 19, color: '#56474F', fontWeight: '500' },
  description: { fontSize: 14, lineHeight: 21, color: '#786A72' },
  free: { marginTop: 6, fontSize: 13, lineHeight: 19, color: '#91848C' },
  status: { fontSize: 15, lineHeight: 23, color: '#786A72' },
  error: { marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: '#FFF3F3' },
  errorText: { fontSize: 14, lineHeight: 20, color: '#93455A' },
  footer: { gap: 8 },
  primary: { borderRadius: 14, minHeight: 52, shadowOpacity: 0, elevation: 0 },
  paymentHint: { textAlign: 'center', fontSize: 12, lineHeight: 18, color: '#91848C' },
  secondaryActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  secondary: { flex: 1, minHeight: 44, paddingVertical: 10, paddingHorizontal: 4 },
});
