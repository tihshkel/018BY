import { scheduleSyncToCloud } from '@/utils/account-sync';
import { setupAlbumNotificationsForCelebration } from '@/utils/albumNotificationCoordinator';
import { OPEN_NOTIFICATIONS_INBOX_DATA } from '@/utils/notifications';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { SchedulableTriggerInputTypes, type TimeIntervalTriggerInput } from 'expo-notifications';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
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

interface PaperAlbumNotification {
  id: string;
  type: 'pregnancy' | 'kids';
  date: string; // ISO string
  projectId: string;
  createdAt: string;
}

type AlbumType = 'pregnancy' | 'kids' | null;

interface AlbumTypeOption {
  id: 'pregnancy' | 'kids';
  name: string;
  description: string;
  icon: string;
  dateLabel: string;
}

const ALBUM_TYPES: AlbumTypeOption[] = [
  {
    id: 'pregnancy',
    name: 'Беременность',
    description: 'Уведомления о развитии беременности и подготовке к родам',
    icon: 'heart',
    dateLabel: 'Предварительная дата родов (ПДР)',
  },
  {
    id: 'kids',
    name: 'Дети 0-7 лет',
    description: 'Уведомления о развитии и достижениях ребёнка',
    icon: 'flower',
    dateLabel: 'Дата рождения',
  },
];

