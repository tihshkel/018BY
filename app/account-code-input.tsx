import { loginAndEnterFast } from '@/utils/account-sync';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  InteractionManager,
  Keyboard,
  Platform,
  StyleSheet,
  StyleProp,
  Text,
  TextInput,
  TextStyle,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
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
const SCREEN_HEIGHT = Dimensions.get('window').height;
const IS_TABLET = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) >= 700;
const HORIZONTAL_PADDING = 24;
const CODE_GAP = 10;
const CODE_INPUT_SIZE = Math.min(
  IS_TABLET ? 60 : 56,
  (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CODE_GAP * (CODE_LENGTH - 1)) /
    CODE_LENGTH
);

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
  inputStyle?: StyleProp<TextStyle>;
}) {
  const { index, value, hasError, autoFocus, onChangeText, onKeyPress, onFocusAny, setRef, inputStyle } = props;

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
      style={[styles.codeInput, inputStyle, animatedStyle]}
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
  const { width, height } = useWindowDimensions();
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const containerOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(0);
  const keyboardShownRef = useRef(false);
  const isTablet = Math.min(width, height) >= 700;
  const codeInputSize = Math.min(
    isTablet ? 60 : 56,
    (width - HORIZONTAL_PADDING * 2 - CODE_GAP * (CODE_LENGTH - 1)) / CODE_LENGTH
  );
  const responsiveStyles = useMemo(
    () => ({
      centeredBlock: {
        maxWidth: isTablet ? 680 : 400,
        paddingHorizontal: isTablet ? 48 : 0,
        paddingVertical: isTablet ? 48 : 0,
        paddingBottom: isTablet ? 48 : 40,
        marginTop: isTablet ? 0 : -12,
        backgroundColor: isTablet ? 'rgba(255,255,255,0.72)' : 'transparent',
        borderRadius: isTablet ? 32 : 0,
        borderWidth: isTablet ? 1 : 0,
        shadowOpacity: isTablet ? 0.08 : 0,
      },
      iconContainer: {
        width: isTablet ? 104 : 96,
        height: isTablet ? 104 : 96,
        borderRadius: isTablet ? 28 : 24,
        marginBottom: isTablet ? 24 : 28,
      },
      title: {
        fontSize: isTablet ? 32 : 28,
      },
      subtitle: {
        fontSize: isTablet ? 18 : 16,
        lineHeight: isTablet ? 28 : 24,
        marginBottom: isTablet ? 32 : 36,
        paddingHorizontal: isTablet ? 24 : 12,
      },
      codeContainer: {
        marginBottom: isTablet ? 28 : 24,
      },
      codeInput: {
        width: codeInputSize,
        height: codeInputSize,
        borderRadius: isTablet ? 14 : 12,
        fontSize: isTablet ? 28 : 24,
      },
      loginButton: {
        maxWidth: isTablet ? 464 : 400,
        paddingVertical: isTablet ? 20 : 18,
      },
      loginButtonText: {
        fontSize: isTablet ? 18 : 17,
      },
    }),
    [codeInputSize, isTablet]
  );

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
    
    const newCode = [...code];
    newCode[index] = value.toUpperCase();
    setCode(newCode);

    if (value && index < CODE_LENGTH - 1) {
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
        <TouchableWithoutFeedback onPress={handleDismissKeyboard}>
          <Animated.View style={[styles.centeredBlock, responsiveStyles.centeredBlock, contentAnimatedStyle]}>
            <View style={[styles.iconContainer, responsiveStyles.iconContainer]}>
              <Ionicons name="person-outline" size={48} color="#8B6F5F" />
            </View>

            <Text style={[styles.title, responsiveStyles.title]}>Вход в аккаунт</Text>
            <Text style={[styles.subtitle, responsiveStyles.subtitle]}>
              Введите код доступа, который был сгенерирован на вашем предыдущем устройстве
            </Text>

            <View style={[styles.codeContainer, responsiveStyles.codeContainer]}>
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
                  inputStyle={responsiveStyles.codeInput}
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
                responsiveStyles.loginButton,
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
                  responsiveStyles.loginButtonText,
                  (code.join('').length === CODE_LENGTH && !isLoading) && styles.loginButtonTextActive,
                ]}
              >
                {isLoading ? 'Вход...' : 'Войти в аккаунт'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
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
    maxWidth: IS_TABLET ? 680 : 400,
    paddingHorizontal: IS_TABLET ? 48 : 0,
    paddingVertical: IS_TABLET ? 48 : 0,
    paddingBottom: IS_TABLET ? 48 : 40,
    marginTop: IS_TABLET ? 0 : -12, // блок с полем ввода кода (чуть ниже, чем было -36)
    backgroundColor: IS_TABLET ? 'rgba(255,255,255,0.72)' : 'transparent',
    borderRadius: IS_TABLET ? 32 : 0,
    borderWidth: IS_TABLET ? 1 : 0,
    borderColor: 'rgba(139, 111, 95, 0.12)',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: IS_TABLET ? 0.08 : 0,
    shadowRadius: 32,
  },
  iconContainer: {
    width: IS_TABLET ? 104 : 96,
    height: IS_TABLET ? 104 : 96,
    borderRadius: IS_TABLET ? 28 : 24,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: IS_TABLET ? 24 : 28,
    borderWidth: 2,
    borderColor: '#E8DDD4',
  },
  title: {
    fontSize: IS_TABLET ? 32 : 28,
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
    fontSize: IS_TABLET ? 18 : 16,
    color: '#9B8E7F',
    textAlign: 'center',
    lineHeight: IS_TABLET ? 28 : 24,
    marginBottom: IS_TABLET ? 32 : 36,
    paddingHorizontal: IS_TABLET ? 24 : 12,
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
    marginBottom: IS_TABLET ? 28 : 24,
  },
  codeInput: {
    width: CODE_INPUT_SIZE,
    height: CODE_INPUT_SIZE,
    borderWidth: 2,
    borderRadius: IS_TABLET ? 14 : 12,
    textAlign: 'center',
    fontSize: IS_TABLET ? 28 : 24,
    fontWeight: '600',
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
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
    maxWidth: IS_TABLET ? 464 : 400,
    paddingVertical: IS_TABLET ? 20 : 18,
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
    fontSize: IS_TABLET ? 18 : 17,
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

