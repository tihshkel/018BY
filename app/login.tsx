import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  normalizeEmail,
  restoreLocalAccountKeysFromSupabase,
  signInWithEmailPassword,
} from '@/utils/auth-session';
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

export default function LoginScreen() {
  const { horizontalPadding } = useResponsiveLayout(AUTH_CONTENT_MAX_WIDTH);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const opacity = useSharedValue(0);
  const emailRef = useRef<TextInput | null>(null);
  const passwordRef = useRef<TextInput | null>(null);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.ease) });
    const t = setTimeout(() => emailRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, [opacity]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

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
      if (!name?.trim()) {
        router.replace('/name-input' as any);
      } else {
        router.replace('/(tabs)' as any);
      }
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
            <Text style={styles.heroTitle}>Вход</Text>

            <View style={styles.fieldsColumn}>
              <View style={styles.inputShell}>
                <TextInput
                  ref={emailRef}
                  value={email}
                  onChangeText={(t) => setEmail(normalizeEmail(t))}
                  placeholder="Email"
                  placeholderTextColor="#B9A99A"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  style={styles.inputInShell}
                  underlineColorAndroid="transparent"
                />
              </View>

              <View style={[styles.inputShell, styles.passwordShell]}>
                <TextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Пароль"
                  placeholderTextColor="#B9A99A"
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
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

              <View style={styles.forgotRow}>
                <Pressable onPress={() => router.push('/forgot-password' as any)} hitSlop={8}>
                  <Text style={styles.footerLink}>Забыли пароль?</Text>
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
                  <Text style={styles.primaryLabel}>Войти</Text>
                )}
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={styles.footerMuted}>Нет аккаунта? </Text>
                <Pressable onPress={() => router.push('/register' as any)} hitSlop={8}>
                  <Text style={styles.footerLink}>Зарегистрироваться</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAF8F5' },
  flex: { flex: 1 },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 64 : 56,
    paddingBottom: 40,
    alignItems: 'center',
  },
  heroTitle: {
    width: '100%',
    maxWidth: AUTH_CONTENT_MAX_WIDTH,
    fontSize: 42,
    lineHeight: 48,
    color: '#8B6F5F',
    fontStyle: 'italic',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontWeight: '400',
    letterSpacing: 0.3,
    marginTop: 0,
    marginBottom: 28,
    textAlign: 'center',
    textShadowColor: 'rgba(139, 111, 95, 0.12)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
  forgotRow: {
    width: '100%',
    maxWidth: AUTH_CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    marginTop: 10,
    alignItems: 'flex-end',
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
  footer: {
    marginTop: 26,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerMuted: {
    fontSize: 15,
    color: '#7D6F62',
    opacity: 0.85,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
  },
  footerLink: {
    fontSize: 15,
    color: '#8B6F5F',
    fontWeight: '600',
    textDecorationLine: 'underline',
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' }),
  },
});
