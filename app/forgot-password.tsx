import {
  getPasswordRecoveryRedirectUrl,
  normalizeEmail,
  requestPasswordResetEmail,
} from '@/utils/auth-session';
import { colors, createShadow, radii, sansFont } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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
  borderColor: colors.border,
  shadowColor: colors.textPrimary,
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
};

export default function ForgotPasswordScreen() {
  const { horizontalPadding } = useResponsiveLayout(AUTH_CONTENT_MAX_WIDTH);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [sentOk, setSentOk] = useState(false);

  const opacity = useSharedValue(0);
  const emailRef = useRef<TextInput | null>(null);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.ease) });
    const t = setTimeout(() => emailRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, [opacity]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setErrorText(null);
    setSentOk(false);
    setIsSubmitting(true);
    try {
      const res = await requestPasswordResetEmail(email);
      if (!res.success) {
        if (res.error === 'SUPABASE_NOT_CONFIGURED') {
          setErrorText('Сервис недоступен. Проверьте настройки Supabase.');
        } else if (res.error === 'EMAIL_INVALID') {
          setErrorText('Укажите корректный email.');
        } else if (res.error === 'EMAIL_NOT_REGISTERED') {
          setErrorText('Этот email не зарегистрирован. Проверьте адрес или зарегистрируйтесь.');
        } else if (res.error === 'AUTH_RATE_LIMIT') {
          setErrorText('Слишком много попыток. Подождите немного и попробуйте снова.');
        } else if (res.error && res.error.length > 0) {
          setErrorText(`Не удалось отправить письмо: ${res.error}`);
        } else {
          setErrorText('Не удалось отправить письмо. Попробуйте позже.');
        }
        return;
      }
      setSentOk(true);
    } finally {
      setIsSubmitting(false);
    }
  };

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
                onPress={() => router.back()}
                hitSlop={12}
                style={styles.backBtn}
                accessibilityLabel="Назад"
              >
                <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
              </Pressable>
            </View>

            <Text style={styles.heroTitle}>Забыли пароль?</Text>
            <Text style={styles.subtitle}>
              Укажите email — мы отправим ссылку для установки нового пароля. Откройте письмо на этом
              устройстве.
            </Text>
            {__DEV__ ? (
              <Text style={styles.devHint} selectable>
                Redirect URL для Supabase: {getPasswordRecoveryRedirectUrl()}
              </Text>
            ) : null}

            <View style={styles.fieldsColumn}>
              <View style={styles.inputShell}>
                <TextInput
                  ref={emailRef}
                  value={email}
                  onChangeText={(t) => setEmail(normalizeEmail(t))}
                  placeholder="Email"
                  placeholderTextColor={colors.placeholder}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  style={styles.inputInShell}
                  underlineColorAndroid="transparent"
                  editable={!sentOk}
                />
              </View>
            </View>

            {errorText ? (
              <Text style={[styles.error, styles.errorConstrained]}>{errorText}</Text>
            ) : null}

            {sentOk ? (
              <Text style={styles.success}>
                Письмо со ссылкой отправлено. Откройте его на этом устройстве. Проверьте папку «Спам»,
                если письма нет во входящих.
              </Text>
            ) : null}

            <View style={styles.actionsColumn}>
              <TouchableOpacity
                style={[styles.primary, (isSubmitting || sentOk) && styles.primaryDisabled]}
                onPress={handleSubmit}
                activeOpacity={0.88}
                disabled={isSubmitting || sentOk}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryLabel}>{sentOk ? 'Письмо отправлено' : 'Отправить ссылку'}</Text>
                )}
              </TouchableOpacity>

              <View style={styles.footer}>
                <Pressable onPress={() => router.replace('/login' as any)} hitSlop={8}>
                  <Text style={styles.footerLink}>Вернуться ко входу</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
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
    color: colors.textPrimary,
    
    fontFamily: sansFont('bold'),
    fontWeight: '700',
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
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
  },
  devHint: {
    width: '100%',
    maxWidth: AUTH_CONTENT_MAX_WIDTH,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
    marginBottom: 12,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
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
  inputInShell: {
    fontSize: 17,
    color: colors.textPrimary,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    paddingHorizontal: 0,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
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
    color: colors.error,
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
  success: {
    marginTop: 14,
    fontSize: 14,
    color: '#5A7D5A',
    lineHeight: 20,
    textAlign: 'center',
    width: '100%',
    maxWidth: AUTH_CONTENT_MAX_WIDTH,
    paddingHorizontal: 8,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
  },
  primary: {
    marginTop: 22,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%',
    shadowColor: colors.textPrimary,
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
  footer: {
    marginTop: 26,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLink: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '600',
    textDecorationLine: 'underline',
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' }),
  },
});
