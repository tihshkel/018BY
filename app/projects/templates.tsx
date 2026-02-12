import { getAlbumTemplateById, getAlbumTemplatesByCategory, type AlbumTemplate } from '@/albums';
import { getGiftItemBySku } from '@/utils/albumGiftMapping';
import { KIDS_COVER_DESIGNS } from '@/utils/kidsCoverDesigns';
import { PREGNANCY_COVER_DESIGNS } from '@/utils/pregnancyCoverDesigns';
import {
    buildProjectProducts,
    projectCategories,
    type ProjectProduct,
} from '@/constants/projectTemplates';
import { getRemindersStorageKey, getSupabaseNotConfiguredAlertMessageOnce, isSupabaseNotConfiguredError, pushCoreOnlyToCloud } from '@/utils/account-sync';
import { getAlbumImages } from '@/utils/albumImages';
import { getAllDiaryCovers, getDiaryInteriorImageUris } from '@/utils/diaryAlbumsLoader';
import { scheduleKidsNotifications } from '@/utils/kidsNotificationScheduler';
import { schedulePregnancyNotifications } from '@/utils/pregnancyNotificationScheduler';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Asset } from 'expo-asset';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Modal,
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
import { SafeAreaView } from 'react-native-safe-area-context';

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
  // State for pregnancy/kids date modal
  const [selectedAlbumForDate, setSelectedAlbumForDate] = useState<AlbumTemplate | null>(null);
  const [showCoverDateModal, setShowCoverDateModal] = useState(false);
  const [coverDate, setCoverDate] = useState(new Date());
  const [showCoverDatePicker, setShowCoverDatePicker] = useState(false);
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
      return PREGNANCY_COVER_DESIGNS.map((d) => {
        const giftItem = getGiftItemBySku(d.sku);
        return {
          id: d.id,
          name: giftItem?.title ?? d.title,
          description: 'Дизайн обложки',
          thumbnailPath: d.image,
        } as AlbumTemplate;
      });
    }
    return [];
  }, [categoryId]);

  // Для «Первые годы малыша» — только first_page из albums/kids. Тип обложки выбирается при экспорте
  const kidsAlbums = useMemo(() => {
    if (categoryId === 'kids') {
      return KIDS_COVER_DESIGNS.map((d) => {
        const giftItem = getGiftItemBySku(d.sku);
        const albumTemplate = getAlbumTemplateById(d.id);
        return {
          id: d.id,
          name: giftItem?.title ?? albumTemplate?.name ?? 'Фотоальбом от 0 до 1 года',
          description: 'Дизайн обложки',
          thumbnailPath: d.image,
        } as AlbumTemplate;
      });
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

      const accessCode = await AsyncStorage.getItem('@access_code');
      const remindersKey = accessCode ? getRemindersStorageKey(accessCode) : '@reminders';
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

    try {
      // Save reminder
      await scheduleReminder(coverDate, categoryId);

      // Для беременности планируем все уведомления
      if (categoryId === 'pregnancy') {
        const projectId = `pregnancy_${Date.now()}`;
        console.log('[Templates] Scheduling pregnancy notifications for due date:', coverDate.toLocaleDateString());
        await schedulePregnancyNotifications(coverDate, projectId);
      }
      // Для детей планируем все уведомления по дате рождения
      if (categoryId === 'kids') {
        const projectId = `kids_${Date.now()}`;
        console.log('[Templates] Scheduling kids notifications for birth date:', coverDate.toLocaleDateString());
        await scheduleKidsNotifications(coverDate, projectId);
      }

      const pushResult = await pushCoreOnlyToCloud();
      if (!pushResult.ok) {
        console.warn('[Templates] Sync failed:', pushResult.error);
        if (isSupabaseNotConfiguredError(pushResult.error)) {
          const msg = getSupabaseNotConfiguredAlertMessageOnce();
          if (msg) Alert.alert('Сохранено на устройстве', msg);
        } else {
          Alert.alert('Сохранено на устройстве', `В облако не удалось отправить: ${pushResult.error ?? 'неизвестная ошибка'}. Проверьте интернет и .env.`);
        }
      }

      setShowCoverDateModal(false);

      router.push({
        pathname: '/select-action',
        params: {
          celebration: categoryId,
          coverType: selectedAlbumForDate.id,
          eventDate: coverDate.toISOString(),
        },
      });
    } catch (error) {
      console.error('Error saving event date:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить дату. Попробуйте ещё раз.');
    } finally {
      setIsSavingCoverDate(false);
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
            {(categoryId === 'pregnancy' || categoryId === 'kids' || categoryId === 'diary') ? 'Выберите обложку' : 'Выберите готовый вариант альбома'}
          </Text>

          {/* Для беременности, kids и diary показываем альбомы/обложки */}
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
          ) : categoryId === 'diary' ? (
            /* Для дневников показываем обложки */
            diaryCovers.length === 0 ? (
              <View style={styles.emptyStateInline}>
                <Ionicons name='document-outline' size={40} color='#D4C4B5' />
                <Text style={styles.emptyStateInlineText}>
                  Пока нет готовых дневников для этой категории. Попробуйте выбрать
                  другую тему.
                </Text>
              </View>
            ) : (
              diaryCovers.map((cover) => (
                <TouchableOpacity
                  key={cover.id}
                  style={styles.productCard}
                  activeOpacity={0.85}
                  onPress={() => handleCoverSelect(cover)}
                >
                  <View style={styles.productImage}>
                    {cover.image ? (
                      <Image
                        source={cover.image}
                        style={styles.productImageContent}
                        contentFit="cover"
                        priority={diaryCovers.indexOf(cover) < 5 ? "high" : "normal"}
                        cachePolicy="disk"
                        transition={0}
                        fadeDuration={0}
                        recyclingKey={cover.id}
                      />
                    ) : (
                      <Ionicons name='book' size={48} color='#C9A89A' />
                    )}
                  </View>
                  <View style={styles.productContent}>
                    <Text style={styles.productName}>{cover.name}</Text>
                    <Text style={styles.productDescription}>
                      Личный дневник для записи мыслей и воспоминаний
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

      {/* Date modal for pregnancy/kids covers */}
      {showCoverDateModal && categoryId && (categoryId === 'pregnancy' || categoryId === 'kids') && (() => {
        const categoryInfo = getCategoryInfo(categoryId);
        const isPastDateAllowed = categoryId === 'kids';

        return (
          <Modal
            visible={showCoverDateModal}
            transparent={true}
            animationType="slide"
            onRequestClose={handleCoverDateCancel}
          >
            <View style={styles.coverDateModalOverlay}>
              <View style={styles.coverDateModalContent}>
                <View style={styles.coverDateModalHeader}>
                  <Text style={styles.coverDateModalTitle}>{categoryInfo.title}</Text>
                  <TouchableOpacity onPress={handleCoverDateCancel}>
                    <Ionicons name="close" size={24} color="#8B6F5F" />
                  </TouchableOpacity>
                </View>

                <View style={styles.coverDateModalBody}>
                  <Text style={styles.coverDateModalDescription}>
                    {categoryInfo.description}
                  </Text>

                  <TouchableOpacity
                    style={styles.coverDateButton}
                    onPress={() => setShowCoverDatePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="calendar-outline" size={24} color="#C9A89A" />
                    <View style={styles.coverDateButtonTextContainer}>
                      <Text style={styles.coverDateButtonLabel}>{categoryInfo.title}</Text>
                      <Text style={styles.coverDateButtonText}>
                        {coverDate.toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#D4C4B5" />
                  </TouchableOpacity>

                  {showCoverDatePicker && (
                    <DateTimePicker
                      value={coverDate}
                      mode="date"
                      display={Platform.select({
                        ios: 'spinner',
                        android: 'default',
                        default: 'default',
                      })}
                      minimumDate={
                        isPastDateAllowed
                          ? (() => {
                              const d = new Date();
                              d.setFullYear(d.getFullYear() - 100);
                              return d;
                            })()
                          : new Date()
                      }
                      maximumDate={
                        isPastDateAllowed ? new Date() : new Date(new Date().setFullYear(new Date().getFullYear() + 2))
                      }
                      onChange={(event, date) => {
                        if (Platform.OS === 'android') {
                          setShowCoverDatePicker(false);
                        }
                        if (date && event.type !== 'dismissed') {
                          setCoverDate(date);
                        }
                      }}
                      locale="ru-RU"
                      themeVariant="light"
                      textColor={Platform.OS === 'ios' ? '#8B6F5F' : undefined}
                    />
                  )}

                  {Platform.OS === 'ios' && showCoverDatePicker && (
                    <View style={styles.iosCoverDatePickerButtons}>
                      <TouchableOpacity
                        style={styles.iosCoverDatePickerButton}
                        onPress={() => setShowCoverDatePicker(false)}
                      >
                        <Text style={styles.iosCoverDatePickerButtonText}>Готово</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View style={styles.coverDateModalButtons}>
                  <TouchableOpacity
                    style={styles.coverDateCancelButton}
                    onPress={handleCoverDateCancel}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.coverDateCancelButtonText}>Отмена</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.coverDateConfirmButton,
                      isSavingCoverDate && { opacity: 0.6 },
                    ]}
                    onPress={handleCoverDateConfirm}
                    activeOpacity={0.85}
                    disabled={isSavingCoverDate}
                  >
                    <Text style={styles.coverDateConfirmButtonText}>
                      {isSavingCoverDate ? 'Сохраняем…' : 'Сохранить'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        );
      })()}

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
  // Cover date modal styles for pregnancy/kids
  coverDateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  coverDateModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  coverDateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  coverDateModalTitle: {
    fontSize: 20,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
  },
  coverDateModalBody: {
    marginBottom: 24,
  },
  coverDateModalDescription: {
    fontSize: 15,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    lineHeight: 22,
    marginBottom: 20,
  },
  coverDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8D5C7',
  },
  coverDateButtonTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  coverDateButtonLabel: {
    fontSize: 12,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '400',
    marginBottom: 4,
  },
  coverDateButtonText: {
    fontSize: 18,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '500',
  },
  iosCoverDatePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  iosCoverDatePickerButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#C9A89A',
    borderRadius: 12,
  },
  iosCoverDatePickerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  coverDateModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  coverDateCancelButton: {
    flex: 1,
    backgroundColor: '#F5F0EB',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  coverDateCancelButtonText: {
    color: '#8B6F5F',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  coverDateConfirmButton: {
    flex: 1,
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
  coverDateConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
});

