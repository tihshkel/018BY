import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  InteractionManager,
  ScrollView,
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
  Easing,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, sansFont } from '@/constants/design-tokens';
import { useResponsiveLayout, type ResponsiveLayout } from '@/utils/responsive';

const ONBOARDING_KEY = '@has_seen_onboarding';

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

function createStyles(layout: ResponsiveLayout) {
  const { isTablet, isLandscape, isCompactHeight, scale, verticalScale } = layout;

  const imageWidth = isTablet ? 240 : scale(200);
  const imageHeight = isTablet ? 312 : scale(260);
  const titleSize = isTablet ? 34 : scale(32);
  const titleLineHeight = isTablet ? 42 : scale(40);
  const subtitleSize = isTablet ? 17 : scale(16);
  const subtitleLineHeight = isTablet ? 26 : scale(24);

  const slidePaddingTop = isTablet
    ? isLandscape
      ? 16
      : isCompactHeight
        ? 24
        : 40
    : verticalScale(60);

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    main: {
      flex: 1,
      alignItems: 'center',
    },
    scroll: {
      flex: 1,
      width: '100%',
    },
    scrollContent: {
      flexGrow: 1,
      width: '100%',
      maxWidth: layout.contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal: layout.horizontalPadding,
      paddingTop: slidePaddingTop,
      paddingBottom: 16,
      justifyContent: isTablet ? 'center' : 'flex-start',
    },
    slide: {
      gap: isTablet ? 32 : 28,
      alignItems: 'center',
    },
    imageWrapper: {
      width: '100%',
      alignItems: 'center',
    },
    image: {
      width: imageWidth,
      height: imageHeight,
      borderRadius: 18,
      backgroundColor: '#F6EFEA',
    },
    textContainer: {
      width: '100%',
      gap: 16,
      alignItems: isTablet ? 'center' : 'flex-start',
    },
    title: {
      fontSize: titleSize,
      color: '#8B6F5F',
      textAlign: isTablet ? 'center' : 'left',
      marginBottom: 8,
      fontFamily: sansFont('bold'),
      fontWeight: '700',
      letterSpacing: 0.5,
      lineHeight: titleLineHeight,
    },
    subtitle: {
      fontSize: subtitleSize,
      color: '#6B5D4F',
      textAlign: isTablet ? 'center' : 'left',
      lineHeight: subtitleLineHeight,
      fontFamily: Platform.select({
        ios: 'System',
        android: 'sans-serif',
        default: 'sans-serif',
      }),
      fontWeight: '400',
      letterSpacing: 0.3,
      opacity: 0.85,
      maxWidth: isTablet ? layout.contentMaxWidth : 340,
    },
    bottomContainer: {
      width: '100%',
      maxWidth: layout.contentMaxWidth,
      alignSelf: 'center',
      paddingBottom: isTablet ? 40 : 56,
      paddingHorizontal: layout.horizontalPadding,
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
      backgroundColor: colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      shadowColor: colors.primaryPressed,
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
}

export default function OnboardingScreen() {
  const layout = useResponsiveLayout();
  const styles = useMemo(
    () => createStyles(layout),
    [
      layout.width,
      layout.height,
      layout.isTablet,
      layout.isLandscape,
      layout.isCompactHeight,
      layout.contentMaxWidth,
      layout.horizontalPadding,
      layout.fontScale,
    ]
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const textOpacity = useSharedValue(0);
  const imageOpacity = useSharedValue(1);
  const slideTranslateX = useSharedValue(0);
  const imageScale = useSharedValue(1);
  const progress = useSharedValue(33.33);

  useEffect(() => {
    const preloadAllOnboardingImages = async () => {
      try {
        const preloadPromises = onboardingData.map((slide) => {
          if (typeof slide.image === 'string') {
            return Image.prefetch(slide.image);
          }
          return Promise.resolve();
        });
        await Promise.all(preloadPromises);
      } catch (error) {
        console.warn('⚠️ Ошибка предзагрузки изображений онбординга:', error);
      }
    };

    preloadAllOnboardingImages();
  }, []);

  useEffect(() => {
    const animateSlide = () => {
      const newProgress = ((currentIndex + 1) / onboardingData.length) * 100;
      const progressDuration = Platform.OS === 'android' ? 300 : 400;
      const imageDelay = Platform.OS === 'android' ? 50 : 100;
      const imageDuration = Platform.OS === 'android' ? 400 : 500;
      const textDelay = Platform.OS === 'android' ? 200 : 300;
      const textDuration = Platform.OS === 'android' ? 300 : 400;

      progress.value = withTiming(newProgress, {
        duration: progressDuration,
        easing: Easing.out(Easing.ease),
      });

      imageOpacity.value = 0;
      imageScale.value = 0.9;
      slideTranslateX.value = 50;

      imageOpacity.value = withDelay(
        imageDelay,
        withTiming(1, {
          duration: imageDuration,
          easing: Easing.out(Easing.ease),
        })
      );
      imageScale.value = withDelay(
        imageDelay,
        withSpring(1, {
          damping: Platform.OS === 'android' ? 18 : 15,
          stiffness: Platform.OS === 'android' ? 180 : 150,
        })
      );
      slideTranslateX.value = withDelay(
        imageDelay,
        withSpring(0, {
          damping: Platform.OS === 'android' ? 18 : 15,
          stiffness: Platform.OS === 'android' ? 180 : 150,
        })
      );
      textOpacity.value = withDelay(
        textDelay,
        withTiming(1, {
          duration: textDuration,
          easing: Easing.out(Easing.ease),
        })
      );
    };

    if (Platform.OS === 'android' && currentIndex > 0) {
      InteractionManager.runAfterInteractions(() => {
        animateSlide();
      });
    } else {
      animateSlide();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  const handleNext = async () => {
    const hideDuration = Platform.OS === 'android' ? 250 : 200;
    const transitionDelay = Platform.OS === 'android' ? 250 : 200;

    textOpacity.value = withTiming(0, {
      duration: hideDuration,
      easing: Easing.in(Easing.ease),
    });
    imageOpacity.value = withTiming(0, {
      duration: hideDuration,
      easing: Easing.in(Easing.ease),
    });
    slideTranslateX.value = withTiming(-50, {
      duration: hideDuration,
      easing: Easing.in(Easing.ease),
    });

    setTimeout(async () => {
      if (currentIndex < onboardingData.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        try {
          await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
        } catch (error) {
          console.error('Error saving onboarding status:', error);
        }

        if (Platform.OS === 'android') {
          InteractionManager.runAfterInteractions(() => {
            router.replace('/login');
          });
        } else {
          router.replace('/login');
        }
      }
    }, transitionDelay);
  };

  const currentSlide = onboardingData[currentIndex];

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateX: slideTranslateX.value * 0.3 }],
  }));

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
    transform: [{ translateX: slideTranslateX.value }, { scale: imageScale.value }],
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.main}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={layout.isTablet}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.slide}>
            <Animated.View style={[styles.imageWrapper, imageAnimatedStyle]}>
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
            </Animated.View>

            <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
              <Text style={styles.title}>{currentSlide.title}</Text>
              <Text style={styles.subtitle}>{currentSlide.subtitle}</Text>
            </Animated.View>
          </View>
        </ScrollView>

        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={handleNext}
            activeOpacity={0.7}
            testID={currentIndex < onboardingData.length - 1 ? 'onboarding-next' : 'onboarding-start'}
            accessibilityRole="button"
            accessibilityLabel={currentSlide.buttonText}
          >
            <Text style={styles.buttonText}>{currentSlide.buttonText}</Text>
          </TouchableOpacity>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
