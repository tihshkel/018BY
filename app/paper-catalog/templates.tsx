import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { GIFT_ITEMS, type GiftItem } from '../(tabs)/gifts';

interface LocalParams {
  category?: string | string[];
}

const formatCategoryName = (value: LocalParams['category']) => {
  if (Array.isArray(value)) {
    return value[0];
  }
  if (typeof value === 'string') {
    return value;
  }
  return null;
};

// Маппинг названий категорий на старые названия в celebrations и SKU
const CATEGORY_TO_CELEBRATIONS: Record<string, string[]> = {
  'Будущим мамам': ['Беременность'],
  'В подарок': ['День рождения'],
  'Для новорождённых': ['Выписка', 'Первый год'],
  'Для семьи': [],
  'Для девочек': [], // Определяется по SKU (DD1-DD21)
  'Молодожёнам': [], // Определяется по SKU (SVA)
  'Для детей': [],
};

// Маппинг категорий на SKU для специальных случаев
const CATEGORY_TO_SKU_PREFIXES: Record<string, string[]> = {
  'Для девочек': ['DD'], // Личные дневники для девочки (DD1-DD21)
  'Молодожёнам': ['SVA'], // Свадебные фотоальбомы
};

export default function PaperCatalogTemplatesScreen() {
  const params = useLocalSearchParams();
  const categoryName = formatCategoryName(params.category);
  const categoryTitle = categoryName || 'Категория не выбрана';

  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Фильтруем товары по выбранной категории
  const categoryItems = useMemo(() => {
    if (!categoryName) {
      return [];
    }
    
    // Проверяем специальные категории по SKU
    const skuPrefixes = CATEGORY_TO_SKU_PREFIXES[categoryName] || [];
    if (skuPrefixes.length > 0) {
      return GIFT_ITEMS.filter(item => 
        skuPrefixes.some(prefix => item.sku.startsWith(prefix))
      );
    }
    
    // Для категории "В подарок" исключаем дневники для девочек (DD1-DD21)
    if (categoryName === 'В подарок') {
      return GIFT_ITEMS.filter(item => 
        item.celebrations.includes('День рождения') && !item.sku.startsWith('DD')
      );
    }
    
    // Для остальных категорий используем маппинг celebrations
    const celebrationsToMatch = CATEGORY_TO_CELEBRATIONS[categoryName] || [];
    if (celebrationsToMatch.length === 0) {
      return [];
    }
    return GIFT_ITEMS.filter(item => 
      item.celebrations.some(celeb => celebrationsToMatch.includes(celeb))
    );
  }, [categoryName]);

  // Предзагрузка всех изображений для выбранной категории
  useFocusEffect(
    React.useCallback(() => {
      const preloadCategoryImages = async () => {
        if (!categoryName || categoryItems.length === 0) {
          return;
        }

        try {
          const imagesToPreload = categoryItems
            .filter(item => item.cover)
            .map(item => item.cover!);

          await Promise.all(
            imagesToPreload.map(imageSource => 
              Image.prefetch(imageSource as number).catch(err => {
                console.warn('⚠️ Ошибка предзагрузки изображения:', err);
              })
            )
          );
          
          console.log(`✅ Все изображения категории "${categoryName}" предзагружены`);
        } catch (error) {
          console.error('❌ Ошибка предзагрузки изображений:', error);
        }
      };

      preloadCategoryImages();
    }, [categoryName, categoryItems])
  );

  const handleOpenLink = useCallback(async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      console.error('Не удалось открыть ссылку:', error);
    }
  }, []);

  if (!categoryName) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyState}>
          <Ionicons name='alert-circle-outline' size={48} color='#C9A89A' />
          <Text style={styles.emptyStateTitle}>Не удалось определить категорию</Text>
          <Text style={styles.emptyStateText}>
            Вернитесь к списку и выберите категорию ещё раз.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name='chevron-back' size={20} color='#FFFFFF' />
            <Text style={styles.backButtonText}>Вернуться</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View style={[styles.content, animatedStyle]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerBackButton}
            accessibilityRole='button'
          >
            <Ionicons name='chevron-back' size={24} color='#8B6F5F' />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{categoryTitle}</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {categoryItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name='gift-outline' size={64} color='#D4C4B5' />
              <Text style={styles.emptyStateText}>
                Пока нет товаров для этой категории. Попробуйте выбрать
                другую категорию.
              </Text>
            </View>
          ) : (
            categoryItems.map((item, index) => {
              const imagePriority = index < 10 ? "high" : "normal";
              return (
                <View key={item.id} style={styles.card}>
                  <View style={styles.coverWrapper}>
                    {item.cover ? (
                      <Image
                        source={item.cover}
                        style={styles.coverImage}
                        contentFit="contain"
                        priority={imagePriority}
                        cachePolicy="disk"
                        transition={0}
                        fadeDuration={0}
                        accessibilityLabel={`Обложка товара ${item.title}`}
                        placeholderContentFit="contain"
                      />
                    ) : (
                      <View style={styles.coverPlaceholder}>
                        <Ionicons name="image-outline" size={40} color="#D4C4B5" />
                      </View>
                    )}
                  </View>

                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <TouchableOpacity
                      style={styles.buyButton}
                      onPress={() => handleOpenLink(item.link)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="cart-outline" size={20} color="#FFFFFF" />
                      <Text style={styles.buyButtonText}>Купить на Wildberries</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </Animated.View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    gap: 16,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 28,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingBottom: 100,
    gap: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '400',
    marginBottom: 20,
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F5F0EB',
    overflow: 'hidden',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  coverWrapper: {
    height: 280,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    padding: 20,
    gap: 12,
  },
  cardTitle: {
    fontSize: 20,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
    lineHeight: 24,
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    backgroundColor: '#C9A89A',
    paddingVertical: 14,
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
    gap: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9B8E7F',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C9A89A',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 8,
    marginTop: 24,
  },
  backButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
  },
});

