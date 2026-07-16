import { colors, createShadow, radii, sansFont } from '@/constants/design-tokens';
import { getAllAlbumTemplates } from '@/albums';
import { getRemindersStorageKey } from '@/utils/account-sync';
import { OPEN_NOTIFICATIONS_INBOX_DATA } from '@/utils/notifications';
import { withTimeout } from '@/utils/asyncTimeout';
import { runDueDateBackgroundSetup } from '@/utils/dueDateBackgroundSetup';
import { getAccountSyncId } from '@/utils/account-identity';
import { FAMILY_COVER_DESIGNS, getFamilyCoverPickerDescription } from '@/utils/familyCoverDesigns';
import { HOLIDAY_COVER_DESIGNS, getHolidayCoverPickerDescription } from '@/utils/holidayCoverDesigns';
import { KIDS_COVER_DESIGNS } from '@/utils/kidsCoverDesigns';
import { PREGNANCY_COVER_DESIGNS } from '@/utils/pregnancyCoverDesigns';
import {
  getWeddingCoverPickerDescription,
  getWeddingCoverPickerTitle,
  WEDDING_COVER_DESIGNS,
} from '@/utils/weddingCoverDesigns';
import { getCoverSelectTitleBySku } from '@/utils/coverSelectTitle';
import { getAllDiaryCovers } from '@/utils/diaryAlbumsLoader';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AlbumDateSheet, getAlbumCategoryDateBounds } from '@/components/album/album-date-sheet';
import { Asset } from 'expo-asset';
import Constants from 'expo-constants';
import { SchedulableTriggerInputTypes, type DateTriggerInput } from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
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
import {
  getGridColumnCount,
  getGridColumnWrapperStyle,
  getGridListStyle,
  getTabletContentShell,
  getTabletSectionWrap,
  PICKER_CONTENT_MAX_WIDTH,
  useResponsiveLayout,
} from '@/utils/responsive';

// Проверяем, находимся ли мы в Expo Go (где уведомления не работают)
const isExpoGo = Constants.executionEnvironment === 'storeClient';

// Функция для безопасной загрузки expo-notifications (только при необходимости)
let notificationHandlerInitialized = false;
let notificationsModule: typeof import('expo-notifications') | null = null;

const getNotifications = (): typeof import('expo-notifications') | null => {
  // В Expo Go не загружаем модуль вообще, чтобы избежать ошибок
  if (isExpoGo) {
    return null;
  }

  // Если модуль уже загружен, возвращаем его
  if (notificationsModule) {
    return notificationsModule;
  }

  try {
    // Используем require только внутри функции, чтобы избежать загрузки при импорте файла
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require('expo-notifications');

    // Настраиваем обработчик только один раз
    if (Notifications && !notificationHandlerInitialized) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
      notificationHandlerInitialized = true;
    }

    notificationsModule = Notifications;
    return Notifications;
  } catch (error) {
    // Модуль недоступен - это нормально
    return null;
  }
};

interface CoverType {
  id: string;
  title: string;
  description: string;
  image: any;
  color: string;
  gradient: string[];
}

interface CategoryInfo {
  name: string;
  title: string;
  description: string;
  notificationTitle: string;
  notificationBody: string;
}

