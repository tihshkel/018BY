import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
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
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ActivationScreen() {
  const [showOptions, setShowOptions] = useState(false);
  const logoOpacity = useSharedValue(0);
  const logoY = useSharedValue(-20);
  const textOpacity = useSharedValue(0);
  const textY = useSharedValue(10);
  const option1Opacity = useSharedValue(0);
  const option1Y = useSharedValue(20);
  const option2Opacity = useSharedValue(0);
  const option2Y = useSharedValue(20);

  useEffect(() => {
    // Анимация появления логотипа
    logoOpacity.value = withTiming(1, { duration: 800 });
    logoY.value = withSpring(0, { damping: 15, stiffness: 100 });

    // Анимация появления текста
    textOpacity.value = withDelay(300, withTiming(1, { duration: 600 }));
    textY.value = withDelay(300, withSpring(0, { damping: 15, stiffness: 100 }));

    // Показ вариантов через 1.5 секунды
    setTimeout(() => {
      setShowOptions(true);
      option1Opacity.value = withDelay(100, withTiming(1, { duration: 500 }));
      option1Y.value = withDelay(100, withSpring(0, { damping: 12, stiffness: 100 }));
      
      option2Opacity.value = withDelay(200, withTiming(1, { duration: 500 }));
      option2Y.value = withDelay(200, withSpring(0, { damping: 12, stiffness: 100 }));
    }, 1500);
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: logoOpacity.value,
      transform: [{ translateY: logoY.value }],
    };
  });

  const textAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: textOpacity.value,
      transform: [{ translateY: textY.value }],
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
    router.push('/code-input');
  };

  const handleWantToBuy = () => {
    router.push('/purchase');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Логотип */}
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

        {/* Текст */}
        <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
          <Text style={styles.subtitle}>
            Сохраняйте моменты, которые хочется пережить снова
          </Text>
        </Animated.View>

        {/* Варианты действий */}
        {showOptions && (
          <View style={styles.optionsContainer}>
            <Animated.View style={option1AnimatedStyle}>
              <TouchableOpacity
                style={styles.optionCard}
                onPress={handleHasCode}
                activeOpacity={0.85}
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
                activeOpacity={0.85}
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
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
    marginBottom: 64,
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
    width: '100%',
    maxWidth: 400,
    gap: 12,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F0E8E0',
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

