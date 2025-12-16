import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  useEffect(() => {
    containerOpacity.value = withTiming(1, { duration: 400 });
  }, []);

  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: containerOpacity.value,
    };
  });

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

  const handleActivate = async () => {
    const fullCode = code.join('');
    
    if (fullCode.length !== CODE_LENGTH) {
      setError(true);
      return;
    }

    // Временная проверка кода (в реальном приложении это будет запрос к API)
    // Пример: правильный код "ABCDEF" или "123456"
    const validCodes = ['ABCDEF', '123456', '000000'];
    
    if (validCodes.includes(fullCode)) {
      // Сохраняем код и переходим к вводу имени
      try {
        await AsyncStorage.setItem('@activation_code', fullCode);
        router.replace('/name-input');
      } catch (err) {
        console.error('Error saving code:', err);
      }
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

      <Animated.View style={[styles.content, containerAnimatedStyle]}>
        <View style={styles.header}>
          <Text style={styles.title}>Введите код доступа</Text>
          <Text style={styles.hint}>
            Код указан на вкладыше внутри коробки
          </Text>
        </View>

        {/* Поля ввода кода */}
        <View style={styles.codeContainer}>
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
              keyboardType="default"
              maxLength={1}
              autoCapitalize="characters"
              autoCorrect={false}
              selectTextOnFocus
            />
          ))}
        </View>

        {/* Кнопка активации */}
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

