import { ResponsiveScreenShell } from '@/components/responsive-screen-shell';
import { colors, createShadow, radii, sansFont } from '@/constants/design-tokens';
import { scheduleSyncToCloud } from '@/utils/account-sync';
import { setupAlbumNotificationsForCelebration } from '@/utils/albumNotificationCoordinator';
import { ensureNotificationPermission } from '@/utils/localNotificationSchedule';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppDateField } from '@/components/ui/app-date-field';
import { AppDatePickerSheet } from '@/components/ui/app-date-picker-sheet';
import * as Haptics from 'expo-haptics';
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
import { ONBOARDING_CONTENT_MAX_WIDTH } from '@/utils/responsive';

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
    const date = new Date();
    if (type === 'pregnancy') date.setDate(date.getDate() + 280);
    setSelectedDate(date);
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

    if (isSaving) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!Number.isFinite(selectedDate.getTime()) || (selectedType === 'kids' && selectedDate > new Date()) || (selectedType === 'pregnancy' && selectedDate < today)) {
      Alert.alert('Проверьте дату', selectedType === 'kids' ? 'Дата рождения не может быть в будущем.' : 'Укажите сегодняшнюю или будущую предварительную дату родов.');
      return;
    }
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const raw = await AsyncStorage.getItem('@paper_albums');
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      const paperAlbums: PaperAlbumNotification[] = Array.isArray(parsed) ? parsed : [];
      const existing = paperAlbums.find(album => album.type === selectedType &&
        new Date(album.date).toDateString() === selectedDate.toDateString());
      const projectId = existing?.projectId ?? `paper_${Date.now()}`;
      if (!existing) {
        paperAlbums.push({ id: projectId, type: selectedType, date: selectedDate.toISOString(), projectId, createdAt: new Date().toISOString() });
        await AsyncStorage.setItem('@paper_albums', JSON.stringify(paperAlbums));
      }
      await setupAlbumNotificationsForCelebration(selectedDate, selectedType, projectId);
      scheduleSyncToCloud();
      const allowed = await ensureNotificationPermission();
      Alert.alert(
        allowed ? 'Уведомления подключены' : 'Альбом сохранён',
        allowed
          ? 'Напоминания будут приходить на телефон. Вы можете заполнять бумажный альбом и управлять уведомлениями в разделе «Мои напоминания».'
          : 'Чтобы получать напоминания, разрешите уведомления для 018BY в настройках телефона. Дата альбома сохранена.',
        [{ text: 'Понятно', onPress: () => router.back() }]
      );
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
        <ResponsiveScreenShell maxContentWidth={ONBOARDING_CONTENT_MAX_WIDTH}>
        {/* Заголовок */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
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
                    color={selectedType === type.id ? '#FFFFFF' : colors.primary}
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
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
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
                <Ionicons name="calendar-outline" size={24} color={colors.primary} />
                <View style={styles.dateButtonContent}>
                  <Text style={styles.dateButtonText}>
                    {selectedDate.toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.tabInactive} />
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

        <AppDatePickerSheet
          visible={showDatePicker}
          value={selectedDate}
          onChange={setSelectedDate}
          onClose={handleDateConfirm}
          title={selectedTypeInfo?.dateLabel ?? 'Выберите дату'}
          minimumDate={selectedType === 'pregnancy' ? new Date(new Date().setHours(0, 0, 0, 0)) : new Date(1900, 0, 1)}
          maximumDate={selectedType === 'kids' ? new Date() : undefined}
          maximumDate={new Date(2030, 11, 31)}
        />
        </ResponsiveScreenShell>
      </Animated.View>
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 32,
    color: colors.textPrimary,
    fontFamily: sansFont('bold'),
    fontWeight: '700',
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
    color: colors.textSecondary,
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
    color: colors.textPrimary,
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
    borderColor: colors.border,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  typeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.background,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  typeIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: colors.border,
  },
  typeIconWrapperSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeContent: {
    flex: 1,
  },
  typeName: {
    fontSize: 20,
    color: colors.textPrimary,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
    marginBottom: 4,
  },
  typeNameSelected: {
    color: colors.textPrimary,
  },
  typeDescription: {
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
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: colors.textPrimary,
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
    color: colors.textPrimary,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: colors.textPrimary,
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
    shadowColor: colors.textPrimary,
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
    color: colors.textPrimary,
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
    backgroundColor: colors.primary,
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
