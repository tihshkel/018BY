import { getPostAuthRoute } from '@/utils/auth-onboarding';
import {
  isValidEmail,
  mapOAuthErrorMessage,
  normalizeEmail,
  type OAuthProvider,
  restoreLocalAccountKeysFromSupabase,
  signInWithEmailPassword,
  signInWithOAuthProvider,
  signUpWithEmailPassword,
} from '@/utils/auth-session';
import { ensureDefaultAvatar } from '@/utils/user-avatar';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type TextInput } from 'react-native';

import { AuthErrorBanner } from '@/components/auth/auth-error-banner';
import type { AuthMode } from '@/components/auth/auth-mode-switch';
import {
  authInputStyle,
  authSubmitStyle,
  AuthScreenLayout,
} from '@/components/auth/auth-screen-layout';
import { AuthPasswordField } from '@/components/auth/auth-password-field';
import { AppButton, AppInput, AppText, SocialAuthButtons } from '@/components/ui';

/** One mounted screen; the segmented control only changes local form state. */
export default function LoginScreen() {
  const { mode: requestedMode } = useLocalSearchParams<{ mode?: string }>();
  const initialMode: AuthMode = requestedMode === 'register' ? 'register' : 'login';
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<OAuthProvider | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const submitLock = useRef(false);
  const passwordRef = useRef<TextInput | null>(null);
  const passwordConfirmRef = useRef<TextInput | null>(null);

  const isRegister = mode === 'register';
  const password = isRegister ? registerPassword : loginPassword;
  const busy = isSubmitting || !!socialLoading;
  const passwordsMismatch = passwordConfirm.length > 0 && registerPassword !== passwordConfirm;
  const passwordsMatch = registerPassword.length > 0 && registerPassword === passwordConfirm;
  const emailTrimmed = normalizeEmail(email);
  const emailCheck: 'empty' | 'invalid' | 'ok' =
    emailTrimmed.length === 0 ? 'empty' : isValidEmail(emailTrimmed) ? 'ok' : 'invalid';

  useEffect(() => {
    if (!submitLock.current) {
      setMode(initialMode);
      setErrorText(null);
    }
  }, [initialMode]);

  const handleModeChange = (nextMode: AuthMode) => {
    if (submitLock.current || nextMode === mode) return;
    // Keep the keyboard/focused shared input when the confirmation field disappears.
    if (nextMode === 'login' && passwordConfirmRef.current?.isFocused()) {
      passwordRef.current?.focus();
    }
    setErrorText(null);
    setMode(nextMode);
  };

  const navigateAfterAuth = async () => {
    const restored = await restoreLocalAccountKeysFromSupabase();
    if (!restored.success) {
      setErrorText('Вход выполнен, но профиль пока не загрузился. Проверьте соединение и повторите попытку.');
      return;
    }
    await ensureDefaultAvatar();
    router.replace(await getPostAuthRoute() as never);
  };

  const handleSocialAuth = async (provider: OAuthProvider) => {
    if (submitLock.current) return;
    submitLock.current = true;
    setErrorText(null);
    setSocialLoading(provider);
    try {
      const res = await signInWithOAuthProvider(provider);
      if (!res.success) {
        if (res.error !== 'OAUTH_CANCELLED' && res.error !== 'OAUTH_REDIRECTING') {
          setErrorText(mapOAuthErrorMessage(res.error, isRegister ? 'signUp' : 'signIn'));
        }
        return;
      }
      await navigateAfterAuth();
    } catch {
      setErrorText('Не удалось подключиться. Проверьте интернет и попробуйте ещё раз.');
    } finally {
      submitLock.current = false;
      setSocialLoading(null);
    }
  };

  const handleSubmit = async () => {
    if (submitLock.current) return;
    if (isRegister) {
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
    }
    setErrorText(null);
    submitLock.current = true;
    setIsSubmitting(true);
    try {
      const res = isRegister
        ? await signUpWithEmailPassword({ email, password })
        : await signInWithEmailPassword({ email, password });
      if (!res.success) {
        const error = res.error ?? '';
        if (isRegister) {
          switch (error) {
            case 'SUPABASE_NOT_CONFIGURED':
              setErrorText('Сервис регистрации недоступен. Попробуйте немного позже.');
              break;
            case 'EMAIL_INVALID':
              setErrorText('Некорректный email.');
              break;
            case 'PASSWORD_TOO_SHORT':
              setErrorText('Пароль: минимум 6 символов.');
              break;
            case 'AUTH_RATE_LIMIT':
              setErrorText('Слишком много попыток. Подождите немного и попробуйте снова.');
              break;
            case 'EMAIL_TAKEN':
              setErrorText('Этот email уже зарегистрирован. Войдите или укажите другой адрес.');
              break;
            case 'SUPABASE_EMAIL_CONFIRM_REQUIRED':
              setErrorText('Мы отправили письмо на ваш email. Подтвердите адрес по ссылке в письме, затем войдите в аккаунт.');
              break;
            default:
              setErrorText(error ? mapOAuthErrorMessage(error, 'signUp') : 'Не удалось создать аккаунт.');
          }
        } else if (error === 'SUPABASE_NOT_CONFIGURED') {
          setErrorText('Сервис входа недоступен. Попробуйте немного позже.');
        } else if (error === 'EMAIL_INVALID') {
          setErrorText('Укажите корректный email.');
        } else {
          setErrorText(error ? mapOAuthErrorMessage(error) : 'Проверьте email и пароль.');
        }
        return;
      }
      if (isRegister) {
        router.replace('/referral-survey' as never);
      } else {
        await navigateAfterAuth();
      }
    } catch {
      setErrorText('Не удалось подключиться. Проверьте интернет и попробуйте ещё раз.');
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScreenLayout
      mode={mode}
      onModeChange={handleModeChange}
      modeSwitchDisabled={busy}
      title={isRegister ? 'Привет! Начнём?' : 'Привет снова!'}
      illustration={isRegister
        ? require('@/assets/images/illustrations/register-create-unicorn.png')
        : require('@/assets/images/illustrations/login-welcome-unicorn.png')}
    >
      <View style={styles.form}>
        <AppInput
          inputContainerStyle={authInputStyle}
          editable={!busy}
          testID={`${mode}-email`}
          accessibilityLabel="Email"
          value={email}
          onChangeText={(value) => {
            setEmail(normalizeEmail(value));
            setErrorText(null);
          }}
          placeholder="Email"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          success={isRegister && emailCheck === 'ok'}
          error={isRegister && emailCheck === 'invalid' ? 'Проверьте написание email' : undefined}
        />
        <AuthPasswordField
          inputContainerStyle={authInputStyle}
          editable={!busy}
          ref={passwordRef}
          testID={`${mode}-password`}
          accessibilityLabel="Пароль"
          value={password}
          onChangeText={(value: string) => {
            if (isRegister) setRegisterPassword(value);
            else setLoginPassword(value);
            setErrorText(null);
          }}
          placeholder={isRegister ? 'Минимум 6 символов' : 'Пароль'}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType={isRegister ? 'newPassword' : 'password'}
          passwordRules={isRegister && Platform.OS === 'ios' ? '' : undefined}
          returnKeyType={isRegister ? 'next' : 'done'}
          onSubmitEditing={isRegister ? () => passwordConfirmRef.current?.focus() : handleSubmit}
        />
        <View style={[styles.modeFields, !isRegister && styles.loginFields]}>
          {isRegister ? (
            <AuthPasswordField
              inputContainerStyle={authInputStyle}
              editable={!busy}
              ref={passwordConfirmRef}
              testID="register-password-confirm"
              accessibilityLabel="Повторите пароль"
              visibilityLabel="Подтверждение пароля"
              value={passwordConfirm}
              onChangeText={(value: string) => {
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
            />
          ) : (
            <Pressable
              onPress={() => router.push('/forgot-password' as never)}
              disabled={busy}
              hitSlop={8}
              style={styles.forgotRow}
              accessibilityRole="link"
              accessibilityState={{ disabled: busy }}
            >
              <AppText variant="bodySm" style={styles.forgotLink}>Забыли пароль?</AppText>
            </Pressable>
          )}
        </View>
      </View>
      {errorText ? <AuthErrorBanner message={errorText} /> : null}
      <AppButton
        testID={`${mode}-submit`}
        title={isRegister ? 'Зарегистрироваться' : 'Войти'}
        style={authSubmitStyle}
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={busy || (isRegister && (emailCheck !== 'ok' || passwordsMismatch))}
      />
      <SocialAuthButtons
        mode={mode}
        layout="row"
        disabled={busy}
        loadingProvider={socialLoading}
        onGooglePress={() => handleSocialAuth('google')}
        onApplePress={() => handleSocialAuth('apple')}
      />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  form: { gap: 10 },
  // Reserve the registration field's space so the hero, switch and button stay put.
  modeFields: { minHeight: 80 },
  loginFields: { justifyContent: 'center' },
  forgotRow: { alignSelf: 'flex-end' },
  forgotLink: { color: '#A5556B', fontWeight: '500', fontSize: 13 },
});
