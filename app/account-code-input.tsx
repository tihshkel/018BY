import { loginAndEnterFast } from '@/utils/account-sync';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const CODE_LENGTH = 8; // Код доступа аккаунта обычно длиннее
const SCREEN_WIDTH = Dimensions.get('window').width;
const HORIZONTAL_PADDING = 24;
const CODE_GAP = 6;
const CODE_INPUT_SIZE = Math.min(
  44,
  (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CODE_GAP * (CODE_LENGTH - 1)) /
    CODE_LENGTH
);
const CODE_INPUT_FONT_SIZE = Math.max(18, Math.min(22, CODE_INPUT_SIZE * 0.58));

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

function CodeCell(props: {
  index: number;
  value: string;
  hasError: boolean;
  autoFocus?: boolean;
  onChangeText: (value: string, index: number) => void;
  onKeyPress: (key: string, index: number) => void;
  onFocusAny: () => void;
  setRef: (ref: TextInput | null, index: number) => void;
}) {
  const { index, value, hasError, autoFocus, onChangeText, onKeyPress, onFocusAny, setRef } = props;

  const fill = useSharedValue(value ? 1 : 0);
  const focus = useSharedValue(0);
  const scale = useSharedValue(1);
  const errorProgress = useSharedValue(hasError ? 1 : 0);

  const prevValueRef = useRef(value);

  useEffect(() => {
    errorProgress.value = withTiming(hasError ? 1 : 0, { duration: 180 });
  }, [hasError, errorProgress]);

  useEffect(() => {
    const prev = prevValueRef.current || '';
    const next = value || '';
    prevValueRef.current = next;

    const isFilled = !!next;
    fill.value = withTiming(isFilled ? 1 : 0, {
      duration: 160,
      easing: Easing.out(Easing.cubic),
    });

    if (!prev && next) {
      scale.value = withSequence(
        withSpring(1.08, { damping: 18, stiffness: 220 }),
        withSpring(1, { damping: 18, stiffness: 220 })
      );
    } else if (prev && !next) {
      scale.value = withSequence(
        withTiming(0.985, { duration: 120, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) })
      );
    }
  }, [value, fill, scale]);

  const animatedStyle = useAnimatedStyle(() => {
    const baseBorder = interpolateColor(fill.value, [0, 1], ['#D4C4B5', '#C9A89A']);
    const focusBorder = interpolateColor(focus.value, [0, 1], [baseBorder, '#8B6F5F']);
    const borderColor =
      errorProgress.value > 0 ? '#D9776C' : (focusBorder as string);

    const bg = interpolateColor(fill.value, [0, 1], ['#FFFFFF', '#FAF8F5']);
    const bgFocused = interpolateColor(focus.value, [0, 1], [bg, '#FFFDFC']);

    return {
      borderColor,
      backgroundColor: bgFocused as string,
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <AnimatedTextInput
      ref={(ref) => setRef(ref, index)}
      style={[styles.codeInput, animatedStyle]}
      value={value}
      onChangeText={(v) => onChangeText(v, index)}
      onKeyPress={({ nativeEvent }) => onKeyPress(nativeEvent.key, index)}
      onFocus={() => {
        onFocusAny();
        focus.value = withTiming(1, { duration: 160 });
      }}
      onBlur={() => {
        focus.value = withTiming(0, { duration: 160 });
      }}
      keyboardType="default"
      maxLength={1}
      autoCapitalize="characters"
      autoCorrect={false}
      autoFocus={autoFocus}
      selectTextOnFocus={false}
      contextMenuHidden
      caretHidden
      selectionColor="transparent"
      underlineColorAndroid="transparent"
      textContentType={Platform.OS === 'ios' ? 'oneTimeCode' : undefined}
      autoComplete={Platform.OS === 'ios' ? 'one-time-code' : undefined}
      textAlignVertical="center"
    />
  );
}

export default function AccountCodeInputScreen() {
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const containerOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(0);
  const keyboardShownRef = useRef(false);

  useEffect(() => {
    const runAnimation = () => {
      containerOpacity.value = withTiming(1, { 
        duration: Platform.OS === 'android' ? 500 : 400,
        easing: Easing.out(Easing.ease),
      });
    };

    if (Platform.OS === 'android') {
      InteractionManager.runAfterInteractions(() => {
        runAnimation();
      });
    } else {
      runAnimation();
    }
    
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        if (!keyboardShownRef.current) {
          keyboardShownRef.current = true;
          const keyboardHeight = e.endCoordinates?.height ?? 280;
          // Сдвигаем блок вверх (меньший множитель = блок остаётся ниже, ближе к клавиатуре)
          const offset = -(keyboardHeight * 0.40);
          contentTranslateY.value = withSpring(offset, {
            damping: 30,
            stiffness: 40,
            mass: 0.8,
          });
        }
      }
    );
    
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        keyboardShownRef.current = false;
        contentTranslateY.value = withSpring(0, {
          damping: 30,
          stiffness: 40,
          mass: 0.8,
        });
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const handleDismissKeyboard = () => {
    Keyboard.dismiss();
    contentTranslateY.value = withSpring(0, {
      damping: 30,
      stiffness: 40,
      mass: 0.8,
    });
  };

  const onChangeText = (value: string, index: number) => {
    if (error) setError(false);

    const sanitizedValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    const newCode = [...code];
    if (sanitizedValue.length > 1) {
      const chars = sanitizedValue.split('').slice(0, CODE_LENGTH - index);
      chars.forEach((char, charIndex) => {
        newCode[index + charIndex] = char;
      });
      setCode(newCode);

      const nextIndex = Math.min(index + chars.length, CODE_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    newCode[index] = sanitizedValue;
    setCode(newCode);

    if (sanitizedValue && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const onKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const onFocusAny = () => {
    if (error) setError(false);
  };

  const setRef = (ref: TextInput | null, index: number) => {
    inputRefs.current[index] = ref;
  };

  const handleLogin = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== CODE_LENGTH) {
      setError(true);
      return;
    }

    Keyboard.dismiss();
    setIsLoading(true);
    setError(false);
    contentTranslateY.value = withSpring(0, { damping: 30, stiffness: 40, mass: 0.8 });

    try {
      const result = await loginAndEnterFast(fullCode);

      if (result.success) {
        if (Platform.OS === 'android') {
          setTimeout(() => router.replace('/(tabs)'), 80);
        } else {
          router.replace('/(tabs)');
        }
        return;
      }

      setIsLoading(false);
      if (result.error === 'DEVICE_LIMIT') {
        Alert.alert(
          'Лимит устройств',
          'К этому аккаунту уже привязано максимальное количество устройств (4 устройства). Для добавления нового устройства необходимо удалить одно из существующих устройств или обратиться в техническую поддержку.'
        );
        return;
      }
      if (result.error === 'INVALID_CODE') {
        Alert.alert(
          'Неверный код',
          'Код доступа не найден. Убедитесь, что вы вводите правильный код, который был сгенерирован при первой регистрации в приложении.',
          [
            {
              text: 'Попробовать снова',
              style: 'cancel',
              onPress: () => {
                setCode(Array(CODE_LENGTH).fill(''));
                setError(true);
                inputRefs.current[0]?.focus();
              },
            },
          ]
        );
        return;
      }
      Alert.alert(
        'Ошибка входа',
        'Произошла ошибка при входе в аккаунт. Попробуйте еще раз.',
        [
          {
            text: 'Попробовать снова',
            style: 'cancel',
            onPress: () => {
              setCode(Array(CODE_LENGTH).fill(''));
              setError(true);
              inputRefs.current[0]?.focus();
            },
          },
        ]
      );
    } catch (err) {
      console.error('Error during account login:', err);
      setIsLoading(false);
      Alert.alert(
        'Ошибка',
        'Проверьте подключение к интернету и попробуйте снова.',
        [
          {
            text: 'Попробовать снова',
            style: 'cancel',
            onPress: () => {
              setCode(Array(CODE_LENGTH).fill(''));
              setError(true);
              inputRefs.current[0]?.focus();
            },
          },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient
        colors={['#F5F0EB', '#FAF8F5', '#F5F0EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={handleDismissKeyboard}>
          <Animated.View style={[styles.content, containerAnimatedStyle]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Вернуться назад"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={32} color="#5C4A3D" />
            </TouchableOpacity>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Animated.View style={[styles.centeredBlock, contentAnimatedStyle]}>
                <View style={styles.iconContainer}>
                  <Ionicons name="person-outline" size={48} color="#8B6F5F" />
                </View>

                <Text style={styles.title}>Вход в аккаунт</Text>
                <Text style={styles.subtitle}>
                  Введите код доступа, который был сгенерирован на вашем предыдущем устройстве
                </Text>

                <View style={styles.codeContainer}>
                  {code.map((value, index) => (
                    <CodeCell
                      key={index}
                      index={index}
                      value={value}
                      hasError={error}
                      autoFocus={index === 0}
                      onChangeText={onChangeText}
                      onKeyPress={onKeyPress}
                      onFocusAny={onFocusAny}
                      setRef={setRef}
                    />
                  ))}
                </View>

                {error && (
                  <Text style={styles.errorText}>
                    Проверьте код доступа
                  </Text>
                )}

                <TouchableOpacity
                  style={[
                    styles.loginButton,
                    (code.join('').length === CODE_LENGTH && !isLoading) && styles.loginButtonActive,
                    isLoading && styles.loginButtonLoading,
                  ]}
                  onPress={handleLogin}
                  activeOpacity={0.7}
                  disabled={code.join('').length !== CODE_LENGTH || isLoading}
                >
                  <Text
                    style={[
                      styles.loginButtonText,
                      (code.join('').length === CODE_LENGTH && !isLoading) && styles.loginButtonTextActive,
                    ]}
                  >
                    {isLoading ? 'Вход...' : 'Войти в аккаунт'}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </ScrollView>
          </Animated.View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 96,
  },
  backButton: {
    position: 'absolute',
    top: 24,
    left: HORIZONTAL_PADDING,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(139, 111, 95, 0.12)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(139, 111, 95, 0.25)',
  },
  centeredBlock: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    paddingBottom: 40,
    marginTop: -12, // блок с полем ввода кода (чуть ниже, чем было -36)
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    borderWidth: 2,
    borderColor: '#E8DDD4',
  },
  title: {
    fontSize: 28,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 16,
    color: '#9B8E7F',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 36,
    paddingHorizontal: 12,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    opacity: 0.9,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: CODE_GAP,
    marginBottom: 24,
  },
  codeInput: {
    width: CODE_INPUT_SIZE,
    height: CODE_INPUT_SIZE,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 0,
    paddingVertical: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: CODE_INPUT_FONT_SIZE,
    lineHeight: CODE_INPUT_FONT_SIZE + 2,
    fontWeight: '600',
    color: '#8B6F5F',
    includeFontPadding: false,
    fontFamily: Platform.select({
      ios: 'Courier',
      android: 'monospace',
      default: 'monospace',
    }),
  },
  errorText: {
    color: '#D9776C',
    fontSize: 14,
    marginBottom: 24,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
  },
  loginButton: {
    width: '100%',
    maxWidth: 400,
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: '#D4C4B5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginButtonActive: {
    backgroundColor: '#8B6F5F',
  },
  loginButtonLoading: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: 17,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
  },
  loginButtonTextActive: {
    color: '#FFFFFF',
  },
});

