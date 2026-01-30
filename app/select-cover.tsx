import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Asset } from 'expo-asset';
import { getAllAlbumTemplates, type AlbumTemplate } from '@/albums';
import { schedulePregnancyNotifications } from '@/utils/pregnancyNotificationScheduler';
import { getAllDiaryCovers, getDiaryInteriorImageUris } from '@/utils/diaryAlbumsLoader';
import { getAlbumImages } from '@/utils/albumImages';
import { getKidsFirstPageImage } from '@/utils/albumFirstLastPages';
import { getGiftItemBySku } from '@/utils/albumGiftMapping';

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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

// Маппинг ID альбомов беременности к изображениям и SKU из каталога (DB1-DB6)
const PREGNANCY_COVERS_MAPPING: Record<string, { image: any; sku: string }> = {
  'pregnancy_60': { 
    image: require('@/albums/DB1/page_001.png'),
    sku: 'DB1'
  },
  'pregnancy_db2': { 
    image: require('@/albums/DB2/page_001.png'),
    sku: 'DB2'
  },
  'pregnancy_db3': { 
    image: require('@/albums/DB3/page_001.png'),
    sku: 'DB3'
  },
  'pregnancy_db4': { 
    image: require('@/albums/DB4/page_001.png'),
    sku: 'DB4'
  },
  'pregnancy_db5': { 
    image: require('@/albums/DB5/page_001.png'),
    sku: 'DB5'
  },
  'pregnancy_2': { 
    image: require('@/albums/DB6/page_001.png'),
    sku: 'DB6'
  },
};

