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
import { Image } from 'expo-image';
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

export default function ActivationScreen() {
  const [showOptions, setShowOptions] = useState(false);
  const [buttonsEnabled, setButtonsEnabled] = useState(false);
  const logoOpacity = useSharedValue(0);
  const logoY = useSharedValue(-20);
  const logoShiftY = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textY = useSharedValue(10);
  const textShiftY = useSharedValue(0);
  const option1Opacity = useSharedValue(0);
  const option1Y = useSharedValue(20);
  const option2Opacity = useSharedValue(0);
  const option2Y = useSharedValue(20);

  useEffect(() => {
    const startAnimations = () => {
      // Адаптируем длительность анимаций для Android
      const logoDuration = Platform.OS === 'android' ? 1500 : 2500;
      const textDelay = Platform.OS === 'android' ? 600 : 1000;
      const textDuration = Platform.OS === 'android' ? 1300 : 2200;
      const buttonsDelay = Platform.OS === 'android' ? 2500 : 4000;
      const shiftDuration = Platform.OS === 'android' ? 1800 : 2800;
      const buttonDuration = Platform.OS === 'android' ? 1800 : 3000;
      const buttonsEnableDelay = Platform.OS === 'android' ? 2800 : 4200;

      // Очень плавное появление логотипа
      logoOpacity.value = withTiming(1, { 
        duration: logoDuration,
        easing: Platform.OS === 'android' 
          ? Easing.out(Easing.ease) 
          : Easing.bezier(0.2, 0, 0.2, 1),
      });
      logoY.value = withSpring(0, { 
        damping: Platform.OS === 'android' ? 25 : 30, 
        stiffness: Platform.OS === 'android' ? 50 : 40,
      });

      // Плавное появление текста после логотипа
      textOpacity.value = withDelay(textDelay, withTiming(1, { 
        duration: textDuration,
        easing: Platform.OS === 'android' 
          ? Easing.out(Easing.ease) 
          : Easing.bezier(0.2, 0, 0.2, 1),
      }));
      textY.value = withDelay(textDelay, withSpring(0, { 
        damping: Platform.OS === 'android' ? 25 : 30, 
        stiffness: Platform.OS === 'android' ? 50 : 40,
      }));

      // Показываем кнопки сразу, но они будут невидимыми
      setShowOptions(true);
      
      // Очень плавное появление кнопок после того как логотип и текст полностью появились
      setTimeout(() => {
        // Плавно сдвигаем логотип и текст вверх одновременно с появлением кнопок
        logoShiftY.value = withTiming(-90, {
          duration: shiftDuration,
          easing: Platform.OS === 'android' 
            ? Easing.out(Easing.ease) 
            : Easing.bezier(0.16, 1, 0.3, 1),
        });
        textShiftY.value = withTiming(-90, {
          duration: shiftDuration,
          easing: Platform.OS === 'android' 
            ? Easing.out(Easing.ease) 
            : Easing.bezier(0.16, 1, 0.3, 1),
        });
        
        // Включаем кнопки сразу, когда они начинают появляться
        setButtonsEnabled(true);
        
        // Очень плавное появление первой кнопки с задержкой
        option1Opacity.value = withDelay(200, withTiming(1, { 
          duration: buttonDuration,
          easing: Platform.OS === 'android' 
            ? Easing.out(Easing.ease) 
            : Easing.bezier(0.16, 1, 0.3, 1),
        }));
        option1Y.value = withDelay(200, withSpring(0, { 
          damping: Platform.OS === 'android' ? 35 : 40, 
          stiffness: Platform.OS === 'android' ? 30 : 25,
          mass: Platform.OS === 'android' ? 1.0 : 1.2,
        }));
        
        // Очень плавное появление второй кнопки с большей задержкой
        option2Opacity.value = withDelay(600, withTiming(1, { 
          duration: buttonDuration,
          easing: Platform.OS === 'android' 
            ? Easing.out(Easing.ease) 
            : Easing.bezier(0.16, 1, 0.3, 1),
        }));
        option2Y.value = withDelay(600, withSpring(0, { 
          damping: Platform.OS === 'android' ? 35 : 40, 
          stiffness: Platform.OS === 'android' ? 30 : 25,
          mass: Platform.OS === 'android' ? 1.0 : 1.2,
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

  const logoAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: logoOpacity.value,
      transform: [{ translateY: logoY.value + logoShiftY.value }],
    };
  });

  const textAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: textOpacity.value,
      transform: [{ translateY: textY.value + textShiftY.value }],
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

  const handleHasCode = () => {
    if (!buttonsEnabled) return;
    router.push('/code-input');
  };

  const handleWantToBuy = () => {
    if (!buttonsEnabled) return;
    router.push('/purchase');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Логотип и текст - по центру экрана */}
        <View style={styles.centerContent}>
          <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
            <Image
              source={require('@/assets/images/logo-for-activaty-page.png')}
              style={styles.logoImage}
              contentFit="contain"
              priority="high"
              cachePolicy="disk"
              transition={0}
              fadeDuration={0}
            />
          </Animated.View>

          <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
            <Text style={styles.subtitle}>
              Сохраняйте моменты, которые хочется пережить снова
            </Text>
          </Animated.View>
        </View>

        {/* Варианты действий - внизу */}
        {showOptions && (
          <View style={styles.optionsContainer}>
            <Animated.View style={option1AnimatedStyle}>
              <TouchableOpacity
                style={styles.optionCard}
                onPress={handleHasCode}
                activeOpacity={Platform.OS === 'ios' ? 0.6 : 0.85}
                disabled={!buttonsEnabled}
              >
                <View style={styles.optionIconContainer}>
                  <Ionicons name="key-outline" size={28} color="#C9A89A" />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>У меня есть код</Text>
                  <Text style={styles.optionSubtitle}>Активировать приложение</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#D4C4B5" />
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={option2AnimatedStyle}>
              <TouchableOpacity
                style={styles.optionCard}
                onPress={handleWantToBuy}
                activeOpacity={Platform.OS === 'ios' ? 0.6 : 0.85}
                disabled={!buttonsEnabled}
              >
                <View style={styles.optionIconContainer}>
                  <Ionicons name="storefront-outline" size={28} color="#C9A89A" />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Приобрести приложение</Text>
                  <Text style={styles.optionSubtitle}>$10 • Полный доступ</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#D4C4B5" />
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}
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
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  centerContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoImage: {
    width: 200,
    height: 200,
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    maxWidth: 320,
  },
  subtitle: {
    fontSize: 18,
    color: '#6B5D4F',
    textAlign: 'center',
    lineHeight: 26,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    letterSpacing: 0.3,
    opacity: 0.85,
  },
  optionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 24,
    right: 24,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    gap: 12,
    paddingBottom: 40,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
    shadowColor: '#8B6F5F',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 3,
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 17,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '500',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    opacity: 0.8,
  },
});

