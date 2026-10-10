import { ResponsiveScreenShell } from '@/components/responsive-screen-shell';
import { colors, createShadow, radii, sansFont } from '@/constants/design-tokens';
import { projectCategories } from '@/constants/projectTemplates';
import { getAccountSyncId } from '@/utils/account-identity';
import {
  getSupabaseNotConfiguredAlertMessageOnce,
  isSupabaseNotConfiguredError,
  pushCoreOnlyToCloud,
  scheduleSyncToCloud,
  setLocalRemindersJsonForSyncId,
} from '@/utils/account-sync';
import { refreshAllAlbumNotifications } from '@/utils/albumNotificationCoordinator';
import { isAlbumNotificationReminder, readNotificationReminders, type NotificationReminder } from '@/utils/albumNotificationPreferences';
import { cancelUserReminder, ensureNotificationPermission, nextReminderDate, scheduleUserReminder } from '@/utils/localNotificationSchedule';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppDateField } from '@/components/ui/app-date-field';
import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ONBOARDING_CONTENT_MAX_WIDTH } from '@/utils/responsive';
import { syncWidgetSnapshot } from '@/utils/widgetSnapshot';

// Проверяем, находимся ли мы в Expo Go (где уведомления не работают)
const isExpoGo = Constants.executionEnvironment === 'storeClient';

interface Reminder extends NotificationReminder {
  id: string;
  categoryId: string;
  categoryName: string;
  title: string;
  description: string;
  date: string;
  enabled: boolean;
  notificationId?: string;
}

type StoredReminder = NotificationReminder;

function toStoredReminder(r: Reminder): StoredReminder { return { ...r }; }

function fromStoredReminder(r: StoredReminder): Reminder {
  return {
    ...r,
    id: String(r.id), title: r.title, date: r.date,
    enabled: r.enabled ?? true,
    categoryId: r.categoryId ?? 'family',
    categoryName: r.categoryName ?? 'Напоминание',
    description: r.description ?? '',
  };
}

