import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  projectCategories,
  buildProjectProducts,
  type ProjectProduct,
} from '@/constants/projectTemplates';
import { getAlbumTemplatesByCategory, type AlbumTemplate } from '@/albums';

interface LocalParams {
  category?: string | string[];
}

const formatCategoryId = (value: LocalParams['category']) => {
  if (Array.isArray(value)) {
    return value[0];
  }
  if (typeof value === 'string') {
    return value;
  }
  return null;
};

const getCategoryTitle = (categoryId: string | null) => {
  if (!categoryId) {
    return 'Категория не выбрана';
  }
  const category = projectCategories.find(item => item.id === categoryId);
  return category ? category.name : 'Категория не найдена';
};

const getReminderPrompt = (categoryId: string | null) => {
  if (categoryId === 'pregnancy') {
    return 'Когда родится ребёнок?';
  }
  if (categoryId === 'kids') {
    return 'Когда родился ребёнок?';
  }
  if (categoryId === 'wedding') {
    return 'Когда состоится свадьба?';
  }
  return 'Укажите дату события';
};

export default function ProjectTemplatesScreen() {
  const params = useLocalSearchParams();
  const categoryId = formatCategoryId(params.category);
  const categoryTitle = getCategoryTitle(categoryId);

  const [selectedProduct, setSelectedProduct] = useState<ProjectProduct | null>(
    null
  );
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);

  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const productsByCategory = useMemo(() => buildProjectProducts(), []);

  const categoryProducts = useMemo(() => {
    if (!categoryId) {
      return [];
    }
    return productsByCategory[categoryId] ?? [];
  }, [categoryId, productsByCategory]);

  // Для беременности и kids получаем альбомы вместо продуктов
  const pregnancyAlbums = useMemo(() => {
    if (categoryId === 'pregnancy') {
      return getAlbumTemplatesByCategory('pregnancy');
    }
    return [];
  }, [categoryId]);

  const kidsAlbums = useMemo(() => {
    if (categoryId === 'kids') {
      return getAlbumTemplatesByCategory('kids');
    }
    return [];
  }, [categoryId]);

  // Предзагрузка всех изображений для выбранной категории
  useFocusEffect(
    React.useCallback(() => {
      const preloadCategoryImages = async () => {
        if (!categoryId) {
          return;
        }

        try {
          let imagesToPreload: any[] = [];

          // Для беременности и kids загружаем изображения альбомов
          if (categoryId === 'pregnancy' && pregnancyAlbums.length > 0) {
            imagesToPreload = pregnancyAlbums
              .filter(album => album.thumbnailPath)
              .map(album => album.thumbnailPath!);
          } else if (categoryId === 'kids' && kidsAlbums.length > 0) {
            imagesToPreload = kidsAlbums
              .filter(album => album.thumbnailPath)
              .map(album => album.thumbnailPath!);
          } else if (categoryProducts.length > 0) {
            // Для других категорий загружаем изображения продуктов
            imagesToPreload = categoryProducts
              .filter(product => product.coverImage)
              .map(product => product.coverImage!);
          }

          if (imagesToPreload.length === 0) {
            return;
          }

          // Предзагружаем все изображения параллельно
          await Promise.all(
            imagesToPreload.map(imageSource => {
              if (typeof imageSource === 'string') {
                return Image.prefetch(imageSource).catch(err => {
                  console.warn('⚠️ Ошибка предзагрузки изображения:', err);
                });
              }
              return Promise.resolve();
            })
          );
          
          console.log(`✅ Все изображения категории "${categoryId}" предзагружены`);
        } catch (error) {
          console.error('❌ Ошибка предзагрузки изображений:', error);
        }
      };

      preloadCategoryImages();
    }, [categoryId, categoryProducts, pregnancyAlbums, kidsAlbums])
  );

  // Дополнительная предзагрузка при изменении категории
  useEffect(() => {
    if (!categoryId || categoryProducts.length === 0) {
      return;
    }

    const preloadImages = async () => {
      try {
        const imagesToPreload = categoryProducts
          .filter(product => product.coverImage)
          .map(product => product.coverImage!);

        await Promise.all(
          imagesToPreload.map(imageSource => {
            if (typeof imageSource === 'string') {
              return Image.prefetch(imageSource).catch(() => {});
            }
            // Для require() изображений они уже загружены
            return Promise.resolve();
          })
        );
      } catch (error) {
        // Игнорируем ошибки, изображения загрузятся по требованию
      }
    };

    preloadImages();
  }, [categoryId, categoryProducts]);

  const handleNavigateToAlbumSelection = useCallback(
    (product: ProjectProduct, date: Date | null) => {
      router.push({
        pathname: '/select-album',
        params: {
          category: product.category,
          productId: product.id,
          reminderDate: date ? date.toISOString() : '',
        },
      });
    },
    []
  );

  const handleCoverSelect = useCallback((album: AlbumTemplate) => {
    // Для беременности и детей при выборе обложки переходим на выбор действия
    if (categoryId === 'pregnancy' || categoryId === 'kids') {
      router.push({
        pathname: '/select-action',
        params: {
          celebration: categoryId,
          coverType: album.id,
        },
      });
    }
  }, [categoryId]);

  const handleProductSelect = useCallback((product: ProjectProduct) => {
    setSelectedProduct(product);
    if (product.hasReminders) {
      setShowDatePicker(true);
      return;
    }
    handleNavigateToAlbumSelection(product, null);
  }, [handleNavigateToAlbumSelection]);

  const handleDateConfirm = useCallback(() => {
    setShowDatePicker(false);
    if (selectedProduct) {
      handleNavigateToAlbumSelection(selectedProduct, selectedDate);
    }
  }, [handleNavigateToAlbumSelection, selectedProduct, selectedDate]);

  const handleSkipDate = useCallback(() => {
    setShowDatePicker(false);
    if (selectedProduct) {
      handleNavigateToAlbumSelection(selectedProduct, null);
    }
  }, [handleNavigateToAlbumSelection, selectedProduct]);

  const handleSelectDate = useCallback((date: Date) => {
    if (!Number.isNaN(date.getTime())) {
      setSelectedDate(date);
    }
  }, []);

  if (!categoryId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyState}>
          <Ionicons name='alert-circle-outline' size={48} color='#C9A89A' />
          <Text style={styles.emptyStateTitle}>Не удалось определить категорию</Text>
          <Text style={styles.emptyStateText}>
            Вернитесь к списку и выберите тему альбома ещё раз.
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
          <Text style={styles.subtitle}>
            {(categoryId === 'pregnancy' || categoryId === 'kids') ? 'Выберите обложку' : 'Выберите готовый вариант альбома'}
          </Text>

          {/* Для беременности и kids показываем альбомы */}
          {categoryId === 'pregnancy' ? (
            pregnancyAlbums.length === 0 ? (
              <View style={styles.emptyStateInline}>
                <Ionicons name='document-outline' size={40} color='#D4C4B5' />
                <Text style={styles.emptyStateInlineText}>
                  Пока нет готовых альбомов для этой категории. Попробуйте выбрать
                  другую тему.
                </Text>
              </View>
            ) : (
              pregnancyAlbums.map(album => (
                <TouchableOpacity
                  key={album.id}
                  style={styles.productCard}
                  activeOpacity={0.85}
                  onPress={() => handleCoverSelect(album)}
                >
                  <View style={styles.productImage}>
                    {album.thumbnailPath ? (
                      <Image
                        source={album.thumbnailPath}
                        style={styles.productImageContent}
                        contentFit="cover"
                        priority={pregnancyAlbums.indexOf(album) < 5 ? "high" : "normal"}
                        cachePolicy="disk"
                        transition={0}
                        fadeDuration={0}
                        recyclingKey={album.id}
                      />
                    ) : (
                      <Ionicons name='book' size={48} color='#C9A89A' />
                    )}
                  </View>
                  <View style={styles.productContent}>
                    <Text style={styles.productName}>{album.name}</Text>
                    <Text style={styles.productDescription}>
                      {album.description}
                    </Text>
                  </View>
                  <Ionicons name='chevron-forward' size={22} color='#C9A89A' />
                </TouchableOpacity>
              ))
            )
          ) : categoryId === 'kids' ? (
            /* Для kids показываем альбомы */
            kidsAlbums.length === 0 ? (
              <View style={styles.emptyStateInline}>
                <Ionicons name='document-outline' size={40} color='#D4C4B5' />
                <Text style={styles.emptyStateInlineText}>
                  Пока нет готовых альбомов для этой категории. Попробуйте выбрать
                  другую тему.
                </Text>
              </View>
            ) : (
              kidsAlbums.map(album => (
                <TouchableOpacity
                  key={album.id}
                  style={styles.productCard}
                  activeOpacity={0.85}
                  onPress={() => handleCoverSelect(album)}
                >
                  <View style={styles.productImage}>
                    {album.thumbnailPath ? (
                      <Image
                        source={album.thumbnailPath}
                        style={styles.productImageContent}
                        contentFit="cover"
                        priority={kidsAlbums.indexOf(album) < 5 ? "high" : "normal"}
                        cachePolicy="disk"
                        transition={0}
                        fadeDuration={0}
                        recyclingKey={album.id}
                      />
                    ) : (
                      <Ionicons name='book' size={48} color='#C9A89A' />
                    )}
                  </View>
                  <View style={styles.productContent}>
                    <Text style={styles.productName}>{album.name}</Text>
                    <Text style={styles.productDescription}>
                      {album.description}
                    </Text>
                  </View>
                  <Ionicons name='chevron-forward' size={22} color='#C9A89A' />
                </TouchableOpacity>
              ))
            )
          ) : (
            /* Для других категорий показываем продукты */
            categoryProducts.length === 0 ? (
              <View style={styles.emptyStateInline}>
                <Ionicons name='document-outline' size={40} color='#D4C4B5' />
                <Text style={styles.emptyStateInlineText}>
                  Пока нет готовых альбомов для этой категории. Попробуйте выбрать
                  другую тему.
                </Text>
              </View>
            ) : (
              categoryProducts.map(product => (
                <TouchableOpacity
                  key={product.id}
                  style={styles.productCard}
                  activeOpacity={0.85}
                  onPress={() => handleProductSelect(product)}
                >
                  <View style={styles.productImage}>
                    {product.coverImage ? (
                      <Image
                        source={product.coverImage}
                        style={styles.productImageContent}
                        contentFit="cover"
                        priority={categoryProducts.indexOf(product) < 5 ? "high" : "normal"}
                        cachePolicy="disk"
                        transition={0}
                        fadeDuration={0}
                        recyclingKey={product.id}
                      />
                    ) : (
                      <Ionicons name='book' size={48} color='#C9A89A' />
                    )}
                  </View>
                  <View style={styles.productContent}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productDescription}>
                      {product.description}
                    </Text>
                    {(product.hasReminders && (categoryId === 'pregnancy' || categoryId === 'kids')) && (
                      <View style={styles.productFeatures}>
                        <View style={styles.feature}>
                          <Ionicons
                            name='notifications-outline'
                            size={16}
                            color='#9B8E7F'
                          />
                          <Text style={styles.featureText}>Напоминания</Text>
                        </View>
                      </View>
                    )}
                  </View>
                  <Ionicons name='chevron-forward' size={22} color='#C9A89A' />
                </TouchableOpacity>
              ))
            )
          )}
        </ScrollView>
      </Animated.View>

      {/* Дата */}
      <DateSelectionModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onConfirm={handleDateConfirm}
        onSkip={handleSkipDate}
        onSelectDate={handleSelectDate}
        selectedDate={selectedDate}
        prompt={getReminderPrompt(categoryId)}
      />
    </SafeAreaView>
  );
}

