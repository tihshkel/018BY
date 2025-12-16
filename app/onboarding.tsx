import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { Image, ImageSource } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@has_seen_onboarding';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const scaleSize = (size: number) => {
  const guidelineBaseWidth = 375;
  return Math.round((SCREEN_WIDTH / guidelineBaseWidth) * size);
};

interface OnboardingSlide {
  id: number;
  title: string;
  subtitle: string;
  image: ImageSource;
  buttonText: string;
}

const onboardingData: OnboardingSlide[] = [
  {
    id: 1,
    title: 'Моменты ускользают…',
    subtitle: 'Но их можно сохранить. Навсегда.',
    image: require('@/assets/images/onboarding1.jpg') as ImageSource,
    buttonText: 'Далее',
  },
  {
    id: 2,
    title: 'Создавайте семейную реликвию',
    subtitle:
      'То, что вы достанете с полки через 20 лет и перелистаете с теплом в сердце.',
    image: require('@/assets/images/onboarding2.jpg') as ImageSource,
    buttonText: 'Далее',
  },
  {
    id: 3,
    title: 'Ваша история — ваша',
    subtitle:
      'Добавляйте столько фото, сколько хотите. Убирайте то, что не резонирует. И печатайте, когда захотите.',
    image: require('@/assets/images/onboarding3.jpg') as ImageSource,
    buttonText: 'Начать',
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const textOpacity = useSharedValue(0);
  const progress = useSharedValue(33.33);

  // Предзагрузка всех изображений онбординга при монтировании
  useEffect(() => {
    const preloadAllOnboardingImages = async () => {
      try {
        // Предзагружаем все изображения слайдов параллельно
        const preloadPromises = onboardingData.map(slide => 
          Image.prefetch(slide.image as number)
        );
        await Promise.all(preloadPromises);
      } catch (error) {
        console.warn('⚠️ Ошибка предзагрузки изображений онбординга:', error);
        // В случае ошибки изображения все равно будут загружаться по требованию
      }
    };

    preloadAllOnboardingImages();
  }, []);

  useEffect(() => {
    const newProgress = ((currentIndex + 1) / onboardingData.length) * 100;
    progress.value = withTiming(newProgress, {
      duration: 400,
    });
    textOpacity.value = withDelay(100, withTiming(1, { duration: 400 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  const handleNext = async () => {
    textOpacity.value = withTiming(0, { duration: 200 });
    
    setTimeout(async () => {
      if (currentIndex < onboardingData.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // Сохраняем флаг о завершении онбординга
        try {
          await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
        } catch (error) {
          console.error('Error saving onboarding status:', error);
        }
        router.replace('/activation');
      }
    }, 200);
  };

  const currentSlide = onboardingData[currentIndex];

  const textAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: textOpacity.value,
    };
  });

  const progressAnimatedStyle = useAnimatedStyle(() => {
    return {
      width: `${progress.value}%`,
    };
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.slide}>
        <View style={styles.imageWrapper}>
          <Image
            key={currentSlide.id}
            source={currentSlide.image}
            style={styles.image}
            contentFit="cover"
            priority="high"
            cachePolicy="disk"
            transition={0}
            fadeDuration={0}
            placeholderContentFit="cover"
            recyclingKey={currentSlide.id.toString()}
          />
        </View>

        <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
          <Text style={styles.title}>{currentSlide.title}</Text>
          <Text style={styles.subtitle}>{currentSlide.subtitle}</Text>
        </Animated.View>
      </View>

      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleNext}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>{currentSlide.buttonText}</Text>
        </TouchableOpacity>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  slide: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 24,
    gap: 28,
    justifyContent: 'flex-start',
  },
  imageWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  image: {
    width: scaleSize(200),
    height: scaleSize(260),
    borderRadius: 18,
    backgroundColor: '#F6EFEA',
  },
  textContainer: {
    gap: 16,
    paddingHorizontal: 4,
    alignSelf: 'center',
    maxWidth: 320,
  },
  title: {
    fontSize: scaleSize(32),
    color: '#8B6F5F',
    textAlign: 'left',
    marginBottom: 8,
    fontStyle: 'italic',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontWeight: '400',
    letterSpacing: 0.5,
    lineHeight: scaleSize(40),
    // Имитация Marck Script - декоративный почерк
    textShadowColor: 'rgba(139, 111, 95, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: scaleSize(16),
    color: '#6B5D4F',
    textAlign: 'left',
    lineHeight: scaleSize(24),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '400',
    letterSpacing: 0.3,
    opacity: 0.85,
  },
  bottomContainer: {
    paddingBottom: 56,
    paddingHorizontal: 32,
    gap: 24,
  },
  progressContainer: {
    marginBottom: 0,
  },
  progressBar: {
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(139, 111, 95, 0.2)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#B89B8B',
    borderRadius: 1,
  },
  button: {
    backgroundColor: '#C9A89A',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B6F5F',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    letterSpacing: 1,
  },
});

