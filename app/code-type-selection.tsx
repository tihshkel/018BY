import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  InteractionManager,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CodeTypeSelectionScreen() {
  const [buttonsEnabled, setButtonsEnabled] = useState(false);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);
  const subtitleY = useSharedValue(20);
  const option1Opacity = useSharedValue(0);
  const option1Y = useSharedValue(30);
  const option2Opacity = useSharedValue(0);
  const option2Y = useSharedValue(30);

  useEffect(() => {
    const startAnimations = () => {
      const titleDelay = Platform.OS === 'android' ? 100 : 200;
      const subtitleDelay = Platform.OS === 'android' ? 400 : 600;
      const buttonsDelay = Platform.OS === 'android' ? 800 : 1200;
      const duration = Platform.OS === 'android' ? 600 : 800;
      const buttonDuration = Platform.OS === 'android' ? 700 : 900;

      // Появление заголовка
      titleOpacity.value = withDelay(titleDelay, withTiming(1, { 
        duration,
        easing: Easing.out(Easing.ease),
      }));
      titleY.value = withDelay(titleDelay, withSpring(0, { 
        damping: 25, 
        stiffness: 50,
      }));

      // Появление подзаголовка
      subtitleOpacity.value = withDelay(subtitleDelay, withTiming(1, { 
        duration,
        easing: Easing.out(Easing.ease),
      }));
      subtitleY.value = withDelay(subtitleDelay, withSpring(0, { 
        damping: 25, 
        stiffness: 50,
      }));

      // Появление кнопок
      setTimeout(() => {
        setButtonsEnabled(true);
        
        option1Opacity.value = withDelay(200, withTiming(1, { 
          duration: buttonDuration,
          easing: Easing.out(Easing.ease),
        }));
        option1Y.value = withDelay(200, withSpring(0, { 
          damping: 35, 
          stiffness: 30,
          mass: 1.0,
        }));
        
        option2Opacity.value = withDelay(500, withTiming(1, { 
          duration: buttonDuration,
          easing: Easing.out(Easing.ease),
        }));
        option2Y.value = withDelay(500, withSpring(0, { 
          damping: 35, 
          stiffness: 30,
          mass: 1.0,
        }));
      }, buttonsDelay);
    };

    if (Platform.OS === 'android') {
      InteractionManager.runAfterInteractions(() => {
        startAnimations();
      });
    } else {
      startAnimations();
    }
  }, []);

  const titleAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: titleOpacity.value,
      transform: [{ translateY: titleY.value }],
    };
  });

  const subtitleAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: subtitleOpacity.value,
      transform: [{ translateY: subtitleY.value }],
    };
  });

  const option1AnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: option1Opacity.value,
      transform: [{ translateY: option1Y.value }],
    };
  });

  const option2AnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: option2Opacity.value,
      transform: [{ translateY: option2Y.value }],
    };
  });

  const handleAccountLogin = () => {
    if (!buttonsEnabled) return;
    router.push('/account-code-input');
  };

  const handleAppActivation = () => {
    if (!buttonsEnabled) return;
    router.push('/code-input');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Заголовок и описание */}
        <View style={styles.headerContainer}>
          <Animated.View style={[styles.titleContainer, titleAnimatedStyle]}>
            <View style={styles.iconContainer}>
              <Ionicons name="key-outline" size={32} color="#8B6F5F" />
            </View>
            <Text style={styles.title}>Введите код</Text>
          </Animated.View>

          <Animated.View style={[styles.subtitleContainer, subtitleAnimatedStyle]}>
            <Text style={styles.subtitle}>
              Выберите, какой код вы хотите ввести
            </Text>
          </Animated.View>
        </View>

        {/* Варианты действий */}
        <View style={styles.optionsContainer}>
          <Animated.View style={option1AnimatedStyle}>
            <TouchableOpacity
              style={styles.optionCard}
              onPress={handleAccountLogin}
              activeOpacity={Platform.OS === 'ios' ? 0.6 : 0.85}
              disabled={!buttonsEnabled}
            >
              <View style={styles.optionIconContainer}>
                <Ionicons name="person-outline" size={28} color="#C9A89A" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Войти в аккаунт</Text>
                <Text style={styles.optionDescription}>
                  Введите ваш персональный код, который находится в профиле. Этот код был сгенерирован при первой регистрации и позволяет войти в ваш аккаунт на любом устройстве.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#D4C4B5" />
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={option2AnimatedStyle}>
            <TouchableOpacity
              style={styles.optionCard}
              onPress={handleAppActivation}
              activeOpacity={Platform.OS === 'ios' ? 0.6 : 0.85}
              disabled={!buttonsEnabled}
            >
              <View style={styles.optionIconContainer}>
                <Ionicons name="lock-closed-outline" size={28} color="#C9A89A" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Активировать приложение</Text>
                <Text style={styles.optionDescription}>
                  Введите одноразовый код доступа, который пришёл вместе с вашим заказом. Этот код можно использовать только один раз для регистрации и первого входа в приложение.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#D4C4B5" />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  headerContainer: {
    paddingTop: 40,
    paddingBottom: 32,
    alignItems: 'center',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
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
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  subtitleContainer: {
    paddingHorizontal: 20,
    maxWidth: 400,
  },
  subtitle: {
    fontSize: 16,
    color: '#9B8E7F',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    opacity: 0.9,
  },
  optionsContainer: {
    flex: 1,
    gap: 16,
    paddingBottom: 40,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 0,
    shadowColor: '#8B6F5F',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 3,
    minHeight: 140,
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
    flexShrink: 0,
  },
  optionContent: {
    flex: 1,
    paddingRight: 12,
  },
  optionTitle: {
    fontSize: 18,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  optionDescription: {
    fontSize: 14,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    lineHeight: 20,
    opacity: 0.85,
  },
});