export default function RemindersListScreen() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 32 : 20);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const mutationInProgress = useRef(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const opacity = useSharedValue(0);
  const modalOverlayOpacity = useSharedValue(0);
  const modalSlideY = useSharedValue(400);
  const titleInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);
  const addModalScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    requestPermissions();
    opacity.value = withTiming(1, { duration: 400 });
  }, []);

  // Анимация появления модалки «Новое напоминание»
  useEffect(() => {
    if (showAddModal) {
      modalSlideY.value = 400;
      modalOverlayOpacity.value = 0;
      modalOverlayOpacity.value = withTiming(1, { duration: 280 });
      modalSlideY.value = withTiming(0, { duration: 280 });
    }
  }, [showAddModal]);

  const closeAddModal = useCallback(() => {
    Keyboard.dismiss();
    modalOverlayOpacity.value = withTiming(0, { duration: 220 });
    modalSlideY.value = withTiming(400, { duration: 220 }, (finished) => {
      if (finished) {
        runOnJS(setShowAddModal)(false);
        runOnJS(setSelectedCategory)(null);
        runOnJS(setCustomTitle)('');
        runOnJS(setCustomDescription)('');
      }
    });
  }, []);

  const modalOverlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: modalOverlayOpacity.value,
  }));

  const modalContentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: modalSlideY.value }],
  }));

  useFocusEffect(
    useCallback(() => {
      loadReminders();
    }, [])
  );

  const requestPermissions = async () => {
    if (!isExpoGo && !(await ensureNotificationPermission(true))) {
      Alert.alert('Уведомления выключены', 'Разрешите уведомления для 018BY в настройках телефона, чтобы получать напоминания.');
    }
  };

  const loadReminders = async () => {
    try {
      await refreshAllAlbumNotifications({ skipCloudSync: true });
      const stored = await readNotificationReminders();
      const updated = stored.map((row) => {
        // Настройка расписания и ежегодное событие не являются просроченным разовым push.
        if (!isAlbumNotificationReminder(row) && !row.repeats && row.enabled !== false && !nextReminderDate(row)) {
          return { ...row, enabled: false, notificationId: undefined };
        }
        return row;
      });
      setReminders(updated.filter((row) => row.deleted !== true).map(fromStoredReminder));
      if (updated.some((row, index) => row !== stored[index])) await saveRemindersAndPush(updated.map(fromStoredReminder));
    } catch (error) {
      // Ошибка сети/планировщика не должна стирать сохранённый список.
      console.warn('Error loading reminders:', error);
      const stored = await readNotificationReminders();
      setReminders(stored.filter((row) => row.deleted !== true).map(fromStoredReminder));
    }
  };

  const saveRemindersAndPush = async (list: Reminder[]) => {
    const syncId = await getAccountSyncId();
    const storedList = list.map(toStoredReminder);
    const json = JSON.stringify(storedList);
    // Нельзя mergeReminders(existing, list): объединение по id не удаляет записи — «удалить» не работает.
    if (syncId) {
      await setLocalRemindersJsonForSyncId(syncId, json);
    } else {
      await AsyncStorage.setItem('@reminders', json);
    }
    // Сначала меняем локальную очередь: выключение не должно ждать ответа облака.
    await refreshAllAlbumNotifications({ skipCloudSync: true, force: true });
    void syncWidgetSnapshot();
    return pushCoreOnlyToCloud({ remindersAuthoritativeLocal: true });
  };

  const getRemindersFromStorage = async (): Promise<Reminder[]> =>
    (await readNotificationReminders()).map(fromStoredReminder);

  const handleAddReminder = async () => {
    if (!selectedCategory) {
      Alert.alert('Ошибка', 'Выберите тему для напоминания');
      return;
    }

    if (!Number.isFinite(selectedDate.getTime()) || selectedDate <= new Date()) {
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

    if (mutationInProgress.current) return;
    mutationInProgress.current = true;
    let notificationId: string | null = null;
    const newReminder: Reminder = {
      id: reminderId, categoryId: selectedCategory, categoryName: category.name,
      title, description, date: selectedDate.toISOString(), enabled: false,
    };
    try {
      if (await ensureNotificationPermission(true)) {
        notificationId = await scheduleUserReminder(newReminder);
      }
    } catch (error) { console.warn('Error scheduling reminder:', error); }
    newReminder.enabled = notificationId !== null;
    newReminder.notificationId = notificationId ?? undefined;

    try {
      const currentList = await getRemindersFromStorage();
      const updated = [...currentList, newReminder];
      setReminders(updated.filter(row => row.deleted !== true));
      const pushResult = await saveRemindersAndPush(updated);
      if (!pushResult.ok) {
        if (isSupabaseNotConfiguredError(pushResult.error)) {
          const msg = getSupabaseNotConfiguredAlertMessageOnce();
          if (msg) Alert.alert('Сохранено на устройстве', msg);
        } else {
          Alert.alert('Сохранено на устройстве', `В облако не удалось отправить: ${pushResult.error ?? 'неизвестная ошибка'}. Проверьте соединение с интернетом.`);
        }
      }
      setShowAddModal(false);
      setSelectedCategory(null);
      setCustomTitle('');
      setCustomDescription('');
      setSelectedDate(new Date());
      Alert.alert(notificationId ? 'Успешно' : 'Сохранено без уведомления', notificationId ? 'Напоминание добавлено' : 'Разрешите уведомления в настройках телефона, затем включите напоминание переключателем.');
    } catch (error) {
      console.error('Error saving reminder:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить напоминание');
      await cancelUserReminder(newReminder);
    } finally { mutationInProgress.current = false; }
  };

  const handleToggleReminder = async (id: string) => {
    if (mutationInProgress.current) return;
    mutationInProgress.current = true;
    try {
      const currentList = await getRemindersFromStorage();
      const reminder = currentList.find(row => row.id === id);
      if (!reminder) return;
      const enabled = !reminder.enabled;
      if (enabled && !(await ensureNotificationPermission(true))) {
        Alert.alert('Уведомления выключены', 'Разрешите уведомления для 018BY в настройках телефона.');
        return;
      }
      let notificationId: string | undefined;
      if (!isAlbumNotificationReminder(reminder)) {
        if (enabled) {
          if (!nextReminderDate(reminder)) {
            Alert.alert('Дата уже прошла', 'Создайте напоминание с будущей датой.');
            return;
          }
          notificationId = await scheduleUserReminder(reminder) ?? undefined;
          if (!notificationId) throw new Error('Не удалось запланировать уведомление');
        } else await cancelUserReminder(reminder);
      }
      const updated = currentList.map(row => row.id === id ? { ...row, enabled, notificationId } : row);
      setReminders(updated.filter(row => row.deleted !== true));
      await saveRemindersAndPush(updated);
    } catch (error) {
      console.warn('Error toggling reminder:', error);
      Alert.alert('Ошибка', 'Не удалось изменить напоминание. Попробуйте ещё раз.');
    } finally { mutationInProgress.current = false; }
  };

  const handleDeleteReminder = async (id: string) => {
    const currentList = await getRemindersFromStorage();
    const reminder = currentList.find(r => r.id === id);
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
            if (mutationInProgress.current) return;
            mutationInProgress.current = true;
            try {
            const latest = await getRemindersFromStorage();
            await cancelUserReminder(reminder);
            // Служебная запись остаётся выключенной, чтобы миграция не подключила её заново.
            const updated = isAlbumNotificationReminder(reminder)
              ? latest.map(row => row.id === id ? { ...row, enabled: false, deleted: true, notificationId: undefined } : row)
              : latest.filter(row => row.id !== id);
            setReminders(updated.filter(row => row.deleted !== true));

              const pushResult = await saveRemindersAndPush(updated);
              if (pushResult.ok) {
                scheduleSyncToCloud();
              } else if (isSupabaseNotConfiguredError(pushResult.error)) {
                const msg = getSupabaseNotConfiguredAlertMessageOnce();
                if (msg) Alert.alert('Удалено на устройстве', msg);
              } else {
                Alert.alert(
                  'Удалено локально',
                  pushResult.error
                    ? `В облако не удалось отправить: ${pushResult.error}. Проверьте интернет.`
                    : 'Проверьте интернет и повторите синхронизацию.'
                );
              }
            } catch (error) {
              console.error('Error saving reminders:', error);
              Alert.alert('Ошибка', 'Не удалось сохранить список после удаления.');
            } finally { mutationInProgress.current = false; }
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
        <ResponsiveScreenShell maxContentWidth={ONBOARDING_CONTENT_MAX_WIDTH}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Напоминания</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: bottomInset + 32 },
          ]}
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
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </TouchableOpacity>

          {reminders.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={64} color={colors.tabInactive} />
              <Text style={styles.emptyStateTitle}>Нет напоминаний</Text>
              <Text style={styles.emptyStateText}>
                Создайте напоминание, выбрав тему из приложения и указав дату
              </Text>
            </View>
          ) : (
            reminders.map((reminder, index) => {
              const category = projectCategories.find(cat => cat.id === reminder.categoryId);
              return (
                <View key={`reminder-${reminder.id}-${index}`} style={styles.reminderCard}>
                  <View style={styles.reminderContent}>
                    <View style={styles.reminderHeader}>
                      <View style={styles.reminderIconWrapper}>
                        <Ionicons
                          name={category?.icon as any || 'notifications-outline'}
                          size={24}
                          color={reminder.enabled ? colors.primary : colors.tabInactive}
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
                          {reminder.date
                            ? new Date(reminder.date).toLocaleDateString('ru-RU', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.reminderActions}>
                    <Switch
                      value={reminder.enabled}
                      onValueChange={() => handleToggleReminder(reminder.id)}
                      trackColor={{ false: colors.border, true: '#E8DAD0' }}
                      thumbColor={reminder.enabled ? colors.primary : colors.tabInactive}
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
        </ResponsiveScreenShell>
      </Animated.View>

      {/* Модальное окно добавления напоминания */}
      {showAddModal && (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <Animated.View style={[styles.modalOverlay, modalOverlayAnimatedStyle]}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalKeyboardAvoid}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 20}
            >
              <Animated.View
                style={[
                  styles.modalContent,
                  { paddingBottom: bottomInset + 20 },
                  modalContentAnimatedStyle,
                ]}
              >
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Новое напоминание</Text>
                    <TouchableOpacity onPress={closeAddModal} activeOpacity={0.7}>
                      <Ionicons name="close" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    ref={addModalScrollRef}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.modalScrollContent}
                  >
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
                          selectedCategory === category.id ? '#FFFFFF' : colors.primary
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
                    ref={titleInputRef}
                    style={styles.input}
                    placeholder="Оставьте пустым для использования названия темы"
                    placeholderTextColor="#B8A898"
                    value={customTitle}
                    onChangeText={setCustomTitle}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => descriptionInputRef.current?.focus()}
                  />
                </View>
              </View>

              {/* Описание (опционально) */}
              <View style={styles.modalSection} collapsable={false}>
                <Text style={styles.modalSectionTitle}>Текст напоминания (необязательно)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={descriptionInputRef}
                    style={[styles.input, styles.textArea]}
                    placeholder="Оставьте пустым для использования текста по умолчанию"
                    placeholderTextColor="#B8A898"
                    value={customDescription}
                    onChangeText={setCustomDescription}
                    multiline
                    numberOfLines={3}
                    returnKeyType="done"
                    blurOnSubmit={true}
                    onSubmitEditing={() => Keyboard.dismiss()}
                    onFocus={() => {
                      setTimeout(() => {
                        addModalScrollRef.current?.scrollTo({
                          y: 320,
                          animated: true,
                        });
                      }, 100);
                    }}
                  />
                </View>
              </View>

              {/* Выбор даты и времени */}
              <View style={styles.modalSection}>
                <AppDateField
                  label="Дата и время"
                  value={selectedDate}
                  onChange={setSelectedDate}
                  mode="datetime"
                  minimumDate={new Date()}
                />
              </View>

              {/* Кнопки */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelModalButton}
                  onPress={closeAddModal}
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
              </Animated.View>
            </KeyboardAvoidingView>
          </Animated.View>
        </TouchableWithoutFeedback>
      )}
    </SafeAreaView>
  );
}

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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  backButton: {
    marginRight: 12,
  },
  title: {
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
    paddingHorizontal: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    gap: 12,
    shadowColor: colors.textPrimary,
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
    borderColor: colors.border,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  catalogButtonIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
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
    color: colors.textPrimary,
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
    color: colors.textSecondary,
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
    borderColor: colors.border,
    shadowColor: colors.textPrimary,
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
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  reminderInfo: {
    flex: 1,
    gap: 6,
  },
  reminderCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E8DAD0',
    marginBottom: 4,
  },
  reminderCategoryText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '500',
  },
  reminderTitle: {
    fontSize: 18,
    color: colors.textPrimary,
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
    color: colors.textSecondary,
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
    color: colors.textSecondary,
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
    borderTopColor: colors.border,
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
    color: colors.textPrimary,
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
    color: colors.textSecondary,
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
    backgroundColor: 'rgba(91, 78, 63, 0.45)',
    justifyContent: 'flex-end',
  },
  modalKeyboardAvoid: {
    width: '100%',
  },
  modalScrollContent: {
    paddingBottom: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
    paddingHorizontal: 24,
    maxHeight: '90%',
    shadowColor: '#5B4E3F',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    color: colors.textPrimary,
    fontFamily: sansFont('bold'),
    fontWeight: '700',
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 16,
    color: colors.textPrimary,
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
    borderColor: colors.border,
    minWidth: '45%',
  },
  categoryOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryOptionText: {
    fontSize: 14,
    color: colors.textPrimary,
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
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    fontSize: 16,
    color: colors.textPrimary,
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
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
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
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelModalButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
  },
  saveModalButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  saveModalButtonDisabled: {
    backgroundColor: colors.tabInactive,
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
    borderTopColor: colors.border,
    marginTop: 12,
  },
  iosDatePickerButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  iosDatePickerButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
  },
});
