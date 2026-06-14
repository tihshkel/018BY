import { colors, createShadow, radii, sansFont } from '@/constants/design-tokens';
import { getAlbumTemplatesByCategory, type AlbumTemplate } from '@/albums';
import { getCoverSelectTitleBySku } from '@/utils/coverSelectTitle';
import { FAMILY_COVER_DESIGNS } from '@/utils/familyCoverDesigns';
import { HOLIDAY_COVER_DESIGNS } from '@/utils/holidayCoverDesigns';
import { KIDS_COVER_DESIGNS } from '@/utils/kidsCoverDesigns';
import { PREGNANCY_COVER_DESIGNS } from '@/utils/pregnancyCoverDesigns';
import {
    buildProjectProducts,
    projectCategories,
    type ProjectProduct,
} from '@/constants/projectTemplates';
import { getRemindersStorageKey } from '@/utils/account-sync';
import { withTimeout } from '@/utils/asyncTimeout';
import { runDueDateBackgroundSetup } from '@/utils/dueDateBackgroundSetup';
import { getAccountSyncId } from '@/utils/account-identity';
import { getAlbumImages } from '@/utils/albumImages';
import { getAllDiaryCovers, getDiaryInteriorImageUris } from '@/utils/diaryAlbumsLoader';
import {
  getGridColumnCount,
  getGridColumnWrapperStyle,
  getGridListStyle,
  getTabletContentShell,
  getTabletSectionWrap,
  PICKER_CONTENT_MAX_WIDTH,
  useResponsiveLayout,
} from '@/utils/responsive';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AlbumDateSheet, getAlbumCategoryDateBounds } from '@/components/album/album-date-sheet';
import { AppInlineDatePicker } from '@/components/ui/app-date-picker-sheet';
import { AppBottomSheet } from '@/components/ui/app-bottom-sheet';
import { AppButton } from '@/components/ui/app-button';
import { Asset } from 'expo-asset';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    FlatList,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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

interface CategoryInfo {
  name: string;
  title: string;
  description: string;
  notificationTitle: string;
  notificationBody: string;
}

const getCategoryInfo = (categoryId: string): CategoryInfo => {
  const categoryMap: { [key: string]: CategoryInfo } = {
    pregnancy: {
      name: 'Беременность',
      title: 'Предварительная дата родов',
      description: 'Выберите предварительную дату родов. Эта дата будет сохранена в напоминаниях.',
      notificationTitle: 'Предварительная дата родов',
      notificationBody: 'Сегодня ваша предварительная дата родов!',
    },
    kids: {
      name: 'Детство',
      title: 'Дата рождения ребенка',
      description: 'Выберите дату рождения ребенка. Эта дата будет сохранена в напоминаниях.',
      notificationTitle: 'День рождения ребенка',
      notificationBody: 'Сегодня день рождения вашего ребенка!',
    },
    holidays: {
      name: 'Праздники и события',
      title: 'Дата события',
      description: 'Выберите дату события.',
      notificationTitle: 'Праздник',
      notificationBody: 'Сегодня ваш праздник!',
    },
    family: {
      name: 'Семья',
      title: 'Дата важного события',
      description: 'Выберите дату важного семейного события.',
      notificationTitle: 'Семейное событие',
      notificationBody: 'Сегодня важная дата для вашей семьи!',
    },
  };
  return categoryMap[categoryId] || categoryMap.pregnancy;
};

const getDefaultDate = (categoryId: string): Date => {
  const defaultDate = new Date();
  if (categoryId === 'pregnancy') {
    // 9 месяцев вперед
    defaultDate.setMonth(defaultDate.getMonth() + 9);
  }
  if (categoryId === 'kids') {
    // Дата рождения: по умолчанию 1 год назад, чтобы пикер открывался на актуальном годе (2024–2026)
    defaultDate.setFullYear(defaultDate.getFullYear() - 1);
  }
  return defaultDate;
};

type CoverPickerRow = {
  id: string;
  name: string;
  description: string;
  imageSource?: unknown;
  onPress: () => void;
  features?: React.ReactNode;
  priorityIndex?: number;
};

