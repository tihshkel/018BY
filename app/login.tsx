import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  mapOAuthErrorMessage,
  normalizeEmail,
  OAuthProvider,
  restoreLocalAccountKeysFromSupabase,
  signInWithEmailPassword,
  signInWithOAuthProvider,
} from '@/utils/auth-session';
import { ensureDefaultAvatar } from '@/utils/user-avatar';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type TextInput } from 'react-native';

import { AuthErrorBanner } from '@/components/auth/auth-error-banner';
import { AuthFooterLink, AuthScreenLayout } from '@/components/auth/auth-screen-layout';
import { AuthPasswordField } from '@/components/auth/auth-password-field';
import { AppButton, AppInput, AppText, SocialAuthButtons } from '@/components/ui';
import { colors, spacing } from '@/constants/design-tokens';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<OAuthProvider | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const emailRef = useRef<TextInput | null>(null);
  const passwordRef = useRef<TextInput | null>(null);

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

  const handleSocialSignIn = async (provider: OAuthProvider) => {
    if (isSubmitting || socialLoading) return;
    setErrorText(null);
    setSocialLoading(provider);
    try {
      const res = await signInWithOAuthProvider(provider);
      if (!res.success) {
        if (res.error !== 'OAUTH_CANCELLED') {
          setErrorText(mapOAuthErrorMessage(res.error, 'signIn'));
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

  const busy = isSubmitting || !!socialLoading;

  return (
    <AuthScreenLayout
      title="Вход"
      subtitle="Продолжите работу с альбомами"
      showBack={router.canGoBack()}
      footer={
        <AuthFooterLink
          prefix="Нет аккаунта?"
          actionLabel="Регистрация"
          onPress={() => router.push('/register' as never)}
        />
      }
    >
      <View style={styles.form}>
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
          placeholder="Пароль"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />

        <Pressable
          onPress={() => router.push('/forgot-password' as never)}
          hitSlop={8}
          style={styles.forgotRow}
        >
          <AppText variant="bodySm" style={styles.forgotLink}>
            Забыли пароль?
          </AppText>
        </Pressable>
      </View>

      {errorText ? <AuthErrorBanner message={errorText} /> : null}

      <AppButton
        testID="login-submit"
        title="Войти"
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={busy}
      />

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <AppText variant="caption" style={styles.dividerText}>
          или
        </AppText>
        <View style={styles.dividerLine} />
      </View>

      <SocialAuthButtons
        mode="login"
        disabled={busy}
        loadingProvider={socialLoading}
        onGooglePress={() => handleSocialSignIn('google')}
        onApplePress={() => handleSocialSignIn('apple')}
        showDivider={false}
      />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.sm,
  },
  forgotRow: {
    alignSelf: 'flex-end',
  },
  forgotLink: {
    color: colors.textSecondary,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textSecondary,
  },
});
