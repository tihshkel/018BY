import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  normalizeEmail,
  OAuthProvider,
  restoreLocalAccountKeysFromSupabase,
  signInWithEmailPassword,
  signInWithOAuthProvider,
} from '@/utils/auth-session';
import { ensureDefaultAvatar } from '@/utils/user-avatar';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type TextInput } from 'react-native';

import { AuthErrorBanner } from '@/components/auth/auth-error-banner';
import { AuthFooterLink, AuthScreenLayout } from '@/components/auth/auth-screen-layout';
import { AuthPasswordField } from '@/components/auth/auth-password-field';
import { AppButton, AppCard, AppInput, AppText, SocialAuthButtons } from '@/components/ui';
import { colors, spacing } from '@/constants/design-tokens';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<OAuthProvider | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const emailRef = useRef<TextInput | null>(null);
  const passwordRef = useRef<TextInput | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => emailRef.current?.focus(), 240);
    return () => clearTimeout(timer);
  }, []);

  const navigateAfterAuth = async () => {
    const restored = await restoreLocalAccountKeysFromSupabase();
    if (!restored.success) {
      setErrorText(
        restored.error && restored.error.length > 0
          ? `Вход выполнен, но облако не отдало профиль: ${restored.error}`
          : 'Вход выполнен, но профиль не найден. Проверьте таблицу profiles и RLS в Supabase.'
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

  const mapOAuthError = (error?: string): string => {
    if (error === 'SUPABASE_NOT_CONFIGURED') {
      return 'Сервис входа недоступен. Проверьте настройки Supabase.';
    }
    if (error === 'OAUTH_CANCELLED') {
      return 'Вход отменён.';
    }
    if (error && error.length > 0) {
      return `Не удалось войти: ${error}`;
    }
    return 'Не удалось войти через выбранный сервис.';
  };

  const handleSocialSignIn = async (provider: OAuthProvider) => {
    if (isSubmitting || socialLoading) return;
    setErrorText(null);
    setSocialLoading(provider);
    try {
      const res = await signInWithOAuthProvider(provider);
      if (!res.success) {
        if (res.error !== 'OAUTH_CANCELLED') {
          setErrorText(mapOAuthError(res.error));
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
    setErrorText(null);
    setIsSubmitting(true);
    try {
      const res = await signInWithEmailPassword({ email, password });
      if (!res.success) {
        if (res.error === 'SUPABASE_NOT_CONFIGURED') {
          setErrorText('Сервис входа недоступен. Проверьте настройки Supabase.');
        } else if (res.error === 'EMAIL_INVALID') {
          setErrorText('Укажите корректный email.');
        } else if (res.error && res.error.length > 0) {
          setErrorText(`Не удалось войти: ${res.error}`);
        } else {
          setErrorText('Проверьте email и пароль.');
        }
        return;
      }
      await navigateAfterAuth();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScreenLayout
      title="Вход"
      subtitle="Войдите, чтобы продолжить работу с альбомами и экспортом."
      showBack={router.canGoBack()}
      footer={
        <AuthFooterLink
          prefix="Нет аккаунта?"
          actionLabel="Зарегистрироваться"
          onPress={() => router.push('/register' as never)}
        />
      }
    >
      <AppCard style={styles.formCard}>
        <AppInput
          ref={emailRef}
          testID="login-email"
          label="Email"
          value={email}
          onChangeText={(value) => setEmail(normalizeEmail(value))}
          placeholder="name@example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />

        <AuthPasswordField
          ref={passwordRef}
          testID="login-password"
          label="Пароль"
          value={password}
          onChangeText={setPassword}
          placeholder="Введите пароль"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />

        <View style={styles.forgotRow}>
          <Pressable onPress={() => router.push('/forgot-password' as never)} hitSlop={8}>
            <AppText variant="bodySm" style={styles.forgotLink}>
              Забыли пароль?
            </AppText>
          </Pressable>
        </View>
      </AppCard>

      {errorText ? <AuthErrorBanner message={errorText} /> : null}

      <AppButton
        testID="login-submit"
        title="Войти"
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={isSubmitting || !!socialLoading}
      />

      <SocialAuthButtons
        mode="login"
        disabled={isSubmitting || !!socialLoading}
        loadingProvider={socialLoading}
        onGooglePress={() => handleSocialSignIn('google')}
        onApplePress={() => handleSocialSignIn('apple')}
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
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: -4,
  },
  forgotLink: {
    color: colors.primary,
    fontWeight: '600',
  },
  socialButtons: {
    marginTop: 0,
  },
});
