import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
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
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NameInputScreen() {
  const [name, setName] = useState('');
  const [showGreeting, setShowGreeting] = useState(false);
  const containerOpacity = useSharedValue(0);
  const greetingOpacity = useSharedValue(0);
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
        // Поднимаем сразу до финальной позиции только один раз
        if (!keyboardShownRef.current) {
          keyboardShownRef.current = true;
          const offset = Platform.OS === 'android' ? -85 : -110;
          
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

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const inputAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const greetingAnimatedStyle = useAnimatedStyle(() => ({
    opacity: greetingOpacity.value,
  }));

  const handleDismissKeyboard = () => {
    Keyboard.dismiss();
    
    if (Platform.OS === 'android') {
      // Для Android используем очень плавную timing-анимацию с bezier кривой
      contentTranslateY.value = withTiming(0, {
        duration: 300,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Плавная кривая как на iOS
      });
    } else {
      // Для iOS используем плавную spring-анимацию
      contentTranslateY.value = withSpring(0, {
        damping: 30,
        stiffness: 40,
        mass: 0.8,
      });
    }
  };

  const handleContinue = async () => {
    if (name.trim().length === 0) {
      return;
    }

    // Скрываем клавиатуру перед запуском анимации
    Keyboard.dismiss();
    
    // Используем одинаковую плавную spring-анимацию для Android и iOS
    contentTranslateY.value = withSpring(0, {
      damping: 30,
      stiffness: 40,
      mass: 0.8,
    });

    try {
      const trimmedName = name.trim();
      await AsyncStorage.setItem('@user_name', trimmedName);
      await AsyncStorage.setItem('@is_activated', 'true');
      setShowGreeting(true);
      
      const greetingShowDuration = Platform.OS === 'android' ? 400 : 350;
      const greetingHideDuration = Platform.OS === 'android' ? 300 : 250;
      const greetingDelay = Platform.OS === 'android' ? 1200 : 1000;
      const navigationDelay = Platform.OS === 'android' ? 350 : 260;
      
      greetingOpacity.value = withTiming(1, { 
        duration: greetingShowDuration,
        easing: Easing.out(Easing.ease),
      });
      
      setTimeout(() => {
        greetingOpacity.value = withTiming(0, { 
          duration: greetingHideDuration,
          easing: Easing.in(Easing.ease),
        });
        setTimeout(() => {
          if (Platform.OS === 'android') {
            // Небольшая задержка для плавного перехода на Android
            InteractionManager.runAfterInteractions(() => {
              router.replace('/(tabs)');
            });
          } else {
            router.replace('/(tabs)');
          }
        }, navigationDelay);
      }, greetingDelay);
    } catch (error) {
      console.error('Error saving name:', error);
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
            <View style={styles.innerContent}>
              <Animated.View style={[styles.header, inputAnimatedStyle]}>
                <Text style={styles.title}>Как вас зовут?</Text>
                <Text style={styles.subtitle}>
                  Мы хотим знать, как обращаться к вам в приложении
                </Text>
              </Animated.View>

              <Animated.View style={[styles.inputContainer, inputAnimatedStyle]}>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Введите ваше имя"
                  placeholderTextColor="#B8A89A"
                  autoFocus
                  autoCapitalize="words"
                  autoCorrect={false}
                  onSubmitEditing={handleContinue}
                />
              </Animated.View>

              <Animated.View style={inputAnimatedStyle}>
                <TouchableOpacity
                  style={[
                    styles.continueButton,
                    name.trim().length > 0 && styles.continueButtonActive,
                  ]}
                  onPress={handleContinue}
                  activeOpacity={0.7}
                  disabled={name.trim().length === 0}
                >
                  <Text
                    style={[
                      styles.continueButtonText,
                      name.trim().length > 0 && styles.continueButtonTextActive,
                    ]}
                  >
                    Продолжить
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>

      <Animated.View
        pointerEvents={showGreeting ? 'auto' : 'none'}
        style={[styles.greetingOverlay, greetingAnimatedStyle]}
      >
        <LinearGradient
          colors={['rgba(250, 248, 245, 0.98)', 'rgba(245, 239, 233, 0.98)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.greetingContent}>
          <Text style={styles.greetingTitle}>Добро пожаловать</Text>
          <Text style={styles.greetingName}>{name.trim()}</Text>
        </View>
      </Animated.View>
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
    paddingHorizontal: 32,
  },
  innerContent: {
    width: '100%',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
    width: '100%',
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
  subtitle: {
    fontSize: 16,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    textAlign: 'center',
    opacity: 0.8,
    paddingHorizontal: 20,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 32,
  },
  input: {
    width: '100%',
    height: 60,
    borderWidth: 2,
    borderColor: '#D4C4B5',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    fontSize: 19,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  continueButton: {
    backgroundColor: '#E8DAD0',
    paddingVertical: 18,
    paddingHorizontal: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 220,
    opacity: 0.5,
  },
  continueButtonActive: {
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
  continueButtonText: {
    color: '#B8A89A',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  continueButtonTextActive: {
    color: '#FFFFFF',
  },
  greetingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  greetingContent: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
    paddingVertical: 30,
    paddingTop: 40,
  },
  greetingTitle: {
    fontSize: 28,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
    lineHeight: 40,
    paddingTop: Platform.OS === 'ios' ? 8 : 4,
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      textAlignVertical: 'center',
      paddingTop: 8,
    }),
  },
  greetingName: {
    fontSize: 40,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
  },
});

