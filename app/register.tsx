import {
  getReferralSourceLabel,
  isValidEmail,
  normalizeEmail,
  ReferralSource,
  signUpWithEmailPassword,
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
  ScrollView,
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

const REFERRAL_OPTIONS: ReferralSource[] = ['physical_album', 'instagram', 'organic'];

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

export default function RegisterScreen() {
  const { horizontalPadding } = useResponsiveLayout(AUTH_CONTENT_MAX_WIDTH);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [referralSource, setReferralSource] = useState<ReferralSource>('instagram');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [isReferralOpen, setIsReferralOpen] = useState(false);

  const opacity = useSharedValue(0);
  const emailRef = useRef<TextInput | null>(null);
  const passwordRef = useRef<TextInput | null>(null);
  const passwordConfirmRef = useRef<TextInput | null>(null);

  const passwordsMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;
  const passwordsMatch = password.length > 0 && password === passwordConfirm && passwordConfirm.length > 0;

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.ease) });
    const t = setTimeout(() => emailRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, [opacity]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const emailTrimmed = normalizeEmail(email);
  const emailCheck: 'empty' | 'invalid' | 'ok' =
    emailTrimmed.length === 0 ? 'empty' : isValidEmail(emailTrimmed) ? 'ok' : 'invalid';

  const dismissKeyboardAndDropdown = () => {
    Keyboard.dismiss();
    setIsReferralOpen(false);
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
    setIsReferralOpen(false);
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
      router.replace('/name-input' as any);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TouchableWithoutFeedback onPress={dismissKeyboardAndDropdown} accessible={false}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <Animated.View style={[styles.wrap, { paddingHorizontal: horizontalPadding }, fadeStyle]}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              onScrollBeginDrag={() => setIsReferralOpen(false)}
            >
              <Text style={styles.heroTitle}>Регистрация</Text>
              <Text style={styles.hint}>Почта и пароль — без лишнего.</Text>

              <View style={styles.fieldsColumn}>
                <View
                  style={[
                    styles.inputShell,
                    emailCheck === 'ok' && styles.inputShellOk,
                    emailCheck === 'invalid' && styles.inputShellBad,
                  ]}
                >
                  <TextInput
                    ref={emailRef}
                    value={email}
                    onChangeText={(t) => {
                      setEmail(normalizeEmail(t));
                      setErrorText(null);
                    }}
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
                {emailCheck === 'ok' ? (
                  <Text style={[styles.usernameHint, styles.usernameHintOk]}>Формат email подходит</Text>
                ) : emailCheck === 'invalid' ? (
                  <Text style={[styles.usernameHint, styles.usernameHintBad]}>Проверьте написание email</Text>
                ) : null}

                <View style={[styles.inputShell, styles.passwordShell]}>
                  <TextInput
                    ref={passwordRef}
                    value={password}
                    onChangeText={(t) => {
                      setPassword(t);
                      setErrorText(null);
                    }}
                    placeholder="Пароль"
                    placeholderTextColor="#B9A99A"
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry={!showPassword}
                    textContentType="newPassword"
                    passwordRules={Platform.OS === 'ios' ? '' : undefined}
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

                <View
                  style={[
                    styles.inputShell,
                    styles.passwordShell,
                    passwordsMismatch && styles.inputShellBad,
                    passwordsMatch && styles.inputShellOk,
                  ]}
                >
                  <TextInput
                    ref={passwordConfirmRef}
                    value={passwordConfirm}
                    onChangeText={(t) => {
                      setPasswordConfirm(t);
                      setErrorText(null);
                    }}
                    placeholder="Повторите пароль"
                    placeholderTextColor="#B9A99A"
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry={!showPasswordConfirm}
                    textContentType="newPassword"
                    passwordRules={Platform.OS === 'ios' ? '' : undefined}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                    style={[styles.inputInShell, styles.inputInRow]}
                    underlineColorAndroid="transparent"
                  />
                  <Pressable
                    onPress={() => setShowPasswordConfirm((v) => !v)}
                    hitSlop={10}
                    style={styles.eyeBtn}
                    accessibilityLabel={
                      showPasswordConfirm ? 'Скрыть подтверждение пароля' : 'Показать подтверждение пароля'
                    }
                  >
                    <Ionicons
                      name={showPasswordConfirm ? 'eye-off-outline' : 'eye-outline'}
                      size={22}
                      color="#9B8E7F"
                    />
                  </Pressable>
                </View>
                {passwordsMismatch ? (
                  <Text style={[styles.usernameHint, styles.usernameHintBad]}>Пароли не совпадают</Text>
                ) : passwordsMatch ? (
                  <Text style={[styles.usernameHint, styles.usernameHintOk]}>Пароли совпадают</Text>
                ) : null}

                <Text style={styles.fieldLabel}>Откуда вы о нас узнали</Text>

                <View style={styles.dropdownBlock}>
                  <Pressable
                    style={[styles.dropdownHeader, isReferralOpen && styles.dropdownHeaderOpen]}
                    onPress={() => setIsReferralOpen((v) => !v)}
                  >
                    <Text style={styles.dropdownTriggerText}>{getReferralSourceLabel(referralSource)}</Text>
                    <Ionicons name={isReferralOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#9B8E7F" />
                  </Pressable>
                  {isReferralOpen ? (
                    <View style={styles.dropdownBody}>
                      {REFERRAL_OPTIONS.map((opt, index) => {
                        const selected = opt === referralSource;
                        const showDivider = index < REFERRAL_OPTIONS.length - 1;
                        return (
                          <TouchableOpacity
                            key={opt}
                            style={[
                              styles.dropdownRow,
                              showDivider && styles.dropdownRowDivider,
                              selected && styles.dropdownRowSelected,
                            ]}
                            activeOpacity={0.85}
                            onPress={() => {
                              setReferralSource(opt);
                              setIsReferralOpen(false);
                            }}
                          >
                            <Text style={[styles.dropdownRowText, selected && styles.dropdownRowTextSelected]}>
                              {getReferralSourceLabel(opt)}
                            </Text>
                            {selected ? <Ionicons name="checkmark-circle" size={20} color="#C9A89A" /> : null}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              </View>

              {errorText ? (
                <Text style={[styles.error, styles.errorConstrained]}>{errorText}</Text>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.primary,
                  (isSubmitting || emailCheck !== 'ok' || passwordsMismatch) && styles.primaryDisabled,
                ]}
                onPress={handleSubmit}
                activeOpacity={0.88}
                disabled={isSubmitting || emailCheck !== 'ok' || passwordsMismatch}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryLabel}>Зарегистрироваться</Text>
                )}
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={styles.footerMuted}>Уже есть аккаунт? </Text>
                <Pressable onPress={() => router.replace('/login' as any)} hitSlop={8}>
                  <Text style={styles.footerLink}>Войти</Text>
                </Pressable>
              </View>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAF8F5' },
  flex: { flex: 1 },
  wrap: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingBottom: 48,
    alignItems: 'center',
  },
  heroTitle: {
    width: '100%',
    maxWidth: AUTH_CONTENT_MAX_WIDTH,
    fontSize: 38,
    lineHeight: 44,
    color: '#8B6F5F',
    fontStyle: 'italic',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontWeight: '400',
    letterSpacing: 0.3,
    marginTop: 0,
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(139, 111, 95, 0.12)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  hint: {
    width: '100%',
    maxWidth: AUTH_CONTENT_MAX_WIDTH,
    fontSize: 15,
    color: '#6B5D4F',
    lineHeight: 22,
    opacity: 0.82,
    marginBottom: 24,
    textAlign: 'center',
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
  },
  fieldsColumn: {
    width: '100%',
    maxWidth: AUTH_CONTENT_MAX_WIDTH,
    gap: 14,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#9B8B7C',
    marginTop: 6,
    marginBottom: 0,
    marginLeft: 4,
    letterSpacing: 0.2,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
  },
  inputShell: {
    ...shellBase,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 4 : 2,
  },
  inputShellOk: {
    borderColor: '#6BA888',
    backgroundColor: '#F6FBF8',
    shadowColor: '#4A8A6F',
    shadowOpacity: 0.1,
  },
  inputShellBad: {
    borderColor: '#D9776C',
    backgroundColor: '#FFF8F7',
    shadowColor: '#B85A4F',
    shadowOpacity: 0.08,
  },
  usernameHint: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: -6,
    marginBottom: 2,
    marginLeft: 4,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
  },
  usernameHintOk: { color: '#4A8A6F', fontWeight: '500' },
  usernameHintBad: { color: '#B85048', fontWeight: '500' },
  usernameHintMuted: { color: '#9B8B7C', opacity: 0.92 },
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
  dropdownBlock: {
    ...shellBase,
    marginTop: 6,
    overflow: 'hidden',
    padding: 0,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
  },
  dropdownHeaderOpen: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(139, 111, 95, 0.18)',
  },
  dropdownBody: {
    backgroundColor: '#FFFFFF',
  },
  dropdownTriggerText: {
    flex: 1,
    fontSize: 17,
    color: '#5C4F44',
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dropdownRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(139, 111, 95, 0.12)',
  },
  dropdownRowSelected: {
    backgroundColor: '#FAF8F5',
  },
  dropdownRowText: {
    flex: 1,
    fontSize: 16,
    color: '#5C4F44',
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
  },
  dropdownRowTextSelected: {
    color: '#8B6F5F',
    fontWeight: '600',
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
    paddingHorizontal: 8,
  },
  primary: {
    marginTop: 26,
    backgroundColor: '#C9A89A',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%',
    maxWidth: AUTH_CONTENT_MAX_WIDTH,
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
    letterSpacing: 0.4,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' }),
  },
  footer: {
    marginTop: 24,
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