interface DateSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onSkip: () => void;
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
  prompt: string;
}

const DateSelectionModal: React.FC<DateSelectionModalProps> = ({
  visible,
  onClose,
  onConfirm,
  onSkip,
  onSelectDate,
  selectedDate,
  prompt,
}) => {
  if (!visible) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.modalOverlay}
      activeOpacity={1}
      onPress={onClose}
    >
      <TouchableOpacity
        style={styles.modalContent}
        activeOpacity={1}
        onPress={event => event.stopPropagation()}
      >
        <Text style={styles.modalTitle}>{prompt}</Text>
        <Text style={styles.modalSubtitle}>
          Эта дата поможет строить напоминания и рекомендации
        </Text>

        <View style={styles.datePickerContainer}>
          <DateTimePicker
            value={selectedDate}
            mode='date'
            display={Platform.select({
              ios: 'spinner',
              android: 'calendar',
              default: 'default',
            })}
            locale='ru-RU'
            maximumDate={new Date(2030, 11, 31)}
            minimumDate={new Date(1900, 0, 1)}
            onChange={(_event, date) => {
              if (date) {
                onSelectDate(date);
              }
            }}
            style={styles.datePicker}
            themeVariant='light'
            textColor={Platform.OS === 'ios' ? '#8B6F5F' : undefined}
          />
        </View>

        <View style={styles.modalButtons}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
            activeOpacity={0.8}
          >
            <Text style={styles.skipButtonText}>Пропустить</Text>
            <Text style={styles.skipButtonHint}>
              Без даты напоминания работать не будут
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.confirmButton}
            onPress={onConfirm}
            activeOpacity={0.85}
          >
            <Text style={styles.confirmButtonText}>Подтвердить</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

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
    paddingTop: 18,
    paddingBottom: 18,
  },
  headerBackButton: {
    marginRight: 12,
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
    paddingBottom: 40,
    gap: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    lineHeight: 22,
    marginBottom: 12,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F5F0EB',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    gap: 16,
  },
  productImage: {
    width: 80,
    height: 100,
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  productImageContent: {
    width: '100%',
    height: '100%',
  },
  productContent: {
    flex: 1,
    gap: 8,
  },
  productName: {
    fontSize: 18,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
  },
  productDescription: {
    fontSize: 14,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    lineHeight: 20,
  },
  productFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 12,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '300',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    gap: 20,
  },
  modalTitle: {
    fontSize: 20,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    textAlign: 'center',
    lineHeight: 20,
  },
  datePickerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF8F5',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8D5C7',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  datePicker: {
    width: '100%',
  },
  modalButtons: {
    gap: 12,
  },
  skipButton: {
    alignItems: 'center',
    gap: 4,
  },
  skipButtonText: {
    fontSize: 15,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '500',
  },
  skipButtonHint: {
    fontSize: 12,
    color: '#B8A89A',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: '#C9A89A',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyStateTitle: {
    fontSize: 22,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    textAlign: 'center',
    lineHeight: 22,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#C9A89A',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  emptyStateInline: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: '#F5F0EB',
    gap: 12,
  },
  emptyStateInlineText: {
    fontSize: 15,
    color: '#9B8E7F',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
  },
});

