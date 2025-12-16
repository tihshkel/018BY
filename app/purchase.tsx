import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function PurchaseScreen() {
  const containerOpacity = useSharedValue(0);

  useEffect(() => {
    containerOpacity.value = withTiming(1, { duration: 400 });
  }, []);

  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: containerOpacity.value,
    };
  });

  const handlePurchase = async () => {
    try {
      const url = Platform.select({
        ios: 'https://apps.apple.com/app/id123456789', // Замените на реальный ID
        android: 'https://play.google.com/store/apps/details?id=com.yourapp', // Замените на реальный ID
      });

      if (url) {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        }
      }
    } catch (error) {
      console.error('Error opening store:', error);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient
        colors={['#FAF8F5', '#F5F0EB', '#FAF8F5']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <Animated.View style={[styles.content, containerAnimatedStyle]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Логотип */}
          <View style={styles.header}>
            <Image
              source={require('@/assets/images/logo-for-activaty-page.png')}
              style={styles.logoImage}
              contentFit="contain"
              priority="high"
              cachePolicy="disk"
              transition={0}
              fadeDuration={0}
            />
          </View>

          {/* Описание */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionText}>
              Сохраняйте моменты, которые хочется пережить снова
            </Text>
          </View>

          {/* Особенности */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureCard}>
              <View style={styles.featureIconWrapper}>
                <Ionicons name="sparkles-outline" size={32} color="#C9A89A" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Полный доступ</Text>
                <Text style={styles.featureText}>
                  Ко всем шаблонам альбомов без ограничений
                </Text>
              </View>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIconWrapper}>
                <Ionicons name="notifications-outline" size={32} color="#C9A89A" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Напоминания</Text>
                <Text style={styles.featureText}>
                  О важных моментах, которые не стоит пропустить
                </Text>
              </View>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIconWrapper}>
                <Ionicons name="document-text-outline" size={32} color="#C9A89A" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Экспорт в PDF</Text>
                <Text style={styles.featureText}>
                  Сохраняйте и печатайте ваши альбомы в высоком качестве
                </Text>
              </View>
            </View>
          </View>

          {/* Кнопки */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.purchaseButton}
              onPress={handlePurchase}
              activeOpacity={0.85}
            >
              <Ionicons name="cart-outline" size={22} color="#FFFFFF" />
              <Text style={styles.purchaseButtonText}>
                {Platform.select({
                  ios: 'Купить',
                  android: 'Купить',
                  default: 'Купить приложение',
                })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={20} color="#9B8E7F" />
              <Text style={styles.backButtonText}>Назад</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoImage: {
    width: 180,
    height: 180,
  },
  descriptionContainer: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 16,
  },
  descriptionText: {
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
  featuresContainer: {
    width: '100%',
    marginBottom: 32,
    gap: 16,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  featureIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0E8E0',
  },
  featureContent: {
    flex: 1,
    gap: 6,
  },
  featureTitle: {
    fontSize: 18,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  featureText: {
    fontSize: 15,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    lineHeight: 22,
  },
  buttonsContainer: {
    width: '100%',
    gap: 16,
  },
  purchaseButton: {
    backgroundColor: '#C9A89A',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#8B6F5F',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  purchaseButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    letterSpacing: 0.5,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  backButtonText: {
    color: '#9B8E7F',
    fontSize: 16,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '400',
  },
});

