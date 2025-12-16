import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Switch,
  Alert,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { projectCategories } from '@/constants/projectTemplates';

interface Reminder {
  id: string;
  categoryId: string;
  categoryName: string;
  title: string;
  description: string;
  date: string;
  enabled: boolean;
  notificationId?: string;
}

// Настройка уведомлений
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function RemindersListScreen() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const opacity = useSharedValue(0);

  useEffect(() => {
    loadReminders();
    requestPermissions();
    opacity.value = withTiming(1, { duration: 400 });
  }, []);

  const requestPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Разрешения',
        'Для работы напоминаний необходимо разрешение на уведомления',
        [{ text: 'OK' }]
      );
    }
  };

  const scheduleNotification = async (
    reminderId: string,
    title: string,
    body: string,
    date: Date
  ): Promise<string | null> => {
    try {
      // Проверяем, что дата в будущем
      const now = new Date();
      if (date <= now) {
        console.warn('Cannot schedule notification in the past');
        return null;
      }

      let trigger: any;
      
      if (Platform.OS === 'ios') {
        // Для iOS используем объект с полем date
        trigger = {
          date: date,
        };
      } else {
        // Для Android вычисляем разницу в секундах
        const seconds = Math.floor((date.getTime() - now.getTime()) / 1000);
        if (seconds <= 0) {
          console.warn('Invalid notification time');
          return null;
        }
        trigger = seconds;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: body,
          sound: true,
        },
        trigger: trigger,
      });
      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  };

  const loadReminders = async () => {
    try {
      const saved = await AsyncStorage.getItem('@reminders');
      if (saved) {
        const parsedReminders: Reminder[] = JSON.parse(saved);
        
        // Фильтруем только валидные напоминания (с категорией и датой)
        const validReminders = parsedReminders.filter(
          (reminder) => reminder.categoryId && reminder.date
        );
        
        if (validReminders.length === 0) {
          // Если нет валидных напоминаний, начинаем с пустого списка
          setReminders([]);
          await AsyncStorage.removeItem('@reminders');
          return;
        }
        
        // Перепланируем активные напоминания с датой в будущем
        const updatedReminders = await Promise.all(
          validReminders.map(async (reminder) => {
            if (reminder.enabled) {
              const reminderDate = new Date(reminder.date);
              const now = new Date();
              
              // Если дата в будущем и нет notificationId, планируем уведомление
              if (reminderDate > now && !reminder.notificationId) {
                const notificationId = await scheduleNotification(
                  reminder.id,
                  reminder.title,
                  reminder.description,
                  reminderDate
                );
                if (notificationId) {
                  return { ...reminder, notificationId };
                }
              }
              
              // Если дата прошла, отключаем напоминание
              if (reminderDate <= now) {
                return { ...reminder, enabled: false };
              }
            }
            
            return reminder;
          })
        );
        
        setReminders(updatedReminders);
        await AsyncStorage.setItem('@reminders', JSON.stringify(updatedReminders));
      } else {
        // Если нет сохраненных напоминаний, начинаем с пустого списка
        setReminders([]);
      }
    } catch (error) {
      console.error('Error loading reminders:', error);
      setReminders([]);
      // Очищаем поврежденные данные
      try {
        await AsyncStorage.removeItem('@reminders');
      } catch (e) {
        // Игнорируем ошибки очистки
      }
    }
  };

  const cancelNotification = async (notificationId: string) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  };

  const handleAddReminder = async () => {
    if (!selectedCategory) {
      Alert.alert('Ошибка', 'Выберите тему для напоминания');
      return;
    }

    if (selectedDate < new Date()) {
      Alert.alert('Ошибка', 'Дата напоминания должна быть в будущем');
      return;
    }

    const category = projectCategories.find(cat => cat.id === selectedCategory);
    if (!category) return;

    const reminderId = Date.now().toString();
    const title = customTitle.trim() || category.name;
    const description =
      customDescription.trim() ||
      `Напоминание о важных моментах в категории "${category.name}"`;

    // Планируем уведомление
    const notificationId = await scheduleNotification(
      reminderId,
      title,
      description,
      selectedDate
    );

    const newReminder: Reminder = {
      id: reminderId,
      categoryId: selectedCategory,
      categoryName: category.name,
      title,
      description,
      date: selectedDate.toISOString(),
      enabled: true,
      notificationId: notificationId || undefined,
    };

    const updated = [...reminders, newReminder];
    setReminders(updated);

    try {
      await AsyncStorage.setItem('@reminders', JSON.stringify(updated));
      setShowAddModal(false);
      setSelectedCategory(null);
      setCustomTitle('');
      setCustomDescription('');
      setSelectedDate(new Date());
      Alert.alert('Успешно', 'Напоминание добавлено');
    } catch (error) {
      console.error('Error saving reminder:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить напоминание');
    }
  };

  const handleToggleReminder = async (id: string) => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;

    const updated = reminders.map(r => {
      if (r.id === id) {
        const newEnabled = !r.enabled;
        
        // Если включаем напоминание, планируем уведомление
        if (newEnabled && !r.notificationId) {
          scheduleNotification(r.id, r.title, r.description, new Date(r.date)).then(
            notificationId => {
              if (notificationId) {
                const updatedReminder = { ...r, enabled: newEnabled, notificationId };
                const updatedReminders = reminders.map(rem =>
                  rem.id === id ? updatedReminder : rem
                );
                setReminders(updatedReminders);
                AsyncStorage.setItem('@reminders', JSON.stringify(updatedReminders));
              }
            }
          );
        }
        
        // Если выключаем, отменяем уведомление
        if (!newEnabled && r.notificationId) {
          cancelNotification(r.notificationId);
        }

        return { ...r, enabled: newEnabled };
      }
      return r;
    });

    setReminders(updated);

    try {
      await AsyncStorage.setItem('@reminders', JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving reminders:', error);
    }
  };

  const handleDeleteReminder = async (id: string) => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;

    Alert.alert(
      'Удалить напоминание',
      `Вы уверены, что хотите удалить напоминание "${reminder.title}"?`,
      [
        {
          text: 'Отмена',
          style: 'cancel',
        },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            // Отменяем уведомление
            if (reminder.notificationId) {
              await cancelNotification(reminder.notificationId);
            }

            const updated = reminders.filter(r => r.id !== id);
            setReminders(updated);

            try {
              await AsyncStorage.setItem('@reminders', JSON.stringify(updated));
            } catch (error) {
              console.error('Error saving reminders:', error);
            }
          },
        },
      ]
    );
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Animated.View style={[styles.content, animatedStyle]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#8B6F5F" />
          </TouchableOpacity>
          <Text style={styles.title}>Напоминания</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Кнопка добавления */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.85}
          >
            <View style={styles.addButtonIconWrapper}>
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.addButtonText}>Добавить напоминание</Text>
          </TouchableOpacity>

          {/* Кнопка каталога бумажных версий */}
          <TouchableOpacity
            style={styles.catalogButton}
            onPress={() => router.push('/paper-catalog')}
            activeOpacity={0.85}
          >
            <View style={styles.catalogButtonIconWrapper}>
              <Ionicons name="book-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.catalogButtonContent}>
              <Text style={styles.catalogButtonTitle}>Купить бумажную версию</Text>
              <Text style={styles.catalogButtonText}>Каталог</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C9A89A" />
          </TouchableOpacity>

          {reminders.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={64} color="#D4C4B5" />
              <Text style={styles.emptyStateTitle}>Нет напоминаний</Text>
              <Text style={styles.emptyStateText}>
                Создайте напоминание, выбрав тему из приложения и указав дату
              </Text>
            </View>
          ) : (
            reminders.map((reminder) => {
              const category = projectCategories.find(cat => cat.id === reminder.categoryId);
              return (
                <View key={reminder.id} style={styles.reminderCard}>
                  <View style={styles.reminderContent}>
                    <View style={styles.reminderHeader}>
                      <View style={styles.reminderIconWrapper}>
                        <Ionicons
                          name={category?.icon as any || 'notifications-outline'}
                          size={24}
                          color={reminder.enabled ? '#C9A89A' : '#D4C4B5'}
                        />
                      </View>
                      <View style={styles.reminderInfo}>
                        <View style={styles.reminderCategoryBadge}>
                          <Text style={styles.reminderCategoryText}>
                            {reminder.categoryName}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.reminderTitle,
                            !reminder.enabled && styles.reminderTitleDisabled,
                          ]}
                        >
                          {reminder.title}
                        </Text>
                        <Text style={styles.reminderDescription}>
                          {reminder.description}
                        </Text>
                        <Text style={styles.reminderDate}>
                          {new Date(reminder.date).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.reminderActions}>
                    <Switch
                      value={reminder.enabled}
                      onValueChange={() => handleToggleReminder(reminder.id)}
                      trackColor={{ false: '#F0E8E0', true: '#E8DAD0' }}
                      thumbColor={reminder.enabled ? '#C9A89A' : '#D4C4B5'}
                    />
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteReminder(reminder.id)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#E74C3C" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </Animated.View>

      {/* Модальное окно добавления напоминания */}
      {showAddModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Новое напоминание</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  setSelectedCategory(null);
                  setCustomTitle('');
                  setCustomDescription('');
                }}
              >
                <Ionicons name="close" size={24} color="#8B6F5F" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Выбор категории */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Тема</Text>
                <View style={styles.categoriesGrid}>
                  {projectCategories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryOption,
                        selectedCategory === category.id && styles.categoryOptionSelected,
                      ]}
                      onPress={() => setSelectedCategory(category.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={category.icon as any}
                        size={24}
                        color={
                          selectedCategory === category.id ? '#FFFFFF' : '#C9A89A'
                        }
                      />
                      <Text
                        style={[
                          styles.categoryOptionText,
                          selectedCategory === category.id &&
                            styles.categoryOptionTextSelected,
                        ]}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Заголовок (опционально) */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Заголовок (необязательно)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Оставьте пустым для использования названия темы"
                    placeholderTextColor="#B8A898"
                    value={customTitle}
                    onChangeText={setCustomTitle}
                  />
                </View>
              </View>

              {/* Описание (опционально) */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Текст напоминания (необязательно)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Оставьте пустым для использования текста по умолчанию"
                    placeholderTextColor="#B8A898"
                    value={customDescription}
                    onChangeText={setCustomDescription}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>

              {/* Выбор даты и времени */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Дата и время</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar-outline" size={20} color="#C9A89A" />
                  <Text style={styles.dateButtonText}>
                    {selectedDate.toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#D4C4B5" />
                </TouchableOpacity>
              </View>

              {/* Кнопки */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelModalButton}
                  onPress={() => {
                    setShowAddModal(false);
                    setSelectedCategory(null);
                    setCustomTitle('');
                    setCustomDescription('');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelModalButtonText}>Отмена</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.saveModalButton,
                    !selectedCategory && styles.saveModalButtonDisabled,
                  ]}
                  onPress={handleAddReminder}
                  disabled={!selectedCategory}
                  activeOpacity={0.85}
                >
                  <Text style={styles.saveModalButtonText}>Добавить</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Датапикер */}
            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="datetime"
                display={Platform.select({
                  ios: 'spinner',
                  android: 'default',
                  default: 'default',
                })}
                minimumDate={new Date()}
                onChange={(event, date) => {
                  if (Platform.OS === 'android') {
                    setShowDatePicker(false);
                  }
                  if (date && event.type !== 'dismissed') {
                    setSelectedDate(date);
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
        </View>
      )}
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
    marginRight: 12,
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
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C9A89A',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    gap: 12,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  addButtonIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  catalogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginTop: 12,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#F0E8E0',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  catalogButtonIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#C9A89A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  catalogButtonContent: {
    flex: 1,
    gap: 4,
  },
  catalogButtonTitle: {
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
  catalogButtonText: {
    fontSize: 14,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '400',
  },
  reminderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F0E8E0',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  reminderContent: {
    flex: 1,
    marginBottom: 12,
  },
  reminderHeader: {
    flexDirection: 'row',
    gap: 16,
  },
  reminderIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0E8E0',
  },
  reminderInfo: {
    flex: 1,
    gap: 6,
  },
  reminderCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E8DAD0',
    marginBottom: 4,
  },
  reminderCategoryText: {
    fontSize: 12,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '500',
  },
  reminderTitle: {
    fontSize: 18,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
  },
  reminderTitleDisabled: {
    opacity: 0.5,
  },
  reminderDescription: {
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
  reminderDate: {
    fontSize: 13,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '400',
    marginTop: 4,
  },
  reminderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0E8E0',
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    textAlign: 'center',
    lineHeight: 24,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    maxHeight: '90%',
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
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 16,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
    marginBottom: 12,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#F0E8E0',
    minWidth: '45%',
  },
  categoryOptionSelected: {
    backgroundColor: '#C9A89A',
    borderColor: '#C9A89A',
  },
  categoryOptionText: {
    fontSize: 14,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '500',
    flex: 1,
  },
  categoryOptionTextSelected: {
    color: '#FFFFFF',
  },
  inputWrapper: {
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0E8E0',
  },
  input: {
    fontSize: 16,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    padding: 14,
    minHeight: 48,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0E8E0',
    gap: 12,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '400',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelModalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0E8E0',
    alignItems: 'center',
  },
  cancelModalButtonText: {
    fontSize: 16,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
  },
  saveModalButton: {
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
  saveModalButtonDisabled: {
    backgroundColor: '#D4C4B5',
    opacity: 0.6,
  },
  saveModalButtonText: {
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
