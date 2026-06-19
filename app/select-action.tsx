import { ResponsiveScreenShell } from '@/components/responsive-screen-shell';
import { colors, createShadow, radii, sansFont } from '@/constants/design-tokens';
import { getAlbumTemplateById } from '@/albums';
import { getWildberriesLink } from '@/utils/albumGiftMapping';
import { getCoverPickerImage } from '@/utils/coverPickerImage';
import { getCoverSelectTitle } from '@/utils/coverSelectTitle';
import { getDiaryCoverById } from '@/utils/diaryAlbumsLoader';
import { FAMILY_COVER_DESIGNS } from '@/utils/familyCoverDesigns';
import { HOLIDAY_COVER_DESIGNS } from '@/utils/holidayCoverDesigns';
import { PREGNANCY_COVER_DESIGNS } from '@/utils/pregnancyCoverDesigns';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import React from 'react';
import {
  Linking,
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
import { PICKER_CONTENT_MAX_WIDTH } from '@/utils/responsive';

export default function SelectActionScreen() {
  const { celebration, coverType, eventDate } = useLocalSearchParams<{
    celebration: string;
    coverType: string;
    eventDate?: string;
  }>();
  const containerOpacity = useSharedValue(0);

  React.useEffect(() => {
    containerOpacity.value = withTiming(1, { duration: 400 });
  }, []);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const albumTemplate = coverType ? getAlbumTemplateById(coverType) : null;
  const diaryCover = coverType && celebration === 'diary' ? getDiaryCoverById(coverType) : null;
  const holidayCover = coverType && celebration === 'holidays'
    ? HOLIDAY_COVER_DESIGNS.find(d => d.id === coverType) ?? null
    : null;
  const familyCover = coverType && celebration === 'family'
    ? FAMILY_COVER_DESIGNS.find(d => d.id === coverType) ?? null
    : null;
  const isPregnancy = celebration === 'pregnancy';
  const isDiary = celebration === 'diary';
  const isHoliday = celebration === 'holidays';
  const isFamily = celebration === 'family';
  const isKids = celebration === 'kids';
  const pregnancyDesign =
    coverType && isPregnancy ? PREGNANCY_COVER_DESIGNS.find((d) => d.id === coverType) ?? null : null;
  const holidayDesign =
    coverType && isHoliday ? HOLIDAY_COVER_DESIGNS.find((d) => d.id === coverType) ?? null : null;
  const familyDesign =
    coverType && isFamily ? FAMILY_COVER_DESIGNS.find((d) => d.id === coverType) ?? null : null;
  const coverImage = coverType ? getCoverPickerImage(coverType, celebration) : null;
  const coverName =
    coverType && celebration
      ? getCoverSelectTitle(coverType, celebration)
      : isFamily && familyCover
        ? familyCover.title
        : isHoliday && holidayCover
          ? holidayCover.title
          : isDiary && diaryCover
            ? diaryCover.name
            : albumTemplate?.name ?? '';
  const coverDescription =
    isFamily && familyCover
      ? 'Семейный альбом'
      : isHoliday && holidayCover
        ? 'Праздничный альбом'
        : isDiary && diaryCover
          ? 'Личный дневник для записи мыслей и воспоминаний'
          : albumTemplate?.description ?? 'Дизайн обложки';
  const hasSelection = Boolean(
    coverImage ||
      albumTemplate ||
      diaryCover ||
      holidayCover ||
      familyCover ||
      pregnancyDesign ||
      holidayDesign ||
      familyDesign
  );

  const handleEdit = () => {
    if (!coverType || !celebration) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Для беременности и дневников показываем выбор внутренней части
    if (isPregnancy || isDiary) {
      const params: any = {
        celebration,
        coverType,
      };
      // Передаем дату события, если она есть
      if (eventDate) {
        params.eventDate = eventDate;
      }
      router.push({
        pathname: '/select-interior',
        params,
      });
    } else {
      // Для остальных категорий (включая kids) сразу в редактирование
      // Для kids внутренняя часть одна для всех обложек, поэтому выбор не нужен
      // Автоматически устанавливаем interiorType для kids
      const params: any = {
        celebration,
        coverType,
      };
      
      // Для kids устанавливаем единую внутреннюю часть
      if (celebration === 'kids') {
        params.interiorType = 'kids_48';
      }
      
      // Для праздников — привязка внутрянки к обложке
      if (celebration === 'holidays') {
        if (coverType === 'holiday_dfa34' || coverType === 'holiday_dfa35') {
          params.interiorType = 'holidays_birthday_60';
        } else {
          params.interiorType = 'holidays_blank';
        }
      }
      
      // Для семьи — пустые белые страницы
      if (celebration === 'family') {
        params.interiorType = 'family_blank';
      }
      
      // Передаем дату события, если она есть
      if (eventDate) {
        params.eventDate = eventDate;
      }
      
      router.push({
        pathname: '/album-pages',
        params,
      } as unknown as Href);
    }
  };

  const handleBuy = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    let wbLink: string | null = null;
    
    // Для дневников используем SKU для поиска ссылки
    if (isDiary && diaryCover) {
      wbLink = getWildberriesLink(
        diaryCover.name,
        diaryCover.image as any,
        diaryCover.sku
      );
    } else if (isHoliday && holidayCover) {
      wbLink = getWildberriesLink(
        holidayCover.title,
        holidayCover.image as any,
        holidayCover.sku
      );
    } else if (isFamily && familyCover) {
      wbLink = getWildberriesLink(
        familyCover.title,
        familyCover.image as any,
        familyCover.sku
      );
    } else if (pregnancyDesign || holidayDesign || familyDesign || isKids) {
      wbLink = getWildberriesLink(coverName, coverImage ?? undefined, coverType ?? undefined);
    } else if (albumTemplate) {
      wbLink = getWildberriesLink(
        albumTemplate.name,
        (coverImage ?? albumTemplate.thumbnailPath) as any,
        albumTemplate.id
      );
    }
    
    if (wbLink) {
      try {
        const canOpen = await Linking.canOpenURL(wbLink);
        if (canOpen) {
          await Linking.openURL(wbLink);
        }
      } catch (error) {
        console.error('Не удалось открыть ссылку на Wildberries:', error);
      }
    } else {
      // Если ссылка не найдена, можно показать сообщение пользователю
      const itemName = isFamily && familyCover ? familyCover.title : (isHoliday && holidayCover ? holidayCover.title : (isDiary && diaryCover ? diaryCover.name : (albumTemplate?.name || '')));
      const itemId = isFamily && familyCover ? familyCover.sku : (isHoliday && holidayCover ? holidayCover.sku : (isDiary && diaryCover ? diaryCover.sku : (albumTemplate?.id || '')));
      console.warn('Ссылка на Wildberries не найдена для:', itemName, 'ID:', itemId);
    }
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


  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Animated.View style={[styles.content, containerAnimatedStyle]}>
        <ResponsiveScreenShell maxContentWidth={PICKER_CONTENT_MAX_WIDTH}>
        {/* Заголовок с кнопкой назад */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerText}>

            <Text style={styles.title}>Что вы хотите сделать?</Text>
            <Text style={styles.subtitle}>
              Выберите дальнейшее действие
            </Text>
          </View>
        </View>

        {/* Показываем выбранную обложку и кнопки действий */}
        {hasSelection && (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Карточка с выбранной обложкой */}
            <View style={styles.coverCard}>
              <View style={styles.coverImageContainer}>
                {coverImage && (
                  <Image
                    source={coverImage}
                    style={styles.coverImage}
                    contentFit="cover"
                    priority="high"
                    cachePolicy="memory-disk"
                    transition={0}
                    fadeDuration={0}
                    placeholderContentFit="cover"
                  />
                )}
              </View>
              <View style={styles.coverInfo}>
                <Text style={styles.coverName}>{coverName}</Text>
                <Text style={styles.coverDescription}>{coverDescription}</Text>
              </View>
            </View>

            {/* Кнопки действий */}
            <View style={styles.actionsContainer}>
              {/* Кнопка редактирования */}
              <TouchableOpacity
                testID="select-action-edit"
                style={styles.actionCard}
                onPress={handleEdit}
                activeOpacity={0.85}
              >
                <View style={styles.actionImageContainer}>
                  <View style={styles.actionImageSolid}>
                    <Ionicons name="create-outline" size={28} color={colors.textPrimary} />
                  </View>
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Редактировать в приложении</Text>
                  <Text style={styles.actionDescription}>
                    Создайте свой уникальный альбом
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={colors.primary} />
              </TouchableOpacity>

              {/* Переход к бумажной версии */}
              <TouchableOpacity
                style={styles.actionCard}
                onPress={handleBuy}
                activeOpacity={0.85}
              >
                <View style={styles.actionImageContainer}>
                  <View style={styles.actionImageSolid}>
                    <Ionicons name="open-outline" size={28} color={colors.textPrimary} />
                  </View>
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitleSolid}>Бумажная версия</Text>
                  <Text style={styles.actionDescriptionSolid}>
                    Открыть на Wildberries
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
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
    paddingTop: 24,
    paddingBottom: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  coverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  coverImageContainer: {
    width: 100,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 18,
    backgroundColor: colors.background,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverInfo: {
    flex: 1,
  },
  coverName: {
    fontSize: 19,
    color: '#5B4D3F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  coverDescription: {
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
  actionsContainer: {
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  actionImageContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    marginRight: 18,
    overflow: 'hidden',
  },
  actionImageSolid: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 19,
    color: '#5B4D3F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  actionTitleSolid: {
    fontSize: 19,
    color: '#5B4D3F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  actionDescription: {
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
  actionDescriptionSolid: {
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
});