export default function PaperAlbumNotificationsScreen() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 32 : 20);
  const [selectedType, setSelectedType] = useState<AlbumType>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleTypeSelect = (type: 'pregnancy' | 'kids') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedType(type);
    setShowDatePicker(true);
  };

  const handleDateChange = (_event: any, date?: Date) => {
    if (date) {
      setSelectedDate(date);
    }
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
  };

  const handleDateConfirm = () => {
    setShowDatePicker(false);
  };

  const handleSave = async () => {
    if (!selectedType) {
      Alert.alert('Ошибка', 'Пожалуйста, выберите тип альбома');
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const projectId = `paper_${Date.now()}`;
      const dateISO = selectedDate.toISOString();

      // Сохраняем информацию о бумажном альбоме
      const paperAlbumData: PaperAlbumNotification = {
        id: projectId,
        type: selectedType,
        date: dateISO,
        projectId,
        createdAt: new Date().toISOString(),
      };

      // Сохраняем в AsyncStorage
      const existingPaperAlbums = await AsyncStorage.getItem('@paper_albums');
      const paperAlbums = existingPaperAlbums
        ? JSON.parse(existingPaperAlbums)
        : [];
      paperAlbums.push(paperAlbumData);
      await AsyncStorage.setItem('@paper_albums', JSON.stringify(paperAlbums));
      scheduleSyncToCloud();

      // Планируем уведомления для выбранного типа и перепланируем все сохранённые альбомы
      if (selectedType === 'pregnancy' || selectedType === 'kids') {
        await setupAlbumNotificationsForCelebration(selectedDate, selectedType, projectId);
      }

      // Отправляем push-уведомление об успешном подключении
      let notificationSent = false;
      try {
        // Проверяем, не находимся ли мы в Expo Go (там уведомления не работают)
        const isExpoGo = Constants.executionEnvironment === 'storeClient';
        console.log('Is Expo Go:', isExpoGo);
        
        if (!isExpoGo) {
          // Запрашиваем разрешения, если они еще не получены
          let permissions = await Notifications.getPermissionsAsync();
          console.log('Current permissions:', {
            granted: permissions.granted,
            iosStatus: permissions.ios?.status,
            androidImportance: permissions.android?.importance,
          });
          
          let hasPermission = permissions.granted || 
            (Platform.OS === 'ios' && permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL);
          
          if (!hasPermission) {
            console.log('Requesting permissions...');
            const requestResult = await Notifications.requestPermissionsAsync();
            console.log('Permission request result:', requestResult.status);
            hasPermission = requestResult.status === 'granted';
          }

          if (hasPermission) {
            console.log('Has permission, scheduling notification...');
            // Отправляем уведомление немедленно (через минимальную задержку)
            try {
              const trigger: TimeIntervalTriggerInput = {
                type: SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: 1,
              };
              console.log('Scheduled test notification in 1s (TIME_INTERVAL)');

              const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                  title: '✅ Уведомления подключены',
                  body: selectedType === 'pregnancy'
                    ? 'Уведомления для альбома беременности успешно настроены. Вы будете получать напоминания о развитии беременности.'
                    : 'Уведомления для детского альбома успешно настроены. Вы будете получать напоминания о развитии ребёнка.',
                  sound: true,
                  data: OPEN_NOTIFICATIONS_INBOX_DATA,
                },
                trigger,
              });
              
              if (notificationId) {
                notificationSent = true;
                console.log('✅ Success notification scheduled, ID:', notificationId);
              } else {
                console.warn('⚠️ Notification scheduled but returned null ID');
              }
            } catch (scheduleError) {
              console.error('❌ Error scheduling notification:', scheduleError);
            }
          } else {
            console.warn('⚠️ No permission for notifications. Granted:', permissions.granted, 'iOS status:', permissions.ios?.status);
          }
        } else {
          console.log('⚠️ Running in Expo Go, notifications disabled');
        }
      } catch (notificationError) {
        console.error('❌ Error in notification flow:', notificationError);
      }

      // Если уведомление не отправилось, показываем Alert как запасной вариант
      if (!notificationSent) {
        Alert.alert(
          'Успешно!',
          'Уведомления для бумажного альбома настроены. Вы будете получать напоминания так же, как пользователи цифровых альбомов.',
          [
            {
              text: 'Отлично',
              onPress: () => {
                router.back();
              },
            },
          ]
        );
      } else {
        // Переходим назад после успешного сохранения (даем время на отправку уведомления)
        setTimeout(() => {
          router.back();
        }, 800);
      }
    } catch (error) {
      console.error('Error saving paper album notifications:', error);
      Alert.alert(
        'Ошибка',
        'Не удалось настроить уведомления. Попробуйте еще раз.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const selectedTypeInfo = selectedType
    ? ALBUM_TYPES.find((t) => t.id === selectedType)
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Animated.View style={[styles.content, animatedStyle]}>
        {/* Заголовок */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#8B6F5F" />
          </TouchableOpacity>
          <Text style={styles.title}>Бумажный альбом</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: bottomInset + 32 },
          ]}
        >
          <Text style={styles.subtitle}>
            Выберите тип альбома и дату, чтобы получать уведомления
          </Text>

          {/* Выбор типа альбома */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Тип альбома</Text>
            {ALBUM_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeCard,
                  selectedType === type.id && styles.typeCardSelected,
                ]}
                onPress={() => handleTypeSelect(type.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.typeIconWrapper,
                    selectedType === type.id && styles.typeIconWrapperSelected,
                  ]}
                >
                  <Ionicons
                    name={type.icon as any}
                    size={28}
                    color={selectedType === type.id ? '#FFFFFF' : '#C9A89A'}
                  />
                </View>
                <View style={styles.typeContent}>
                  <Text
                    style={[
                      styles.typeName,
                      selectedType === type.id && styles.typeNameSelected,
                    ]}
                  >
                    {type.name}
                  </Text>
                  <Text style={styles.typeDescription}>{type.description}</Text>
                </View>
                {selectedType === type.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#C9A89A" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Выбранная дата */}
          {selectedType && selectedTypeInfo && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{selectedTypeInfo.dateLabel}</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={24} color="#C9A89A" />
                <View style={styles.dateButtonContent}>
                  <Text style={styles.dateButtonText}>
                    {selectedDate.toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#D4C4B5" />
              </TouchableOpacity>
            </View>
          )}

          {/* Кнопка сохранения */}
          {selectedType && (
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              <Text style={styles.saveButtonText}>
                {isSaving ? 'Сохранение...' : 'Сохранить и настроить уведомления'}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <View style={styles.datePickerOverlay}>
            <View style={[styles.datePickerContainer, { paddingBottom: bottomInset }]}>
              <View style={styles.datePickerHeader}>
                <Text style={styles.datePickerTitle}>
                  {selectedTypeInfo?.dateLabel}
                </Text>
                <TouchableOpacity
                  onPress={handleDateConfirm}
                  style={styles.datePickerCloseButton}
                >
                  <Ionicons name="close" size={24} color="#8B6F5F" />
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.select({
                  ios: 'spinner',
                  android: 'calendar',
                  default: 'default',
                })}
                locale="ru-RU"
                maximumDate={new Date(2030, 11, 31)}
                minimumDate={new Date(1900, 0, 1)}
                onChange={handleDateChange}
                style={styles.datePicker}
                themeVariant="light"
                textColor={Platform.OS === 'ios' ? '#8B6F5F' : undefined}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={styles.datePickerConfirmButton}
                  onPress={handleDateConfirm}
                  activeOpacity={0.8}
                >
                  <Text style={styles.datePickerConfirmButtonText}>Готово</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
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
    paddingTop: 16,
    paddingBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 32,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  subtitle: {
    fontSize: 17,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    marginBottom: 32,
    lineHeight: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
    marginBottom: 16,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#F0E8E0',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  typeCardSelected: {
    borderColor: '#C9A89A',
    backgroundColor: '#FAF8F5',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  typeIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#F0E8E0',
  },
  typeIconWrapperSelected: {
    backgroundColor: '#C9A89A',
    borderColor: '#C9A89A',
  },
  typeContent: {
    flex: 1,
  },
  typeName: {
    fontSize: 20,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
    marginBottom: 4,
  },
  typeNameSelected: {
    color: '#8B6F5F',
  },
  typeDescription: {
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
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: '#F0E8E0',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  dateButtonContent: {
    flex: 1,
    marginLeft: 12,
  },
  dateButtonText: {
    fontSize: 18,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#C9A89A',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  datePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  datePickerTitle: {
    fontSize: 20,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
  },
  datePickerCloseButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePicker: {
    width: '100%',
  },
  datePickerConfirmButton: {
    backgroundColor: '#C9A89A',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 20,
  },
  datePickerConfirmButtonText: {
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
