import AsyncStorage from '@react-native-async-storage/async-storage';
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
  ActivityIndicator,
} from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { validateAndUseActivationKey } from '@/utils/activationKeyValidator';

const CODE_LENGTH = 6;
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const IS_TABLET = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) >= 700;
const HORIZONTAL_PADDING = 24;
const CODE_GAP = 10;
const CODE_INPUT_SIZE = Math.min(
  64,
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
      // Мягкий "pop" при вводе
      scale.value = withSequence(
        withSpring(1.08, { damping: 18, stiffness: 220 }),
        withSpring(1, { damping: 18, stiffness: 220 })
      );
    } else if (prev && !next) {
      // Мягкое "сжатие" при удалении
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
      // Убираем резкие эффекты выделения/курсора при автопереходах фокуса (особенно при backspace),
      // чтобы ввод/удаление ощущались как "плавная бегущая строка".
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

export default function CodeInputScreen() {
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
    64,
    (width - HORIZONTAL_PADDING * 2 - CODE_GAP * (CODE_LENGTH - 1)) / CODE_LENGTH
  );
  const responsiveStyles = useMemo(
    () => ({
      card: {
        maxWidth: isTablet ? 560 : 420,
        paddingHorizontal: isTablet ? 48 : 0,
        paddingVertical: isTablet ? 48 : 0,
        backgroundColor: isTablet ? 'rgba(255,255,255,0.72)' : 'transparent',
        borderRadius: isTablet ? 32 : 0,
        borderWidth: isTablet ? 1 : 0,
        shadowOpacity: isTablet ? 0.08 : 0,
      },
      header: {
        marginBottom: isTablet ? 32 : 36,
      },
      title: {
        fontSize: isTablet ? 36 : 32,
      },
      hint: {
        fontSize: isTablet ? 16 : 14,
      },
      codeContainer: {
        marginBottom: isTablet ? 36 : 32,
      },
      codeInput: {
        width: codeInputSize,
        height: codeInputSize,
        borderRadius: isTablet ? 14 : 12,
        fontSize: isTablet ? 28 : 24,
      },
      activateButton: {
        minWidth: isTablet ? 260 : 220,
      },
      activateButtonText: {
        fontSize: isTablet ? 18 : 17,
      },
    }),
    [codeInputSize, isTablet]
  );

  useEffect(() => {
    // Используем InteractionManager для Android, чтобы анимации запускались после завершения всех взаимодействий
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
        // Поднимаем контент при появлении клавиатуры
        if (!keyboardShownRef.current) {
          keyboardShownRef.current = true;
          const offset = Platform.OS === 'android' ? -85 : -75;
          
          // Используем одинаковую плавную spring-анимацию для Android и iOS
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
        
        // Используем одинаковую плавную spring-анимацию для Android и iOS
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


  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: containerOpacity.value,
    };
  });

  const inputAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: contentTranslateY.value }],
    };
  });

  const handleInputFocus = () => {
    // На Android запускаем анимацию при фокусе на поле ввода для более плавного эффекта
    if (Platform.OS === 'android' && !keyboardShownRef.current) {
      keyboardShownRef.current = true;
      const offset = -85;
      
      // Используем одинаковую плавную spring-анимацию для Android и iOS
      contentTranslateY.value = withSpring(offset, {
        damping: 30,
        stiffness: 40,
        mass: 0.8,
      });
    }
  };


  const handleCodeChange = (value: string, index: number) => {
    // Разрешаем только цифры и буквы
    const sanitizedValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    if (sanitizedValue.length > 1) {
      // Если вставлен код целиком
      const chars = sanitizedValue.split('').slice(0, CODE_LENGTH);
      const newCode = [...code];
      chars.forEach((char, i) => {
        if (index + i < CODE_LENGTH) {
          newCode[index + i] = char;
        }
      });
      setCode(newCode);
      
      // Фокус на последнее заполненное поле
      const nextIndex = Math.min(index + chars.length, CODE_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
    } else {
      // Односимвольный ввод
      const newCode = [...code];
      newCode[index] = sanitizedValue;
      setCode(newCode);

      // Переход к следующему полю
      if (sanitizedValue && index < CODE_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }

    setError(false);
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key !== 'Backspace') return;

    // Если текущая ячейка уже пустая — делаем удаление "в один шаг":
    // переносим фокус назад и сразу очищаем предыдущую ячейку.
    if (code[index]) return;
    if (index <= 0) return;

    const prevIndex = index - 1;
    const nextCode = [...code];
    nextCode[prevIndex] = '';
    setCode(nextCode);
    setError(false);
    inputRefs.current[prevIndex]?.focus();
  };

  const handleDismissKeyboard = () => {
    Keyboard.dismiss();
    
    // Используем одинаковую плавную spring-анимацию для Android и iOS
    contentTranslateY.value = withSpring(0, {
      damping: 30,
      stiffness: 40,
      mass: 0.8,
    });
  };

  const handleActivate = async () => {
    const fullCode = code.join('');
    
    if (fullCode.length !== CODE_LENGTH) {
      setError(true);
      return;
    }

    // Скрываем клавиатуру
    Keyboard.dismiss();
    
    // Используем одинаковую плавную spring-анимацию для Android и iOS
    contentTranslateY.value = withSpring(0, {
      damping: 30,
      stiffness: 40,
      mass: 0.8,
    });

    setIsLoading(true);
    setError(false);

    try {
      // Проверяем и используем ключ активации из activation-keys.json
      const result = await validateAndUseActivationKey(fullCode);
      
      if (result.valid) {
        // Ключ валиден и помечен как использованный
        // Сохраняем код и переходим к вводу имени
        try {
          await AsyncStorage.setItem('@activation_code', fullCode);
          await AsyncStorage.setItem('@is_activated', 'true');
          
          // Небольшая задержка для завершения spring-анимации
          setTimeout(() => {
            if (Platform.OS === 'android') {
              setTimeout(() => {
                router.replace('/name-input');
              }, 100);
            } else {
              router.replace('/name-input');
            }
          }, 300);
        } catch (err) {
          console.error('Error saving code:', err);
          setIsLoading(false);
          Alert.alert('Ошибка', 'Не удалось сохранить код активации');
        }
      } else {
        // Ключ невалиден или уже использован
        setIsLoading(false);
        const errorMessage = result.message || 'Код активации неверен или уже был использован';
        
        Alert.alert(
          'Неверный код',
          `${errorMessage}\n\nПроверьте код на вкладыше внутри коробки или обратитесь в поддержку.`,
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
    } catch (error) {
      console.error('Error validating activation key:', error);
      setIsLoading(false);
      Alert.alert(
        'Ошибка',
        'Не удалось проверить код активации. Попробуйте позже.',
        [
          {
            text: 'OK',
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
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

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
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.card, responsiveStyles.card]}>
              <Animated.View style={[styles.header, responsiveStyles.header, inputAnimatedStyle]}>
                <Text style={[styles.title, responsiveStyles.title]}>Введите код доступа</Text>
                <Text style={[styles.hint, responsiveStyles.hint]}>
                  Код указан на вкладыше внутри коробки
                </Text>
              </Animated.View>

              {/* Поля ввода кода */}
              <Animated.View style={[styles.codeContainer, responsiveStyles.codeContainer, inputAnimatedStyle]}>
                {code.map((digit, index) => (
                  <CodeCell
                    key={index}
                    index={index}
                    value={digit}
                    hasError={error}
                    autoFocus={index === 0}
                    onChangeText={handleCodeChange}
                    onKeyPress={handleKeyPress}
                    onFocusAny={handleInputFocus}
                    setRef={(ref, i) => {
                      inputRefs.current[i] = ref;
                    }}
                    inputStyle={responsiveStyles.codeInput}
                  />
                ))}
              </Animated.View>

              {/* Кнопка активации */}
              <Animated.View style={inputAnimatedStyle}>
                <TouchableOpacity
                  style={[
                    styles.activateButton,
                    responsiveStyles.activateButton,
                    code.join('').length === CODE_LENGTH && styles.activateButtonActive,
                    isLoading && styles.activateButtonLoading,
                  ]}
                  onPress={handleActivate}
                  activeOpacity={0.7}
                  disabled={code.join('').length !== CODE_LENGTH || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text
                      style={[
                        styles.activateButtonText,
                        responsiveStyles.activateButtonText,
                        code.join('').length === CODE_LENGTH && styles.activateButtonTextActive,
                      ]}
                    >
                      Активировать
                    </Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0EB', // Фон на случай, если градиент не покрывает весь экран
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
  header: {
    alignItems: 'center',
    marginBottom: IS_TABLET ? 32 : 36,
  },
  card: {
    width: '100%',
    maxWidth: IS_TABLET ? 560 : 420,
    alignItems: 'center',
    paddingHorizontal: IS_TABLET ? 48 : 0,
    paddingVertical: IS_TABLET ? 48 : 0,
    backgroundColor: IS_TABLET ? 'rgba(255,255,255,0.72)' : 'transparent',
    borderRadius: IS_TABLET ? 32 : 0,
    borderWidth: IS_TABLET ? 1 : 0,
    borderColor: 'rgba(139, 111, 95, 0.12)',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: IS_TABLET ? 0.08 : 0,
    shadowRadius: 32,
  },
  title: {
    fontSize: IS_TABLET ? 36 : 32,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
    marginBottom: 12,
    textAlign: 'center',
  },
  hint: {
    fontSize: IS_TABLET ? 16 : 14,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    textAlign: 'center',
    opacity: 0.7,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: CODE_GAP,
    marginBottom: IS_TABLET ? 36 : 32,
  },
  codeInput: {
    width: CODE_INPUT_SIZE,
    height: CODE_INPUT_SIZE,
    borderWidth: 2,
    borderColor: '#D4C4B5',
    borderRadius: IS_TABLET ? 14 : 12,
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
    fontSize: IS_TABLET ? 28 : 24,
    fontWeight: '600',
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Courier',
      android: 'monospace',
      default: 'monospace',
    }),
    // Исправления для Android - правильное отображение текста
    ...(Platform.OS === 'android' && {
      textAlignVertical: 'center',
      includeFontPadding: false,
      paddingVertical: 0,
      paddingHorizontal: 0,
      lineHeight: 28, // Увеличено для лучшего отображения
    }),
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  codeInputFilled: {
    borderColor: '#C9A89A',
    backgroundColor: '#FAF8F5',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  codeInputError: {
    borderColor: '#D9776C',
  },
  activateButton: {
    backgroundColor: '#E8DAD0',
    paddingVertical: 18,
    paddingHorizontal: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: IS_TABLET ? 260 : 220,
    opacity: 0.5,
  },
  activateButtonActive: {
    backgroundColor: '#C9A89A',
    opacity: 1,
    shadowColor: '#8B6F5F',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  activateButtonText: {
    color: '#B8A89A',
    fontSize: IS_TABLET ? 18 : 17,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  activateButtonTextActive: {
    color: '#FFFFFF',
  },
  activateButtonLoading: {
    opacity: 0.8,
  },
});