export default function SelectCoverScreen() {
  const params = useLocalSearchParams<{ celebration: string | string[] }>();
  // Нормализуем celebration - может быть строкой или массивом
  const celebration = Array.isArray(params.celebration)
    ? params.celebration[0]
    : params.celebration;

  const containerOpacity = useSharedValue(0);
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedCoverId, setSelectedCoverId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);


  React.useEffect(() => {
    console.log('[Select Cover] showDateModal state:', showDateModal);
  }, [showDateModal]);

  // Получаем все альбомы и преобразуем их в обложки
  const albumTemplates = getAllAlbumTemplates();
  const diaryCovers = getAllDiaryCovers();

  const coverTypes: CoverType[] = useMemo(() => {
    // Генерация градиентов на основе категорий
    const categoryGradients: { [key: string]: string[] } = {
      pregnancy: ['#FF6B9D', '#FF8E9B'],
      kids: ['#4ECDC4', '#44A08D'],
      family: ['#D4A574', '#C9A89A'],
      wedding: ['#F093FB', '#F5576C'],
      travel: ['#FFD89B', '#19547B'],
      diary: ['#C9A89A', '#A68B5B'],
    };

    // Для дневников используем специальные обложки
    if (celebration === 'diary') {
      return diaryCovers.map((cover) => {
        const gradient = categoryGradients.diary;
        return {
          id: cover.id,
          title: cover.name,
          description: 'Личный дневник для записи мыслей и воспоминаний',
          image: cover.image,
          color: gradient[0],
          gradient,
        };
      });
    }

    // Фильтруем альбомы по категории, если указана
    let filteredAlbums = celebration
      ? albumTemplates.filter(album => album.category === celebration)
      : albumTemplates;

    // Для беременности показываем только обложки DB1-DB6
    // Исключаем мягкие обложки (_soft, _a5)
    if (celebration === 'pregnancy') {
      const allowedIds = ['pregnancy_60', 'pregnancy_db2', 'pregnancy_db3', 'pregnancy_db4', 'pregnancy_db5', 'pregnancy_2'];
      filteredAlbums = filteredAlbums.filter(album => allowedIds.includes(album.id));
    }

    // Для детей все альбомы уже соответствуют папкам "1 стр" (они были организованы из папок "1 стр_DFA*")
    // Используем first_page.png из каждой подпапки albums/kids/DFA*/first_page.png
    // Для остальных категорий используем thumbnailPath

    const result = filteredAlbums.map((album, index) => {
      const gradient = categoryGradients[album.category] || ['#8B6F5F', '#A68B5B'];
      
      // Для беременности используем page_001.png из папок albums/DB*/ и названия из каталога
      let coverImage = album.thumbnailPath;
      let coverTitle = album.name;
      let coverDescription = album.description;
      
      if (celebration === 'pregnancy') {
        const coverMapping = PREGNANCY_COVERS_MAPPING[album.id];
        if (coverMapping) {
          // Заменяем изображение на page_001.png из папки albums/DB*/
          coverImage = coverMapping.image;
          // Заменяем название на название из каталога
          const giftItem = getGiftItemBySku(coverMapping.sku);
          if (giftItem) {
            coverTitle = giftItem.title;
            coverDescription = giftItem.description || album.description;
          }
        }
      }
      
      // Для kids используем first_page.png из папки albums/kids/DFA*/first_page.png
      if (celebration === 'kids') {
        const firstPageImage = getKidsFirstPageImage(album.id);
        if (firstPageImage) {
          coverImage = firstPageImage;
        }
      }
      
      return {
        id: album.id,
        title: coverTitle,
        description: coverDescription,
        image: coverImage,
        color: gradient[0],
        gradient,
      };
    });
    
    return result;
  }, [albumTemplates, celebration, diaryCovers]);

  React.useEffect(() => {
    containerOpacity.value = withTiming(1, { duration: 400 });
  }, []);

  // МАКСИМАЛЬНАЯ предзагрузка всех изображений обложек и внутренних страниц
  useFocusEffect(
    React.useCallback(() => {
      const preloadCoverImages = async () => {
        try {
          const imagesToPreload = coverTypes
            .filter(cover => cover.image)
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

          console.log(`✅ Предзагружено ${imagesToPreload.length} изображений обложек`);
          
          // МАКСИМАЛЬНАЯ загрузка: предзагружаем ВСЕ внутренние страницы для pregnancy, kids и diary
          Promise.resolve().then(async () => {
            try {
              if (celebration === 'pregnancy') {
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
              } else if (celebration === 'kids') {
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
              } else if (celebration === 'diary') {
                // Предзагружаем оба варианта внутренних страниц дневников
                const brownUris = await getDiaryInteriorImageUris('diary_interior_brown');
                const purpleUris = await getDiaryInteriorImageUris('diary_interior_purple');
                const totalPages = (brownUris?.length || 0) + (purpleUris?.length || 0);
                console.log(`✅ Предзагружено ${totalPages} внутренних страниц дневников (коричневый: ${brownUris?.length || 0}, фиолетовый: ${purpleUris?.length || 0})`);
              }
            } catch (err) {
              // Игнорируем ошибки фоновой загрузки
            }
          });
        } catch (error) {
          // Игнорируем общие ошибки
        }
      };

      preloadCoverImages();
    }, [coverTypes, celebration])
  );

  // Также предзагружаем при монтировании (дублируем логику для максимальной скорости)
  React.useEffect(() => {
    const preloadOnMount = async () => {
      try {
        const imagesToPreload = coverTypes
          .filter(cover => cover.image)
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
              // Игнорируем ошибки
            }
          })
        );
        
        // МАКСИМАЛЬНАЯ загрузка: предзагружаем внутренние страницы при монтировании
        Promise.resolve().then(async () => {
          try {
            if (celebration === 'pregnancy') {
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
              }
            } else if (celebration === 'kids') {
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
              }
            } else if (celebration === 'diary') {
              await getDiaryInteriorImageUris('diary_interior_brown');
              await getDiaryInteriorImageUris('diary_interior_purple');
            }
          } catch (err) {
            // Игнорируем ошибки фоновой загрузки
          }
        });
      } catch (error) {
        // Игнорируем ошибки
      }
    };

    preloadOnMount();
  }, [coverTypes, celebration]);

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
        // Текущая дата (может быть в прошлом)
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

      // Загружаем существующие напоминания
      const existingReminders = await AsyncStorage.getItem('@reminders');
      let allReminders = existingReminders ? JSON.parse(existingReminders) : [];

      // Удаляем старые напоминания для этой категории с таким же заголовком (если есть)
      allReminders = allReminders.filter((r: any) =>
        r.categoryId !== categoryId || r.title !== categoryInfo.title
      );

      // Добавляем новое напоминание
      allReminders.push(reminder);

      // Сохраняем
      await AsyncStorage.setItem('@reminders', JSON.stringify(allReminders));

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
        let trigger: any;
        if (Platform.OS === 'ios') {
          trigger = { date: notificationDate };
        } else {
          // Android: используем объект с seconds
          const seconds = Math.floor((notificationDate.getTime() - now.getTime()) / 1000);
          if (seconds > 0) {
            trigger = { seconds };
          }
        }

        if (trigger) {
          const Notifications = getNotifications();
          if (Notifications) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: categoryInfo.notificationTitle,
                body: categoryInfo.notificationBody,
                sound: true,
              },
              trigger,
            });
          }
        }
      } else if (eventDate > now) {
        // Для других категорий планируем только если дата в будущем
        let trigger: any;
        if (Platform.OS === 'ios') {
          trigger = { date: eventDate };
        } else {
          // Android: используем объект с seconds
          const seconds = Math.floor((eventDate.getTime() - now.getTime()) / 1000);
          if (seconds > 0) {
            trigger = { seconds };
          }
        }

        if (trigger) {
          const Notifications = getNotifications();
          if (Notifications) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: categoryInfo.notificationTitle,
                body: categoryInfo.notificationBody,
                sound: true,
              },
              trigger,
            });
          }
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

    // Для беременности и детей показываем модальное окно выбора даты
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

    try {
      // Сохраняем дату события как напоминание
      await scheduleReminder(dueDate, celebration);

      // Для беременности планируем все уведомления (42 недели + триместры + ПДР и т.д.)
      if (celebration === 'pregnancy') {
        const projectId = `pregnancy_${Date.now()}`;
        console.log('[SelectCover] Scheduling pregnancy notifications for due date:', dueDate.toLocaleDateString());
        await schedulePregnancyNotifications(dueDate, projectId);
      }

      // Закрываем модальное окно
      setShowDateModal(false);

      // Переходим на страницу выбора действия
      router.push({
        pathname: '/select-action',
        params: {
          celebration,
          coverType: selectedCoverId,
          eventDate: dueDate.toISOString(),
        }
      });

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Error saving event date:', error);
      const categoryInfo = getCategoryInfo(celebration);
      Alert.alert('Ошибка', `Не удалось сохранить ${categoryInfo.title.toLowerCase()}`);
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
      diary: 'Дневники',
    };
    return celebrationMap[celebrationId] || 'Праздник';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient
        colors={['#F5F0EB', '#FAF8F5', '#F5F0EB']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <Animated.View style={[styles.content, containerAnimatedStyle]}>
        {/* Заголовок с кнопкой назад */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#8B6F5F" />
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
          contentContainerStyle={styles.scrollContent}
        >
          {coverTypes.map((cover) => (
            <TouchableOpacity
              key={cover.id}
              style={styles.coverCard}
              onPress={() => handleCoverSelect(cover.id)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FFFFFF', '#FFFFFF']}
                style={styles.cardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardImageContainer}>
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
                    <Text style={styles.cardTitle}>
                      {cover.title}
                    </Text>
                    <Text style={styles.cardDescription}>
                      {cover.description}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#C9A89A" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Модальное окно выбора даты события - только для беременности и детей */}
      {showDateModal && celebration && typeof celebration === 'string' && (celebration === 'pregnancy' || celebration === 'kids') && (() => {
        const categoryInfo = getCategoryInfo(celebration);
        const isPastDateAllowed = celebration === 'kids'; // Для детства можно выбрать дату в прошлом

        return (
          <Modal
            visible={showDateModal}
            transparent={true}
            animationType="slide"
            onRequestClose={handleDateCancel}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{categoryInfo.title}</Text>
                  <TouchableOpacity onPress={handleDateCancel}>
                    <Ionicons name="close" size={24} color="#8B6F5F" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <Text style={styles.modalDescription}>
                    {categoryInfo.description}
                  </Text>

                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="calendar-outline" size={24} color="#C9A89A" />
                    <View style={styles.dateButtonTextContainer}>
                      <Text style={styles.dateButtonLabel}>{categoryInfo.title}</Text>
                      <Text style={styles.dateButtonText}>
                        {dueDate.toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#D4C4B5" />
                  </TouchableOpacity>

                  {showDatePicker && (
                    <DateTimePicker
                      value={dueDate}
                      mode="date"
                      display={Platform.select({
                        ios: 'spinner',
                        android: 'default',
                        default: 'default',
                      })}
                      minimumDate={isPastDateAllowed ? undefined : new Date()}
                      maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() + 2))}
                      onChange={(event, date) => {
                        if (Platform.OS === 'android') {
                          setShowDatePicker(false);
                        }
                        if (date && event.type !== 'dismissed') {
                          setDueDate(date);
                        }
                      }}
                      locale="ru-RU"
                      themeVariant="light"
                      textColor={Platform.OS === 'ios' ? '#8B6F5F' : undefined}
                    />
                  )}

                  {Platform.OS === 'ios' && showDatePicker && (
                    <View style={styles.iosDatePickerButtons}>
                      <TouchableOpacity
                        style={styles.iosDatePickerButton}
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text style={styles.iosDatePickerButtonText}>Готово</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleDateCancel}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelButtonText}>Отмена</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={handleDateConfirm}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.confirmButtonText}>Сохранить</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        );
      })()}
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
    paddingHorizontal: 24,
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
    shadowColor: '#8B6F5F',
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
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#9B8E7F',
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  coverCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardGradient: {
    padding: 20,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardImageContainer: {
    width: 100,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FAF8F5',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardTextContainer: {
    flex: 1,
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
    marginBottom: 6,
  },
  cardDescription: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
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
  modalBody: {
    marginBottom: 24,
  },
  modalDescription: {
    fontSize: 16,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    lineHeight: 24,
    marginBottom: 24,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: '#F0E8E0',
    gap: 12,
  },
  dateButtonTextContainer: {
    flex: 1,
  },
  dateButtonLabel: {
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
  dateButtonText: {
    fontSize: 18,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0E8E0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#C9A89A',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
  },
  iosDatePickerButtons: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0E8E0',
    marginTop: 12,
  },
  iosDatePickerButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  iosDatePickerButtonText: {
    fontSize: 16,
    color: '#C9A89A',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
  },
});
