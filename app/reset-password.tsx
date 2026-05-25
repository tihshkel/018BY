import {
  applyRecoverySessionFromUrl,
  updatePasswordAfterRecovery,
} from '@/utils/auth-session';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AUTH_CONTENT_MAX_WIDTH, useResponsiveLayout } from '@/utils/responsive';

const shellBase = {
  width: '100%' as const,
  maxWidth: AUTH_CONTENT_MAX_WIDTH,
  alignSelf: 'center' as const,
  backgroundColor: '#FFFFFF',
  borderRadius: 14,
  borderWidth: 1,
  borderColor: '#E8E0D8',
  shadowColor: '#8B6F5F',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
};

function mapRecoveryError(code: string | undefined): string {
  switch (code) {
    case 'SUPABASE_NOT_CONFIGURED':
      return 'Сервис недоступен. Проверьте настройки Supabase.';
    case 'NO_TOKENS_IN_URL':
      return 'Ссылка неполная или устарела. Запросите новое письмо на экране «Забыли пароль».';
    case 'NOT_RECOVERY_LINK':
      return 'Эта ссылка не для смены пароля.';
    default:
      return code && code.length > 0 ? code : 'Не удалось подтвердить ссылку.';
  }
}

export default function ResetPasswordScreen() {
  const { horizontalPadding } = useResponsiveLayout(AUTH_CONTENT_MAX_WIDTH);
  const [phase, setPhase] = useState<'loading' | 'form' | 'blocked'>('loading');
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const opacity = useSharedValue(0);
  const passwordRef = useRef<TextInput | null>(null);
  const passwordConfirmRef = useRef<TextInput | null>(null);
  const appliedRef = useRef(false);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const tryApplyUrl = useCallback(async (url: string | null) => {
    if (!url) return false;
    const hasAuthHint =
      url.includes('access_token=') ||
      url.includes('refresh_token=') ||
      url.includes('code=') ||
      url.toLowerCase().includes('type=recovery');
    if (!hasAuthHint) return false;

    const res = await applyRecoverySessionFromUrl(url);
    if (res.success) {
      appliedRef.current = true;
      setPhase('form');
      setBlockedMessage(null);
      opacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.ease) });
      setTimeout(() => passwordRef.current?.focus(), 200);
      return true;
    }
    setBlockedMessage(mapRecoveryError(res.error));
    setPhase('blocked');
    opacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.ease) });
    return false;
  }, [opacity]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const initial = await Linking.getInitialURL();
      if (cancelled) return;
      const ok = await tryApplyUrl(initial);
      if (!cancelled && !ok && !appliedRef.current) {
        setPhase('blocked');
        setBlockedMessage(
          'Откройте ссылку из письма на этом устройстве. Если вы перешли по ссылке, запросите новое письмо на экране «Забыли пароль».'
        );
        opacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.ease) });
      }
    })();

    const sub = Linking.addEventListener('url', (event) => {
      void tryApplyUrl(event.url);
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [tryApplyUrl, opacity]);

  const handleSubmit = async () => {
    if (isSubmitting || phase !== 'form') return;
    setErrorText(null);
    if (password.length < 6) {
      setErrorText('Пароль должен быть не короче 6 символов.');
      return;
    }
    if (password !== passwordConfirm) {
      setErrorText('Пароли не совпадают.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await updatePasswordAfterRecovery(password);
      if (!res.success) {
        if (res.error === 'PASSWORD_TOO_SHORT') {
          setErrorText('Пароль должен быть не короче 6 символов.');
        } else if (res.error === 'SUPABASE_NOT_CONFIGURED') {
          setErrorText('Сервис недоступен. Проверьте настройки Supabase.');
        } else if (res.error && res.error.length > 0) {
          setErrorText(res.error);
        } else {
          setErrorText('Не удалось обновить пароль.');
        }
        return;
      }
      router.replace('/login' as any);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (phase === 'loading') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#C9A89A" />
          <Text style={styles.loadingText}>Проверяем ссылку…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'blocked') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Animated.View style={[styles.inner, { paddingHorizontal: horizontalPadding }, fadeStyle]}>
          <View style={styles.topBar}>
            <Pressable
              onPress={() => router.replace('/login' as any)}
              hitSlop={12}
              style={styles.backBtn}
              accessibilityLabel="Ко входу"
            >
              <Ionicons name="chevron-back" size={28} color="#8B6F5F" />
            </Pressable>
          </View>
          <Ionicons name="mail-unread-outline" size={48} color="#C9A89A" style={{ marginBottom: 16 }} />
          <Text style={styles.blockedTitle}>Новый пароль</Text>
          <Text style={styles.blockedBody}>{blockedMessage}</Text>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace('/forgot-password' as any)}
            activeOpacity={0.88}
          >
            <Text style={styles.secondaryLabel}>Забыли пароль</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <Animated.View style={[styles.inner, { paddingHorizontal: horizontalPadding }, fadeStyle]}>
            <View style={styles.topBar}>
              <Pressable
                onPress={() => router.replace('/login' as any)}
                hitSlop={12}
                style={styles.backBtn}
                accessibilityLabel="Ко входу"
              >
                <Ionicons name="chevron-back" size={28} color="#8B6F5F" />
              </Pressable>
            </View>

            <Text style={styles.heroTitle}>Новый пароль</Text>
            <Text style={styles.subtitle}>Придумайте новый пароль для входа в аккаунт.</Text>

            <View style={styles.fieldsColumn}>
              <View style={[styles.inputShell, styles.passwordShell]}>
                <TextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Новый пароль"
                  placeholderTextColor="#B9A99A"
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={!showPassword}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordConfirmRef.current?.focus()}
                  style={[styles.inputInShell, styles.inputInRow]}
                  underlineColorAndroid="transparent"
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={10}
                  style={styles.eyeBtn}
                  accessibilityLabel={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color="#9B8E7F"
                  />
                </Pressable>
              </View>

              <View style={[styles.inputShell, styles.passwordShell]}>
                <TextInput
                  ref={passwordConfirmRef}
                  value={passwordConfirm}
                  onChangeText={setPasswordConfirm}
                  placeholder="Повторите пароль"
                  placeholderTextColor="#B9A99A"
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={!showPasswordConfirm}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  style={[styles.inputInShell, styles.inputInRow]}
                  underlineColorAndroid="transparent"
                />
                <Pressable
                  onPress={() => setShowPasswordConfirm((v) => !v)}
                  hitSlop={10}
                  style={styles.eyeBtn}
                  accessibilityLabel={showPasswordConfirm ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  <Ionicons
                    name={showPasswordConfirm ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color="#9B8E7F"
                  />
                </Pressable>
              </View>
            </View>

            {errorText ? (
              <Text style={[styles.error, styles.errorConstrained]}>{errorText}</Text>
            ) : null}

            <View style={styles.actionsColumn}>
              <TouchableOpacity
                style={[styles.primary, isSubmitting && styles.primaryDisabled]}
                onPress={handleSubmit}
                activeOpacity={0.88}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryLabel}>Сохранить пароль</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAF8F5' },
  flex: { flex: 1 },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7D6F62',
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 8 : 4,
    paddingBottom: 40,
    alignItems: 'center',
  },
  topBar: {
    width: '100%',
    maxWidth: AUTH_CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    marginBottom: 8,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingRight: 12,
  },
  heroTitle: {
    width: '100%',
    maxWidth: AUTH_CONTENT_MAX_WIDTH,
    fontSize: 36,
    lineHeight: 42,
    color: '#8B6F5F',
    fontStyle: 'italic',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontWeight: '400',
    letterSpacing: 0.3,
    marginBottom: 14,
    textAlign: 'center',
    textShadowColor: 'rgba(139, 111, 95, 0.12)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    width: '100%',
    maxWidth: AUTH_CONTENT_MAX_WIDTH,
    fontSize: 15,
    lineHeight: 22,
    color: '#7D6F62',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
  },
  fieldsColumn: {
    width: '100%',
    maxWidth: AUTH_CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    gap: 14,
  },
  inputShell: {
    ...shellBase,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 4 : 2,
  },
  passwordShell: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputInShell: {
    fontSize: 17,
    color: '#5C4F44',
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    paddingHorizontal: 0,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
  },
  inputInRow: {
    flex: 1,
    paddingRight: 8,
  },
  eyeBtn: {
    padding: 10,
    marginRight: 4,
  },
  actionsColumn: {
    width: '100%',
    maxWidth: AUTH_CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    marginTop: 8,
  },
  error: {
    marginTop: 14,
    fontSize: 14,
    color: '#C45C52',
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
  },
  errorConstrained: {
    width: '100%',
    maxWidth: AUTH_CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 8,
  },
  primary: {
    marginTop: 22,
    backgroundColor: '#C9A89A',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryDisabled: { opacity: 0.75 },
  primaryLabel: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.5,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' }),
  },
  blockedTitle: {
    fontSize: 28,
    color: '#8B6F5F',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontStyle: 'italic',
    marginBottom: 12,
    textAlign: 'center',
  },
  blockedBody: {
    fontSize: 16,
    lineHeight: 24,
    color: '#5C4F44',
    textAlign: 'center',
    maxWidth: AUTH_CONTENT_MAX_WIDTH,
    marginBottom: 28,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
  },
  secondaryBtn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C9A89A',
    backgroundColor: '#FFFFFF',
  },
  secondaryLabel: {
    fontSize: 16,
    color: '#8B6F5F',
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' }),
  },
});
