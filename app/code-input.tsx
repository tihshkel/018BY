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
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const CODE_LENGTH = 6;
const SCREEN_WIDTH = Dimensions.get('window').width;
const HORIZONTAL_PADDING = 24;
const CODE_GAP = 10;
const CODE_INPUT_SIZE = Math.min(
  64,
  (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CODE_GAP * (CODE_LENGTH - 1)) /
    CODE_LENGTH
);

export default function CodeInputScreen() {
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const containerOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(0);
  const keyboardShownRef = useRef(false);

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
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
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

    // Временная проверка кода (в реальном приложении это будет запрос к API)
    // Пример: правильный код "ABCDEF" или "123456"
    const validCodes = ['ABCDEF', '123456', '000000'];
    
    // На Android ждем завершения анимации перед переходом
    const navigateToNameInput = async () => {
      try {
        await AsyncStorage.setItem('@activation_code', fullCode);
        if (Platform.OS === 'android') {
          // Небольшая задержка для плавного перехода на Android
          setTimeout(() => {
            router.replace('/name-input');
          }, 100);
        } else {
          router.replace('/name-input');
        }
      } catch (err) {
        console.error('Error saving code:', err);
      }
    };
    
    if (validCodes.includes(fullCode)) {
      // Сохраняем код и переходим к вводу имени
      // Небольшая задержка для завершения spring-анимации
      setTimeout(navigateToNameInput, 300);
    } else {
      Alert.alert(
        'Неверный код',
        'Проверьте код или купите доступ за $10',
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
          {
            text: 'Купить доступ',
            onPress: () => router.replace('/purchase'),
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
          <TouchableWithoutFeedback onPress={() => {}}>
            <View>
              <Animated.View style={[styles.header, inputAnimatedStyle]}>
                <Text style={styles.title}>Введите код доступа</Text>
                <Text style={styles.hint}>
                  Код указан на вкладыше внутри коробки
                </Text>
              </Animated.View>

              {/* Поля ввода кода */}
              <Animated.View style={[styles.codeContainer, inputAnimatedStyle]}>
                {code.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => {
                      inputRefs.current[index] = ref;
                    }}
                    style={[
                      styles.codeInput,
                      error && styles.codeInputError,
                      code[index] && styles.codeInputFilled,
                    ]}
                    value={digit}
                    onChangeText={(value) => handleCodeChange(value, index)}
                    onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                    onFocus={handleInputFocus}
                    keyboardType="default"
                    maxLength={1}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    autoFocus={index === 0}
                    selectTextOnFocus
                    textAlignVertical="center"
                  />
                ))}
              </Animated.View>

              {/* Кнопка активации */}
              <Animated.View style={inputAnimatedStyle}>
                <TouchableOpacity
                  style={[
                    styles.activateButton,
                    code.join('').length === CODE_LENGTH && styles.activateButtonActive,
                  ]}
                  onPress={handleActivate}
                  activeOpacity={0.7}
                  disabled={code.join('').length !== CODE_LENGTH}
                >
                  <Text
                    style={[
                      styles.activateButtonText,
                      code.join('').length === CODE_LENGTH && styles.activateButtonTextActive,
                    ]}
                  >
                    Активировать
                  </Text>
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
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  title: {
    fontSize: 32,
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
    fontSize: 14,
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
    marginBottom: 32,
  },
  codeInput: {
    width: CODE_INPUT_SIZE,
    height: CODE_INPUT_SIZE,
    borderWidth: 2,
    borderColor: '#D4C4B5',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
    fontSize: 24,
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
    minWidth: 220,
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
    fontSize: 17,
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
});

