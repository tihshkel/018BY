import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
  Modal,
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
  'Ожидание чуда': ['Беременность'],
  'Праздники и события': ['День рождения'],
  'Первые годы малыша': ['Выписка', 'Первый год'],
  'Семья': [],
  'Мои истории: дневники': [], // Определяется по SKU (DD1-DD21)
  'Любовь и свадьба': [], // Определяется по SKU (SVA)
};

// Маппинг категорий на SKU для специальных случаев
const CATEGORY_TO_SKU_PREFIXES: Record<string, string[]> = {
  'Мои истории: дневники': ['DD'], // Личные дневники для девочки (DD1-DD21)
  'Любовь и свадьба': ['SVA'], // Свадебные фотоальбомы
};

// Все доступные категории для фильтра
const ALL_CATEGORIES = [
  'Ожидание чуда',
  'Первые годы малыша',
  'Семья',
  'Любовь и свадьба',
  'Праздники и события',
  'Мои истории: дневники',
];

// Типы обложек
type CoverType = 'all' | 'hard' | 'soft';

// Функция определения типа обложки из названия
const getCoverType = (title: string): 'hard' | 'soft' | null => {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('твердой обложке') || lowerTitle.includes('твердой')) {
    return 'hard';
  }
  if (lowerTitle.includes('мягкой обложке') || lowerTitle.includes('мягкой')) {
    return 'soft';
  }
  return null;
};

export default function PaperCatalogTemplatesScreen() {
  const params = useLocalSearchParams();
  const categoryName = formatCategoryName(params.category);
  const categoryTitle = categoryName || 'Категория не выбрана';

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryName);
  const [selectedCoverType, setSelectedCoverType] = useState<CoverType>('all');

  // Обновляем selectedCategory при изменении categoryName
  useEffect(() => {
    if (categoryName) {
      setSelectedCategory(categoryName);
    }
  }, [categoryName]);

  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Фильтруем товары по выбранной категории и типу обложки
  const categoryItems = useMemo(() => {
    const filterCategory = selectedCategory || categoryName;
    
    if (!filterCategory) {
      return [];
    }
    
    let filtered: GiftItem[] = [];
    
    // Проверяем специальные категории по SKU
    const skuPrefixes = CATEGORY_TO_SKU_PREFIXES[filterCategory] || [];
    if (skuPrefixes.length > 0) {
      filtered = GIFT_ITEMS.filter(item => 
        skuPrefixes.some(prefix => item.sku.startsWith(prefix))
      );
    } else if (filterCategory === 'Праздники и события') {
      // Для категории "Праздники и события" исключаем дневники для девочек (DD1-DD21)
      filtered = GIFT_ITEMS.filter(item => 
        item.celebrations.includes('День рождения') && !item.sku.startsWith('DD')
      );
    } else {
      // Для остальных категорий используем маппинг celebrations
      const celebrationsToMatch = CATEGORY_TO_CELEBRATIONS[filterCategory] || [];
      if (celebrationsToMatch.length > 0) {
        filtered = GIFT_ITEMS.filter(item => 
          item.celebrations.some(celeb => celebrationsToMatch.includes(celeb))
        );
      }
    }
    
    // Применяем фильтр по типу обложки
    if (selectedCoverType !== 'all') {
      filtered = filtered.filter(item => {
        const coverType = getCoverType(item.title);
        if (selectedCoverType === 'hard') {
          return coverType === 'hard';
        }
        if (selectedCoverType === 'soft') {
          return coverType === 'soft';
        }
        return true;
      });
    }
    
    return filtered;
  }, [categoryName, selectedCategory, selectedCoverType]);

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
            imagesToPreload.map(imageSource => {
              if (typeof imageSource === 'string') {
                return Image.prefetch(imageSource).catch(err => {
                  console.warn('⚠️ Ошибка предзагрузки изображения:', err);
                });
              }
              // Пропускаем локальные ресурсы (числа) - они загружаются быстро
              return Promise.resolve();
            })
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
          <Text style={styles.headerTitle}>
            {selectedCategory !== categoryName || selectedCoverType !== 'all'
              ? `${categoryTitle} (${categoryItems.length})`
              : categoryTitle}
          </Text>
          <TouchableOpacity
            onPress={() => setShowFilterModal(true)}
            style={styles.filterButton}
            accessibilityRole='button'
          >
            <Ionicons
              name='options-outline'
              size={24}
              color={
                selectedCategory !== categoryName || selectedCoverType !== 'all'
                  ? '#C9A89A'
                  : '#8B6F5F'
              }
            />
            {(selectedCategory !== categoryName || selectedCoverType !== 'all') && (
              <View style={styles.filterBadge} />
            )}
          </TouchableOpacity>
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

      {/* Модальное окно расширенного поиска */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Расширенный поиск</Text>
              <TouchableOpacity
                onPress={() => setShowFilterModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#8B6F5F" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Фильтр по разделу */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Раздел</Text>
                <View style={styles.filterOptions}>
                  {ALL_CATEGORIES.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.filterOption,
                        selectedCategory === category && styles.filterOptionSelected,
                      ]}
                      onPress={() => setSelectedCategory(category)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          selectedCategory === category && styles.filterOptionTextSelected,
                        ]}
                      >
                        {category}
                      </Text>
                      {selectedCategory === category && (
                        <Ionicons name="checkmark-circle" size={20} color="#C9A89A" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Фильтр по типу обложки */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Тип обложки</Text>
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      selectedCoverType === 'all' && styles.filterOptionSelected,
                    ]}
                    onPress={() => setSelectedCoverType('all')}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        selectedCoverType === 'all' && styles.filterOptionTextSelected,
                      ]}
                    >
                      Все
                    </Text>
                    {selectedCoverType === 'all' && (
                      <Ionicons name="checkmark-circle" size={20} color="#C9A89A" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      selectedCoverType === 'hard' && styles.filterOptionSelected,
                    ]}
                    onPress={() => setSelectedCoverType('hard')}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        selectedCoverType === 'hard' && styles.filterOptionTextSelected,
                      ]}
                    >
                      Твердая обложка
                    </Text>
                    {selectedCoverType === 'hard' && (
                      <Ionicons name="checkmark-circle" size={20} color="#C9A89A" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      selectedCoverType === 'soft' && styles.filterOptionSelected,
                    ]}
                    onPress={() => setSelectedCoverType('soft')}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        selectedCoverType === 'soft' && styles.filterOptionTextSelected,
                      ]}
                    >
                      Мягкая обложка
                    </Text>
                    {selectedCoverType === 'soft' && (
                      <Ionicons name="checkmark-circle" size={20} color="#C9A89A" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Кнопки действий */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setSelectedCategory(categoryName);
                  setSelectedCoverType('all');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.resetButtonText}>Сбросить</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setShowFilterModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.applyButtonText}>Применить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  filterButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C9A89A',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E8E0',
  },
  modalTitle: {
    fontSize: 24,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    maxHeight: 400,
  },
  filterSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 18,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
    marginBottom: 16,
  },
  filterOptions: {
    gap: 12,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#F0E8E0',
  },
  filterOptionSelected: {
    backgroundColor: '#FAF8F5',
    borderColor: '#C9A89A',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '400',
    flex: 1,
  },
  filterOptionTextSelected: {
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0E8E0',
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#FAF8F5',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F0E8E0',
  },
  resetButtonText: {
    fontSize: 16,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#C9A89A',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  applyButtonText: {
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

