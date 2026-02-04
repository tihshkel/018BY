import { pushAccountDataToCloud, syncAccountDataOnLogin, validateAccessCode } from '@/utils/account-sync';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Dimensions,
    InteractionManager,
    Keyboard,
    Platform,
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
const CODE_GAP = 10;
const CODE_INPUT_SIZE = Math.min(
  56,
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
          const offset = Platform.OS === 'android' ? -85 : -75;
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

    contentTranslateY.value = withSpring(0, {
      damping: 30,
      stiffness: 40,
      mass: 0.8,
    });

    try {
      // Сначала проверяем валидность кода доступа
      const isValid = await validateAccessCode(fullCode);
      
      if (!isValid) {
        setIsLoading(false);
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

      // Всегда сохраняем в облако данные текущего аккаунта перед загрузкой (в т.ч. при повторном входе по тому же коду),
      // иначе при загрузке из БД перезатрём локальные проекты/аватар/уведомления пустыми данными
      const currentCode = await AsyncStorage.getItem('@access_code');
      if (currentCode) {
        await pushAccountDataToCloud();
      }

      // Синхронизируем данные аккаунта и регистрируем устройство
      const syncResult = await syncAccountDataOnLogin(fullCode);

      if (syncResult.success) {
        // Данные успешно синхронизированы, устройство зарегистрировано
        // Переходим в приложение
        if (Platform.OS === 'android') {
          setTimeout(() => {
            router.replace('/(tabs)');
          }, 100);
        } else {
          router.replace('/(tabs)');
        }
      } else {
        setIsLoading(false);
        if (syncResult.error === 'DEVICE_LIMIT') {
          Alert.alert(
            'Лимит устройств',
            'К этому аккаунту уже привязано максимальное количество устройств (4 устройства). Для добавления нового устройства необходимо удалить одно из существующих устройств или обратиться в техническую поддержку.'
          );
        } else if (syncResult.error === 'INVALID_CODE') {
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
        } else {
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
        }
      }
    } catch (err) {
      console.error('Error during account login:', err);
      setIsLoading(false);
      Alert.alert(
        'Ошибка',
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
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient
        colors={['#FAF8F5', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.content, containerAnimatedStyle]}>
        <TouchableWithoutFeedback onPress={handleDismissKeyboard}>
          <Animated.View style={contentAnimatedStyle}>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={24} color="#8B6F5F" />
              </TouchableOpacity>
            </View>

            <View style={styles.mainContent}>
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
            </View>
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
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
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
    marginBottom: 48,
    paddingHorizontal: 20,
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
    textAlign: 'center',
    fontSize: 24,
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