export default function ProjectTemplatesScreen() {
  const layout = useResponsiveLayout(PICKER_CONTENT_MAX_WIDTH);
  const contentShellStyle = getTabletContentShell(layout);
  const sectionWrap = getTabletSectionWrap(layout, {
    phonePadding: 24,
    tabletPadding: 0,
  });
  const coverColumnCount = getGridColumnCount(layout);
  const gridListStyle = getGridListStyle(layout);
  const gridColumnWrapper = getGridColumnWrapperStyle(16);

  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 32 : 20);
  const params = useLocalSearchParams();
  const categoryId = formatCategoryId(params.category);
  const categoryTitle = getCategoryTitle(categoryId);

  const [selectedProduct, setSelectedProduct] = useState<ProjectProduct | null>(
    null
  );
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  // State for pregnancy/kids date modal
  const [selectedAlbumForDate, setSelectedAlbumForDate] = useState<AlbumTemplate | null>(null);
  const [showCoverDateModal, setShowCoverDateModal] = useState(false);
  const [coverDate, setCoverDate] = useState(new Date());
  const [isSavingCoverDate, setIsSavingCoverDate] = useState(false);

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

  // Для «Ожидание чуда» — только 6 дизайнов DB1–DB6. Тип обложки выбирается при экспорте
  const pregnancyAlbums = useMemo(() => {
    if (categoryId === 'pregnancy') {
      return PREGNANCY_COVER_DESIGNS.map((d) => ({
        id: d.id,
        name: getCoverSelectTitleBySku(d.sku, 'pregnancy'),
        description: 'Дизайн обложки',
        thumbnailPath: d.image,
      })) as AlbumTemplate[];
    }
    return [];
  }, [categoryId]);

  // Для «Первые годы малыша» — только first_page из albums/kids. Тип обложки выбирается при экспорте
  const kidsAlbums = useMemo(() => {
    if (categoryId === 'kids') {
      return KIDS_COVER_DESIGNS.map((d) => ({
        id: d.id,
        name: getCoverSelectTitleBySku(d.sku, 'kids'),
        description: 'Дизайн обложки',
        thumbnailPath: d.image,
      })) as AlbumTemplate[];
    }
    return [];
  }, [categoryId]);

  // Для «Праздники и события» — обложки из albums/holiday
  const holidayAlbums = useMemo(() => {
    if (categoryId === 'holidays') {
      return HOLIDAY_COVER_DESIGNS.map((d) => ({
        id: d.id,
        name: getCoverSelectTitleBySku(d.sku, 'holidays'),
        description: 'Праздничный альбом',
        thumbnailPath: d.image,
      })) as AlbumTemplate[];
    }
    return [];
  }, [categoryId]);

  // Для «Семья» — обложки из albums/family
  const familyAlbums = useMemo(() => {
    if (categoryId === 'family') {
      return FAMILY_COVER_DESIGNS.map((d) => ({
        id: d.id,
        name: getCoverSelectTitleBySku(d.sku, 'family'),
        description: 'Семейный альбом',
        thumbnailPath: d.image,
      })) as AlbumTemplate[];
    }
    return [];
  }, [categoryId]);

  // Для дневников получаем обложки из специального загрузчика
  const diaryCovers = useMemo(() => {
    if (categoryId === 'diary') {
      return getAllDiaryCovers();
    }
    return [];
  }, [categoryId]);

  // МАКСИМАЛЬНАЯ предзагрузка всех изображений для выбранной категории
  useFocusEffect(
    React.useCallback(() => {
      const preloadCategoryImages = async () => {
        if (!categoryId) {
          return;
        }

        try {
          let imagesToPreload: any[] = [];
          let interiorPagesToPreload: Promise<any>[] = [];

          // Для беременности и kids загружаем изображения альбомов
          if (categoryId === 'pregnancy' && pregnancyAlbums.length > 0) {
            imagesToPreload = pregnancyAlbums
              .filter(album => album.thumbnailPath)
              .map(album => album.thumbnailPath!);
            
            // МАКСИМАЛЬНАЯ загрузка: предзагружаем ВСЕ внутренние страницы беременности
            Promise.resolve().then(async () => {
              try {
                const pregnancyImages = getAlbumImages('pregnancy_60');
                if (pregnancyImages.length > 0) {
                  await Promise.all(
                    pregnancyImages.map(async (imageModule) => {
                      try {
                        const asset = Asset.fromModule(imageModule);
                        await asset.downloadAsync();
                      } catch (err) {
                        // Игнорируем ошибки
                      }
                    })
                  );
                  console.log(`✅ Предзагружено ${pregnancyImages.length} внутренних страниц беременности`);
                }
              } catch (err) {
                // Игнорируем ошибки фоновой загрузки
              }
            });
          } else if (categoryId === 'kids' && kidsAlbums.length > 0) {
            imagesToPreload = kidsAlbums
              .filter(album => album.thumbnailPath)
              .map(album => album.thumbnailPath!);
            
            // МАКСИМАЛЬНАЯ загрузка: предзагружаем ВСЕ внутренние страницы kids
            Promise.resolve().then(async () => {
              try {
                const kidsImages = getAlbumImages('kids_48');
                if (kidsImages.length > 0) {
                  await Promise.all(
                    kidsImages.map(async (imageModule) => {
                      try {
                        const asset = Asset.fromModule(imageModule);
                        await asset.downloadAsync();
                      } catch (err) {
                        // Игнорируем ошибки
                      }
                    })
                  );
                  console.log(`✅ Предзагружено ${kidsImages.length} внутренних страниц kids`);
                }
              } catch (err) {
                // Игнорируем ошибки фоновой загрузки
              }
            });
          } else if (categoryId === 'diary' && diaryCovers.length > 0) {
            imagesToPreload = diaryCovers
              .filter(cover => cover.image)
              .map(cover => cover.image!);
            
            // МАКСИМАЛЬНАЯ загрузка: предзагружаем ВСЕ внутренние страницы дневников (оба варианта)
            Promise.resolve().then(async () => {
              try {
                const brownUris = await getDiaryInteriorImageUris('diary_interior_brown');
                const purpleUris = await getDiaryInteriorImageUris('diary_interior_purple');
                const totalPages = (brownUris?.length || 0) + (purpleUris?.length || 0);
                console.log(`✅ Предзагружено ${totalPages} внутренних страниц дневников (коричневый: ${brownUris?.length || 0}, фиолетовый: ${purpleUris?.length || 0})`);
              } catch (err) {
                // Игнорируем ошибки фоновой загрузки
              }
            });
          } else if (categoryProducts.length > 0) {
            // Для других категорий загружаем изображения продуктов
            imagesToPreload = categoryProducts
              .filter(product => product.coverImage)
              .map(product => product.coverImage!);
          }

          if (imagesToPreload.length === 0) {
            return;
          }

          // Предзагружаем все обложки параллельно (и строки, и require модули)
          await Promise.all(
            imagesToPreload.map(async (imageSource) => {
              try {
                if (typeof imageSource === 'string') {
                  await Image.prefetch(imageSource);
                } else {
                  // Для require() модулей используем Asset API
                  const asset = Asset.fromModule(imageSource);
                  await asset.downloadAsync();
                }
              } catch (err) {
                console.warn('⚠️ Ошибка предзагрузки изображения:', err);
              }
            })
          );

          console.log(`✅ Все обложки категории "${categoryId}" предзагружены (${imagesToPreload.length} шт.)`);
        } catch (error) {
          console.error('❌ Ошибка предзагрузки изображений:', error);
        }
      };

      preloadCategoryImages();
    }, [categoryId, categoryProducts, pregnancyAlbums, kidsAlbums, diaryCovers])
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
              return Image.prefetch(imageSource).catch(() => { });
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

  // Save reminder to AsyncStorage
  const scheduleReminder = async (eventDate: Date, catId: string) => {
    try {
      const categoryInfo = getCategoryInfo(catId);

      const reminder = {
        id: `${catId}_${Date.now()}_1`,
        categoryId: catId,
        categoryName: categoryInfo.name,
        title: categoryInfo.title,
        description: `${categoryInfo.title}: ${eventDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}`,
        date: eventDate.toISOString(),
        enabled: true,
      };

      const syncId = await getAccountSyncId();
      const remindersKey = syncId ? getRemindersStorageKey(syncId) : '@reminders';
      const existingReminders = await AsyncStorage.getItem(remindersKey);
      let allReminders = existingReminders ? JSON.parse(existingReminders) : [];

      allReminders = allReminders.filter((r: any) =>
        r.categoryId !== catId || r.title !== categoryInfo.title
      );

      allReminders.push(reminder);
      await AsyncStorage.setItem(remindersKey, JSON.stringify(allReminders));
    } catch (error) {
      console.error(`Error scheduling ${catId} reminder:`, error);
    }
  };

  const handleCoverSelect = useCallback((album: AlbumTemplate | { id: string; name: string }) => {
    // Для беременности и детей показываем модальное окно с датой
    if (categoryId === 'pregnancy' || categoryId === 'kids') {
      if ('thumbnailPath' in album) {
        setSelectedAlbumForDate(album as AlbumTemplate);
        setCoverDate(getDefaultDate(categoryId));
        setShowCoverDateModal(true);
      }
    } else {
      // Для остальных категорий (включая diary) сразу переходим на выбор действия
      router.push({
        pathname: '/select-action',
        params: {
          celebration: categoryId,
          coverType: album.id,
        },
      });
    }
  }, [categoryId]);

  const handleCoverDateConfirm = useCallback(async () => {
    if (!selectedAlbumForDate || !categoryId) return;
    if (isSavingCoverDate) return;
    setIsSavingCoverDate(true);

    const albumId = selectedAlbumForDate.id;
    const eventDateIso = coverDate.toISOString();

    try {
      await withTimeout(scheduleReminder(coverDate, categoryId), 8_000, 'save-reminder');
    } catch (error) {
      console.warn('[Templates] Reminder save timed out or failed:', error);
    }

    setShowCoverDateModal(false);
    setIsSavingCoverDate(false);

    router.push({
      pathname: '/select-action',
      params: {
        celebration: categoryId,
        coverType: albumId,
        eventDate: eventDateIso,
      },
    });

    if (categoryId === 'pregnancy' || categoryId === 'kids') {
      runDueDateBackgroundSetup(coverDate, categoryId);
    }
  }, [selectedAlbumForDate, categoryId, coverDate, isSavingCoverDate]);

  const handleCoverDateCancel = useCallback(() => {
    setShowCoverDateModal(false);
    setSelectedAlbumForDate(null);
  }, []);

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

  const emptyAlbumsMessage =
    'Пока нет готовых альбомов для этой категории. Попробуйте выбрать другую тему.';
  const emptyDiaryMessage =
    'Пока нет готовых дневников для этой категории. Попробуйте выбрать другую тему.';

  const renderCoverCard = useCallback(
    (row: CoverPickerRow, variant: 'row' | 'tile') => {
      const isTile = variant === 'tile';
      const priority =
        (row.priorityIndex ?? 0) < 5 ? ('high' as const) : ('normal' as const);
      return (
        <TouchableOpacity
          style={[
            styles.productCard,
            isTile && styles.productCardTile,
          ]}
          activeOpacity={0.85}
          onPress={row.onPress}
        >
          <View style={[styles.productImage, isTile && styles.productImageTile]}>
            {row.imageSource ? (
              <Image
                source={row.imageSource as React.ComponentProps<typeof Image>['source']}
                style={styles.productImageContent}
                contentFit="cover"
                priority={priority}
                cachePolicy="disk"
                transition={0}
                fadeDuration={0}
                recyclingKey={row.id}
              />
            ) : (
              <Ionicons name="book" size={isTile ? 40 : 48} color={colors.primary} />
            )}
          </View>
          <View
            style={[styles.productContent, isTile && styles.productContentTile]}
          >
            {isTile ? (
              <>
                <Text style={styles.productNameTile} numberOfLines={3}>
                  {row.name}
                </Text>
                <Text
                  style={styles.productDescriptionTile}
                  numberOfLines={2}
                >
                  {row.description}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.productName}>{row.name}</Text>
                <Text style={styles.productDescription}>{row.description}</Text>
                {row.features}
              </>
            )}
          </View>
          {!isTile && (
            <Ionicons name="chevron-forward" size={22} color={colors.primary} />
          )}
        </TouchableOpacity>
      );
    },
    []
  );

  const renderCoverPickerList = useCallback(
    (items: CoverPickerRow[], emptyMessage: string) => {
      if (items.length === 0) {
        return (
          <View style={styles.emptyStateInline}>
            <Ionicons name="document-outline" size={40} color={colors.tabInactive} />
            <Text style={styles.emptyStateInlineText}>{emptyMessage}</Text>
          </View>
        );
      }
      if (layout.isTablet) {
        return (
          <FlatList
            key={`cover-picker-cols-${coverColumnCount}`}
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => renderCoverCard(item, 'tile')}
            numColumns={coverColumnCount}
            scrollEnabled={false}
            style={gridListStyle}
            columnWrapperStyle={
              coverColumnCount > 1 ? gridColumnWrapper : undefined
            }
          />
        );
      }
      return (
        <>
          {items.map((item) => (
            <React.Fragment key={item.id}>
              {renderCoverCard(item, 'row')}
            </React.Fragment>
          ))}
        </>
      );
    },
    [layout.isTablet, coverColumnCount, renderCoverCard, gridListStyle, gridColumnWrapper]
  );

  const albumToPickerRow = useCallback(
    (album: AlbumTemplate, index: number): CoverPickerRow => ({
      id: album.id,
      name: album.name,
      description: album.description ?? '',
      imageSource: album.thumbnailPath,
      onPress: () => handleCoverSelect(album),
      priorityIndex: index,
    }),
    [handleCoverSelect]
  );

  if (!categoryId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyState}>
          <Ionicons name='alert-circle-outline' size={48} color={colors.primary} />
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
      <Animated.View style={[styles.content, contentShellStyle, animatedStyle]}>
        <View style={[styles.header, sectionWrap]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerBackButton}
            accessibilityRole='button'
          >
            <Ionicons name='chevron-back' size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{categoryTitle}</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            sectionWrap,
            { paddingBottom: bottomInset + 40 },
          ]}
        >
          <Text style={styles.subtitle}>
            {(categoryId === 'pregnancy' || categoryId === 'kids' || categoryId === 'diary') ? 'Выберите обложку' : 'Выберите готовый вариант альбома'}
          </Text>

          {/* Для беременности, kids и diary показываем альбомы/обложки */}
          {categoryId === 'pregnancy'
            ? renderCoverPickerList(
                pregnancyAlbums.map((album, index) =>
                  albumToPickerRow(album, index)
                ),
                emptyAlbumsMessage
              )
            : categoryId === 'kids'
              ? renderCoverPickerList(
                  kidsAlbums.map((album, index) =>
                    albumToPickerRow(album, index)
                  ),
                  emptyAlbumsMessage
                )
              : categoryId === 'holidays'
                ? renderCoverPickerList(
                    holidayAlbums.map((album, index) =>
                      albumToPickerRow(album, index)
                    ),
                    emptyAlbumsMessage
                  )
                : categoryId === 'family'
                  ? renderCoverPickerList(
                      familyAlbums.map((album, index) =>
                        albumToPickerRow(album, index)
                      ),
                      emptyAlbumsMessage
                    )
                  : categoryId === 'diary'
                    ? renderCoverPickerList(
                        diaryCovers.map((cover, index) => ({
                          id: cover.id,
                          name: getCoverSelectTitleBySku(cover.sku, 'diary'),
                          description:
                            'Личный дневник для записи мыслей и воспоминаний',
                          imageSource: cover.image,
                          onPress: () => handleCoverSelect(cover),
                          priorityIndex: index,
                        })),
                        emptyDiaryMessage
                      )
                    : renderCoverPickerList(
                        categoryProducts.map((product, index) => ({
                          id: product.id,
                          name: product.name,
                          description: product.description,
                          imageSource: product.coverImage,
                          onPress: () => handleProductSelect(product),
                          priorityIndex: index,
                          features:
                            product.hasReminders &&
                            (categoryId === 'pregnancy' || categoryId === 'kids') ? (
                              <View style={styles.productFeatures}>
                                <View style={styles.feature}>
                                  <Ionicons
                                    name="notifications-outline"
                                    size={16}
                                    color={colors.textSecondary}
                                  />
                                  <Text style={styles.featureText}>
                                    Напоминания
                                  </Text>
                                </View>
                              </View>
                            ) : undefined,
                        })),
                        emptyAlbumsMessage
                      )}
        </ScrollView>
      </Animated.View>

      {showCoverDateModal && categoryId && (categoryId === 'pregnancy' || categoryId === 'kids') && (
        <AlbumDateSheet
          visible={showCoverDateModal}
          title={getCategoryInfo(categoryId).title}
          description={getCategoryInfo(categoryId).description}
          value={coverDate}
          onChange={setCoverDate}
          onClose={handleCoverDateCancel}
          onConfirm={handleCoverDateConfirm}
          isSaving={isSavingCoverDate}
          {...getAlbumCategoryDateBounds(categoryId === 'kids')}
        />
      )}

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
}) => (
  <AppBottomSheet
    visible={visible}
    onClose={onClose}
    title={prompt}
    subtitle="Эта дата поможет строить напоминания и рекомендации"
    scroll={false}
    footer={
      <View style={styles.modalButtonsRow}>
        <AppButton title="Пропустить" variant="outline" onPress={onSkip} fullWidth={false} style={styles.modalBtnHalf} />
        <AppButton title="Подтвердить" onPress={onConfirm} fullWidth={false} style={styles.modalBtnHalf} />
      </View>
    }
  >
    <AppInlineDatePicker
      value={selectedDate}
      onChange={onSelectDate}
      minimumDate={new Date(1900, 0, 1)}
      maximumDate={new Date(2030, 11, 31)}
    />
  </AppBottomSheet>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 18,
  },
  headerBackButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 28,
    color: colors.textPrimary,
    fontFamily: sansFont('bold'),
    fontWeight: '700',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: 16,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
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
    borderColor: colors.border,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    gap: 16,
  },
  productCardTile: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: 16,
    marginBottom: 0,
    minWidth: 0,
  },
  productImage: {
    width: 80,
    height: 100,
    backgroundColor: colors.background,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  productImageContent: {
    width: '100%',
    height: '100%',
  },
  productImageTile: {
    width: '100%',
    height: 200,
    marginBottom: 12,
  },
  productContent: {
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  productContentTile: {
    flex: 0,
    width: '100%',
  },
  productNameTile: {
    fontSize: 15,
    color: colors.textPrimary,
    fontFamily: sansFont('bold'),
    fontWeight: '700',
    textAlign: 'left',
    lineHeight: 20,
    marginBottom: 4,
    width: '100%',
  },
  productDescriptionTile: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    textAlign: 'left',
    lineHeight: 18,
    width: '100%',
  },
  productName: {
    fontSize: 18,
    color: colors.textPrimary,
    fontFamily: sansFont('bold'),
    fontWeight: '700',
    flexShrink: 1,
  },
  productDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    lineHeight: 20,
    flexShrink: 1,
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
    color: colors.textSecondary,
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
    color: colors.textPrimary,
    fontFamily: sansFont('bold'),
    fontWeight: '700',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
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
    backgroundColor: colors.background,
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
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtnHalf: {
    flex: 1,
  },
  skipButton: {
    alignItems: 'center',
    gap: 4,
  },
  skipButtonText: {
    fontSize: 15,
    color: colors.textSecondary,
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
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: colors.textPrimary,
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
    color: colors.textPrimary,
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
    color: colors.textSecondary,
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
    backgroundColor: colors.primary,
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
    borderColor: colors.border,
    gap: 12,
  },
  emptyStateInlineText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
  },
});

