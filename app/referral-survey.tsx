import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AuthErrorBanner } from '@/components/auth/auth-error-banner';
import { AuthScreenLayout, authSubmitStyle } from '@/components/auth/auth-screen-layout';
import { AppButton, AppText } from '@/components/ui';
import { colors } from '@/constants/design-tokens';
import { completeReferralSurvey, getPostAuthRoute } from '@/utils/auth-onboarding';
import type { ReferralSource } from '@/utils/auth-session';

const options: { value: ReferralSource; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'instagram', label: 'Instagram', icon: 'logo-instagram' },
  { value: 'physical_album', label: 'Из альбома', icon: 'book-outline' },
  { value: 'organic', label: 'Другое', icon: 'ellipsis-horizontal' },
];

export default function ReferralSurveyScreen() {
  const [selected, setSelected] = useState<ReferralSource | undefined>();
  const [checking, setChecking] = useState(true);
  const [action, setAction] = useState<'save' | 'skip' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    void getPostAuthRoute().then((route) => {
      if (!mounted.current) return;
      if (route !== '/referral-survey') router.replace(route as never);
      else setChecking(false);
    }).catch(() => {
      if (mounted.current) {
        setChecking(false);
        setError('Не удалось проверить аккаунт. Попробуйте ещё раз или пропустите вопрос.');
      }
    });
    return () => { mounted.current = false; };
  }, []);

  const continueToName = async (skip: boolean) => {
    if (lock.current || checking || (!skip && !selected)) return;
    lock.current = true;
    setAction(skip ? 'skip' : 'save');
    setError(null);
    try {
      await completeReferralSurvey(skip ? undefined : selected);
      if (mounted.current) router.replace('/name-input' as never);
    } catch {
      if (mounted.current) setError('Не удалось сохранить ответ. Попробуйте ещё раз или нажмите «Пропустить».');
    } finally {
      lock.current = false;
      if (mounted.current) setAction(null);
    }
  };
  const busy = checking || action !== null;

  return (
    <AuthScreenLayout
      title="Откуда вы о нас узнали?"
      illustration={require('@/assets/images/illustrations/referral-discovery-unicorn.png')}
    >
      {checking ? <ActivityIndicator color={colors.primary} /> : (
        <View style={styles.options} accessibilityRole="radiogroup" accessibilityLabel="Откуда вы о нас узнали">
          {options.map((option) => (
            <Pressable
              key={option.value}
              testID={`referral-${option.value}`}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: selected === option.value, disabled: busy }}
              disabled={busy}
              onPress={() => setSelected(option.value)}
              style={[styles.option, selected === option.value && styles.optionSelected]}
            >
              <Ionicons name={option.icon} size={22} color="#A5556B" />
              <AppText style={styles.optionText}>{option.label}</AppText>
              <Ionicons name={selected === option.value ? 'checkmark-circle' : 'ellipse-outline'} size={21} color={selected === option.value ? '#A5556B' : '#D8CCD2'} />
            </Pressable>
          ))}
        </View>
      )}
      {error ? <AuthErrorBanner message={error} /> : null}
      <AppButton
        title="Продолжить"
        testID="referral-continue"
        style={authSubmitStyle}
        disabled={busy || !selected}
        loading={action === 'save'}
        onPress={() => void continueToName(false)}
      />
      <AppButton
        title="Пропустить"
        variant="ghost"
        testID="referral-skip"
        disabled={busy}
        loading={action === 'skip'}
        onPress={() => void continueToName(true)}
      />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  options: { gap: 10 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: '#EDE5E9', backgroundColor: '#F8F6F7' },
  optionSelected: { borderColor: '#DCA4B4', backgroundColor: '#FFF3F6' },
  optionText: { flex: 1, fontSize: 16, fontWeight: '500', color: '#40343B' },
});