export default function SelectCoverScreen() {
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
  const params = useLocalSearchParams<{ celebration: string | string[] }>();
  // Нормализуем celebration - может быть строкой или массивом
  const celebration = Array.isArray(params.celebration)
    ? params.celebration[0]
    : params.celebration;

  const containerOpacity = useSharedValue(0);
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedCoverId, setSelectedCoverId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState(new Date());
  const [isSavingDate, setIsSavingDate] = useState(false);


  // Получаем все альбомы и преобразуем их в обложки
  const albumTemplates = getAllAlbumTemplates();
  const diaryCovers = getAllDiaryCovers();

  const coverTypes: CoverType[] = useMemo(() => {
    // Генерация градиентов на основе категорий
    const categoryGradients: { [key: string]: string[] } = {
      pregnancy: [colors.primary, colors.primaryLight],
      kids: ['#4ECDC4', '#44A08D'],
      family: ['#D4A574', colors.primary],
      wedding: ['#F093FB', '#F5576C'],
      travel: ['#FFD89B', '#19547B'],
      holidays: ['#FF7043', '#FF5252'],
      diary: [colors.primary, '#A68B5B'],
    };

    // Для дневников используем специальные обложки
    if (celebration === 'diary') {
      return diaryCovers.map((cover) => {
        const gradient = categoryGradients.diary;
        return {
          id: cover.id,
          title: getCoverSelectTitleBySku(cover.sku, 'diary'),
          description: 'Личный дневник для записи мыслей и воспоминаний',
          image: cover.image,
          color: gradient[0],
          gradient,
        };
      });
    }

    // Для беременности — только 6 дизайнов (DB1–DB6). Тип обложки выбирается при экспорте
    if (celebration === 'pregnancy') {
      const gradient = categoryGradients.pregnancy;
      return PREGNANCY_COVER_DESIGNS.map((design) => ({
        id: design.id,
        title: getCoverSelectTitleBySku(design.sku, 'pregnancy'),
        description: 'Дизайн обложки',
        image: design.image,
        color: gradient[0],
        gradient,
      }));
    }

    // Для kids — только first_page из albums/kids. Тип обложки выбирается при экспорте
    if (celebration === 'kids') {
      const gradient = categoryGradients.kids;
      return KIDS_COVER_DESIGNS.map((design) => {
        return {
          id: design.id,
          title: getCoverSelectTitleBySku(design.sku, 'kids'),
          description: 'Дизайн обложки',
          image: design.image,
          color: gradient[0],
          gradient,
        };
      });
    }

    // Для праздников — обложки из albums/holiday
    if (celebration === 'holidays') {
      const gradient = categoryGradients.holidays;
      return HOLIDAY_COVER_DESIGNS.map((design) => ({
        id: design.id,
        title: getCoverSelectTitleBySku(design.sku, 'holidays'),
        description: getHolidayCoverPickerDescription(design),
        image: design.image,
        color: gradient[0],
        gradient,
      }));
    }

    // Для семьи — обложки из albums/family
    if (celebration === 'family') {
      const gradient = categoryGradients.family;
      return FAMILY_COVER_DESIGNS.map((design) => ({
        id: design.id,
        title: getCoverSelectTitleBySku(design.sku, 'family'),
        description: getFamilyCoverPickerDescription(design),
        image: design.image,
        color: gradient[0],
        gradient,
      }));
    }

    if (celebration === 'wedding') {
      const gradient = categoryGradients.wedding;
      return WEDDING_COVER_DESIGNS.map((design) => ({
        id: design.id,
        title: getWeddingCoverPickerTitle(design),
        description: getWeddingCoverPickerDescription(design),
        image: design.image,
        color: gradient[0],
        gradient,
      }));
    }

    // Фильтруем альбомы по категории для остальных категорий
    let filteredAlbums = celebration
      ? albumTemplates.filter(album => album.category === celebration)
      : albumTemplates;

    const result = filteredAlbums.map((album) => {
      const gradient = categoryGradients[album.category] || [colors.textPrimary, '#A68B5B'];
      return {
        id: album.id,
        title: album.name,
        description: album.description,
        image: album.thumbnailPath,
        color: gradient[0],
        gradient,
      };
    });
    
    return result;
  }, [albumTemplates, celebration, diaryCovers]);

  React.useEffect(() => {
    containerOpacity.value = withTiming(1, { duration: 400 });
  }, []);

  // Предзагрузка только обложек (без 100 внутренних страниц дневников — лаги на Android)
  useFocusEffect(
    React.useCallback(() => {
      const preloadCoverImages = async () => {
        try {
          const imagesToPreload = coverTypes
            .filter(cover => cover.image)
            .slice(0, celebration === 'diary' ? 8 : coverTypes.length)
            .map(cover => cover.image!);

          await Promise.all(
            imagesToPreload.map(async (imageSource) => {
              try {
                if (typeof imageSource === 'string') {
                  await Image.prefetch(imageSource);
                } else {
                  const asset = Asset.fromModule(imageSource);
                  await asset.downloadAsync();
                }
              } catch (err) {
                // Игнорируем ошибки отдельных изображений
              }
            })
          );
        } catch (error) {
          // Игнорируем общие ошибки
        }
      };

      preloadCoverImages();
    }, [coverTypes, celebration])
  );

  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: containerOpacity.value,
    };
  });

  // Запрашиваем разрешения на уведомления при монтировании для всех категорий
  React.useEffect(() => {
    if (celebration) {
      const Notifications = getNotifications();
      if (Notifications) {
        Notifications.requestPermissionsAsync().catch(() => {
          // Игнорируем ошибки в Expo Go
        });
      }
    }
  }, [celebration]);

  // Получаем информацию о категории для напоминаний
  const getCategoryInfo = (categoryId: string): CategoryInfo => {
    const categoryMap: { [key: string]: CategoryInfo } = {
      pregnancy: {
        name: 'Беременность',
        title: 'Предварительная дата родов',
        description: 'Выберите предварительную дату родов. Эта дата будет сохранена в напоминаниях, и вы будете получать уведомления.',
        notificationTitle: 'Предварительная дата родов',
        notificationBody: 'Сегодня ваша предварительная дата родов!',
      },
      kids: {
        name: 'Детство',
        title: 'Дата рождения ребенка',
        description: 'Выберите дату рождения ребенка. Эта дата будет сохранена в напоминаниях, и вы будете получать уведомления о важных моментах.',
        notificationTitle: 'День рождения ребенка',
        notificationBody: 'Сегодня день рождения вашего ребенка!',
      },
      wedding: {
        name: 'Свадьба',
        title: 'Дата свадьбы',
        description: 'Выберите дату свадьбы. Эта дата будет сохранена в напоминаниях, и вы будете получать уведомления.',
        notificationTitle: 'День свадьбы',
        notificationBody: 'Сегодня годовщина вашей свадьбы!',
      },
      family: {
        name: 'Семья',
        title: 'Дата важного события',
        description: 'Выберите дату важного семейного события. Эта дата будет сохранена в напоминаниях, и вы будете получать уведомления.',
        notificationTitle: 'Важное семейное событие',
        notificationBody: 'Сегодня важная дата для вашей семьи!',
      },
      travel: {
        name: 'Путешествия',
        title: 'Дата поездки',
        description: 'Выберите дату начала поездки. Эта дата будет сохранена в напоминаниях, и вы будете получать уведомления.',
        notificationTitle: 'Начало поездки',
        notificationBody: 'Сегодня начинается ваше путешествие!',
      },
      holidays: {
        name: 'Праздники и события',
        title: 'Дата события',
        description: 'Выберите дату события.',
        notificationTitle: 'Праздник',
        notificationBody: 'Сегодня ваш праздник!',
      },
      diary: {
        name: 'Дневники',
        title: 'Дата начала дневника',
        description: 'Выберите дату начала ведения дневника. Эта дата будет сохранена в напоминаниях.',
        notificationTitle: 'Начало дневника',
        notificationBody: 'Сегодня начало вашего дневника!',
      },
    };
    return categoryMap[categoryId] || categoryMap.pregnancy;
  };

  // Получаем дату по умолчанию для категории
  const getDefaultDate = (categoryId: string): Date => {
    const defaultDate = new Date();
    switch (categoryId) {
      case 'pregnancy':
        // 9 месяцев вперед
        defaultDate.setMonth(defaultDate.getMonth() + 9);
        break;
      case 'kids':
        // Дата рождения: 1 год назад, чтобы пикер открывался на актуальном годе (2024–2026)
        defaultDate.setFullYear(defaultDate.getFullYear() - 1);
        break;
      case 'wedding':
        // 1 год вперед
        defaultDate.setFullYear(defaultDate.getFullYear() + 1);
        break;
      case 'family':
        // 6 месяцев вперед
        defaultDate.setMonth(defaultDate.getMonth() + 6);
        break;
      case 'travel':
        // 3 месяца вперед
        defaultDate.setMonth(defaultDate.getMonth() + 3);
        break;
      default:
        break;
    }
    return defaultDate;
  };

  // Универсальная функция для сохранения напоминаний
  const scheduleReminder = async (eventDate: Date, categoryId: string) => {
    try {
      const categoryInfo = getCategoryInfo(categoryId);

      // Создаем напоминание
      const reminder = {
        id: `${categoryId}_${Date.now()}_1`,
        categoryId: categoryId,
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
        r.categoryId !== categoryId || r.title !== categoryInfo.title
      );

      allReminders.push(reminder);

      await AsyncStorage.setItem(remindersKey, JSON.stringify(allReminders));

      // Планируем уведомление
      // Для kids (день рождения) планируем ежегодное уведомление
      // Для других категорий - одноразовое уведомление на выбранную дату
      const now = new Date();

      if (categoryId === 'kids') {
        // Для дня рождения планируем уведомление на следующий год (если дата в прошлом)
        // или на выбранную дату (если в будущем)
        let notificationDate = eventDate;
        if (eventDate <= now) {
          // Если дата в прошлом, планируем на следующий год
          notificationDate = new Date(eventDate);
          notificationDate.setFullYear(now.getFullYear() + 1);
        }

        // Планируем уведомление
        const Notifications = getNotifications();
        if (Notifications) {
          const trigger: DateTriggerInput = {
            type: SchedulableTriggerInputTypes.DATE,
            date: notificationDate,
          };
          await Notifications.scheduleNotificationAsync({
            content: {
              title: categoryInfo.notificationTitle,
              body: categoryInfo.notificationBody,
              sound: true,
              data: OPEN_NOTIFICATIONS_INBOX_DATA,
            },
            trigger,
          });
        }
      } else if (eventDate > now) {
        // Для других категорий планируем только если дата в будущем
        const Notifications = getNotifications();
        if (Notifications) {
          const trigger: DateTriggerInput = {
            type: SchedulableTriggerInputTypes.DATE,
            date: eventDate,
          };
          await Notifications.scheduleNotificationAsync({
            content: {
              title: categoryInfo.notificationTitle,
              body: categoryInfo.notificationBody,
              sound: true,
              data: OPEN_NOTIFICATIONS_INBOX_DATA,
            },
            trigger,
          });
        }
      }
    } catch (error) {
      console.error(`Error scheduling ${categoryId} reminder:`, error);
    }
  };

  const handleCoverSelect = (coverId: string) => {
    if (!celebration) {
      console.log('[Select Cover] No celebration provided');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    console.log('[Select Cover] Cover selected:', coverId, 'Celebration:', celebration, 'Type:', typeof celebration);

    // Дата нужна только для альбомов, где она влияет на напоминания и контент.
    if (celebration === 'pregnancy' || celebration === 'kids') {
      console.log('[Select Cover] Showing date modal for:', celebration);
      setSelectedCoverId(coverId);
      setShowDateModal(true);
      console.log('[Select Cover] showDateModal set to:', true);
      // Устанавливаем дату по умолчанию в зависимости от категории
      setDueDate(getDefaultDate(celebration));
    } else {
      console.log('[Select Cover] Skipping date modal, celebration:', celebration);
      // Для остальных категорий (включая diary) сразу переходим к выбору действия
      router.push({
        pathname: '/select-action',
        params: {
          celebration,
          coverType: coverId,
        }
      });
    }
  };

  const handleDateConfirm = async () => {
    if (!selectedCoverId || !celebration) return;
    if (isSavingDate) return;
    setIsSavingDate(true);

    const coverId = selectedCoverId;
    const eventDateIso = dueDate.toISOString();

    try {
      await withTimeout(scheduleReminder(dueDate, celebration), 8_000, 'save-reminder');
    } catch (error) {
      console.warn('[SelectCover] Reminder save timed out or failed:', error);
    }

    setShowDateModal(false);
    setIsSavingDate(false);

    router.push({
      pathname: '/select-action',
      params: {
        celebration,
        coverType: coverId,
        eventDate: eventDateIso,
      },
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (celebration === 'pregnancy' || celebration === 'kids') {
      runDueDateBackgroundSetup(dueDate, celebration);
    }

    const syncId = await getAccountSyncId();
    if (!syncId) {
      Alert.alert(
        'Данные сохранены на устройстве',
        'Чтобы дата и напоминания синхронизировались между устройствами, настройте учётную запись в разделе «Профиль».'
      );
    }
  };

  const handleDateCancel = () => {
    setShowDateModal(false);
    setSelectedCoverId(null);
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const getCelebrationTitle = (celebrationId: string) => {
    const celebrationMap: { [key: string]: string } = {
      pregnancy: 'Беременность',
      kids: 'Детство',
      family: 'Семья',
      wedding: 'Свадьба',
      travel: 'Путешествия',
      holidays: 'Праздники и события',
      diary: 'Дневники',
    };
    return celebrationMap[celebrationId] || 'Праздник';
  };

  const renderCoverCard = useCallback(
    (cover: CoverType, variant: 'row' | 'tile') => {
      const isTile = variant === 'tile';
      return (
        <TouchableOpacity
          style={[styles.coverCard, isTile && styles.coverCardTile]}
          onPress={() => handleCoverSelect(cover.id)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#FFFFFF', '#FFFFFF']}
            style={[styles.cardGradient, isTile && styles.cardGradientTile]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View
              style={[styles.cardContent, isTile && styles.cardContentTile]}
            >
              <View
                style={[
                  styles.cardImageContainer,
                  isTile && styles.cardImageContainerTile,
                ]}
              >
                <Image
                  source={cover.image}
                  style={styles.cardImage}
                  contentFit="cover"
                  priority="high"
                  cachePolicy="memory-disk"
                  transition={0}
                  fadeDuration={0}
                  recyclingKey={cover.id}
                  placeholderContentFit="cover"
                />
              </View>
              <View style={styles.cardTextContainer}>
                {isTile ? (
                  <>
                    <Text style={styles.cardTitleTile} numberOfLines={3}>
                      {cover.title}
                    </Text>
                    <Text
                      style={styles.cardDescriptionTile}
                      numberOfLines={2}
                    >
                      {cover.description}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.cardTitle}>{cover.title}</Text>
                    <Text style={styles.cardDescription}>
                      {cover.description}
                    </Text>
                  </>
                )}
              </View>
              {!isTile && (
                <Ionicons name="chevron-forward" size={24} color={colors.primary} />
              )}
            </View>
          </LinearGradient>
        </TouchableOpacity>
      );
    },
    [handleCoverSelect]
  );

  const renderCoverList = () => {
    if (layout.isTablet) {
      return (
        <FlatList
          key={`select-cover-cols-${coverColumnCount}`}
          data={coverTypes}
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
    return coverTypes.map((cover) => (
      <React.Fragment key={cover.id}>
        {renderCoverCard(cover, 'row')}
      </React.Fragment>
    ));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient
        colors={[colors.border, colors.background, colors.border]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <Animated.View
        style={[styles.content, contentShellStyle, containerAnimatedStyle]}
      >
        {/* Заголовок с кнопкой назад */}
        <View style={[styles.header, sectionWrap]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.title}>Выберите обложку</Text>
            <Text style={styles.subtitle}>
              Для альбома &quot;{getCelebrationTitle(celebration || '')}&quot;
            </Text>
          </View>
        </View>

        {/* Список типов обложек */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            sectionWrap,
            { paddingBottom: bottomInset + 24 },
          ]}
        >
          {renderCoverList()}
        </ScrollView>
      </Animated.View>

      {showDateModal &&
        celebration &&
        (celebration === 'pregnancy' || celebration === 'kids') && (
          <AlbumDateSheet
            visible={showDateModal}
            title={getCategoryInfo(celebration).title}
            description={getCategoryInfo(celebration).description}
            value={dueDate}
            onChange={setDueDate}
            onClose={handleDateCancel}
            onConfirm={handleDateConfirm}
            isSaving={isSavingDate}
            {...getAlbumCategoryDateBounds(celebration === 'kids')}
          />
        )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    color: colors.textPrimary,
    fontFamily: sansFont('bold'),
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    lineHeight: 22,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {},
  coverCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  coverCardTile: {
    flex: 1,
    marginBottom: 0,
    minWidth: 0,
  },
  cardGradient: {
    padding: 20,
  },
  cardGradientTile: {
    padding: 16,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardContentTile: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  cardImageContainer: {
    width: 110,
    height: 110,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  cardImageContainerTile: {
    width: '100%',
    height: 200,
    marginBottom: 12,
  },
  cardTitleTile: {
    fontSize: 15,
    color: colors.textPrimary,
    fontFamily: sansFont('bold'),
    fontWeight: '700',
    textAlign: 'left',
    lineHeight: 20,
    marginBottom: 4,
    width: '100%',
  },
  cardDescriptionTile: {
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
    flexShrink: 1,
    width: '100%',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 15,
    color: colors.textPrimary,
    fontFamily: sansFont('bold'),
    fontWeight: '700',
    marginBottom: 4,
    flexShrink: 1,
  },
  cardDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    lineHeight: 17,
    flexShrink: 1,
  },
});
