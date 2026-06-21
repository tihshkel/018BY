import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isValidEmail,
  mapOAuthErrorMessage,
  normalizeEmail,
  OAuthProvider,
  ReferralSource,
  restoreLocalAccountKeysFromSupabase,
  signInWithOAuthProvider,
  signUpWithEmailPassword,
} from '@/utils/auth-session';
import { ensureDefaultAvatar } from '@/utils/user-avatar';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, type TextInput } from 'react-native';

import { AuthErrorBanner } from '@/components/auth/auth-error-banner';
import { AuthFooterLink, AuthScreenLayout } from '@/components/auth/auth-screen-layout';
import { AuthPasswordField } from '@/components/auth/auth-password-field';
import { AuthReferralPicker } from '@/components/auth/auth-referral-picker';
import { AppButton, AppCard, AppInput, SocialAuthButtons } from '@/components/ui';
import { spacing } from '@/constants/design-tokens';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [referralSource, setReferralSource] = useState<ReferralSource>('instagram');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<OAuthProvider | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const emailRef = useRef<TextInput | null>(null);
  const passwordRef = useRef<TextInput | null>(null);
  const passwordConfirmRef = useRef<TextInput | null>(null);

  const passwordsMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;
  const passwordsMatch = password.length > 0 && password === passwordConfirm && passwordConfirm.length > 0;

  useEffect(() => {
    const timer = setTimeout(() => emailRef.current?.focus(), 240);
    return () => clearTimeout(timer);
  }, []);

  const emailTrimmed = normalizeEmail(email);
  const emailCheck: 'empty' | 'invalid' | 'ok' =
    emailTrimmed.length === 0 ? 'empty' : isValidEmail(emailTrimmed) ? 'ok' : 'invalid';

  const navigateAfterAuth = async () => {
    const restored = await restoreLocalAccountKeysFromSupabase();
    if (!restored.success) {
      setErrorText(
        restored.error && restored.error.length > 0
          ? `Аккаунт создан, но облако не отдало профиль: ${restored.error}`
          : 'Аккаунт создан, но профиль не найден. Проверьте таблицу profiles и RLS в Supabase.'
      );
      return;
    }
    const name = await AsyncStorage.getItem('@user_name');
    await ensureDefaultAvatar();
    if (!name?.trim()) {
      router.replace('/name-input' as never);
    } else {
      router.replace('/(tabs)' as never);
    }
  };

  const handleSocialSignUp = async (provider: OAuthProvider) => {
    if (isSubmitting || socialLoading) return;
    setErrorText(null);
    setSocialLoading(provider);
    try {
      const res = await signInWithOAuthProvider(provider);
      if (!res.success) {
        if (res.error !== 'OAUTH_CANCELLED') {
          setErrorText(mapOAuthErrorMessage(res.error, 'signUp'));
        }
        return;
      }
      await navigateAfterAuth();
    } finally {
      setSocialLoading(null);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (emailCheck !== 'ok') {
      setErrorText('Укажите корректный адрес электронной почты.');
      return;
    }
    if (passwordConfirm.length === 0) {
      setErrorText('Введите пароль ещё раз в поле подтверждения.');
      return;
    }
    if (password !== passwordConfirm) {
      setErrorText('Пароли не совпадают.');
      return;
    }
    setErrorText(null);
    setIsSubmitting(true);
    try {
      const res = await signUpWithEmailPassword({ email, password, referralSource });
      if (!res.success) {
        const err = res.error ?? '';
        if (err === 'SUPABASE_NOT_CONFIGURED') {
          setErrorText('Сервис регистрации недоступен. Проверьте настройки Supabase.');
        } else if (err === 'EMAIL_INVALID') {
          setErrorText('Некорректный email.');
        } else if (err === 'PASSWORD_TOO_SHORT') {
          setErrorText('Пароль: минимум 6 символов.');
        } else if (err === 'AUTH_RATE_LIMIT') {
          setErrorText(
            'Слишком много попыток регистрации за короткое время — сработал лимит Supabase (часто при тестах). Подождите 15–60 минут, в Dashboard отключите «Confirm email», либо попробуйте позже / с другой сети.'
          );
        } else if (err === 'EMAIL_TAKEN') {
          setErrorText('Этот email уже зарегистрирован. Войдите или укажите другой адрес.');
        } else if (err === 'SUPABASE_EMAIL_CONFIRM_REQUIRED') {
          setErrorText(
            'В Supabase включено подтверждение email. Для быстрого входа отключите: Dashboard → Authentication → Providers → Email → выключить «Confirm email».'
          );
        } else if (err.length > 0) {
          setErrorText(`Не удалось зарегистрироваться: ${err}`);
        } else {
          setErrorText('Не удалось создать аккаунт.');
        }
        return;
      }
      router.replace('/name-input' as never);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScreenLayout
      title="Регистрация"
      subtitle="Создайте аккаунт, чтобы сохранять проекты и экспортировать альбомы."
      showBack
      onBack={() => router.replace('/login' as never)}
      footer={
        <AuthFooterLink
          prefix="Уже есть аккаунт?"
          actionLabel="Войти"
          onPress={() => router.replace('/login' as never)}
        />
      }
    >
      <AppCard style={styles.formCard}>
        <AppInput
          ref={emailRef}
          testID="register-email"
          label="Email"
          value={email}
          onChangeText={(value) => {
            setEmail(normalizeEmail(value));
            setErrorText(null);
          }}
          placeholder="name@example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          success={emailCheck === 'ok'}
          error={emailCheck === 'invalid' ? 'Проверьте написание email' : undefined}
          helperText={emailCheck === 'ok' ? 'Формат email подходит' : undefined}
          helperTone={emailCheck === 'ok' ? 'success' : 'muted'}
        />

        <AuthPasswordField
          ref={passwordRef}
          label="Пароль"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setErrorText(null);
          }}
          placeholder="Минимум 6 символов"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
          passwordRules={Platform.OS === 'ios' ? '' : undefined}
          returnKeyType="next"
          onSubmitEditing={() => passwordConfirmRef.current?.focus()}
        />

        <AuthPasswordField
          ref={passwordConfirmRef}
          label="Повторите пароль"
          visibilityLabel="Подтверждение пароля"
          value={passwordConfirm}
          onChangeText={(value) => {
            setPasswordConfirm(value);
            setErrorText(null);
          }}
          placeholder="Повторите пароль"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
          passwordRules={Platform.OS === 'ios' ? '' : undefined}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          success={passwordsMatch}
          error={passwordsMismatch ? 'Пароли не совпадают' : undefined}
          helperText={passwordsMatch ? 'Пароли совпадают' : undefined}
          helperTone={passwordsMatch ? 'success' : 'muted'}
        />
      </AppCard>

      <AuthReferralPicker value={referralSource} onChange={setReferralSource} />

      {errorText ? <AuthErrorBanner message={errorText} /> : null}

      <AppButton
        testID="register-submit"
        title="Зарегистрироваться"
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={isSubmitting || !!socialLoading || emailCheck !== 'ok' || passwordsMismatch}
      />

      <SocialAuthButtons
        mode="register"
        disabled={isSubmitting || !!socialLoading}
        loadingProvider={socialLoading}
        onGooglePress={() => handleSocialSignUp('google')}
        onApplePress={() => handleSocialSignUp('apple')}
        style={styles.socialButtons}
      />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  formCard: {
    padding: spacing.md,
    gap: spacing.md,
  },
  socialButtons: {
    marginTop: 0,
  },
});
