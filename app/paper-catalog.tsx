import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HomeActionRow } from '@/components/home/home-action-row';
import { HomeSectionHeader } from '@/components/home/home-section-header';
import { AppCard, AppHeader, AppScreen, AppText } from '@/components/ui';
import { colors, spacing, surfaces } from '@/constants/design-tokens';
import {
  CATALOG_MAX_WIDTH,
  getTabletContentShell,
  getTabletSectionWrap,
  useResponsiveLayout,
} from '@/utils/responsive';

const CATALOG_CATEGORIES = [
  { id: 'pregnancy', name: 'Ожидание чуда', icon: 'heart-outline' as const, subtitle: 'Альбомы для будущих мам' },
  { id: 'kids', name: 'Первые годы малыша', icon: 'flower-outline' as const, subtitle: 'Выписка, первый год и не только' },
  { id: 'family', name: 'Семья', icon: 'people-outline' as const, subtitle: 'Семейные фотоальбомы' },
  { id: 'wedding', name: 'Любовь и свадьба', icon: 'diamond-outline' as const, subtitle: 'Свадебные истории' },
  { id: 'holidays', name: 'Праздники и события', icon: 'gift-outline' as const, subtitle: 'Дни рождения и праздники' },
  { id: 'girls', name: 'Мои истории: дневники', icon: 'book-outline' as const, subtitle: 'Личные дневники для девочек' },
];

export default function PaperCatalogScreen() {
  const layout = useResponsiveLayout(CATALOG_MAX_WIDTH);
  const contentShellStyle = getTabletContentShell(layout);
  const sectionWrap = getTabletSectionWrap(layout, { phonePadding: spacing.md, tabletPadding: 0 });

  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleCategorySelect = (categoryName: string) => {
    router.push({
      pathname: '/paper-catalog/templates',
      params: { category: categoryName },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View style={[styles.content, contentShellStyle, animatedStyle]}>
        <View style={sectionWrap}>
          <AppHeader title="Каталог" />
        </View>

        <AppScreen scroll contentContainerStyle={[styles.scrollContent, sectionWrap]}>
          <View style={styles.intro}>
            <AppText variant="stepLabel">БУМАЖНЫЕ АЛЬБОМЫ</AppText>
            <AppText variant="bodySm" style={styles.introText}>
              Выберите категорию, чтобы посмотреть товары на Wildberries
            </AppText>
          </View>

          <View style={styles.section}>
            <HomeSectionHeader title="Категории" />
            <AppCard style={styles.categoriesCard}>
              {CATALOG_CATEGORIES.map((category, index) => (
                <HomeActionRow
                  key={category.id}
                  icon={category.icon}
                  title={category.name}
                  subtitle={category.subtitle}
                  onPress={() => handleCategorySelect(category.name)}
                  accent={category.id === 'pregnancy'}
                  showDivider={index < CATALOG_CATEGORIES.length - 1}
                />
              ))}
            </AppCard>
          </View>

          <View style={styles.note}>
            <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
            <AppText variant="bodySm" style={styles.noteText}>
              Покупка оформляется на сайте Wildberries — мы откроем нужную страницу товара.
            </AppText>
          </View>
        </AppScreen>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: surfaces.muted,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  intro: {
    gap: 6,
    paddingTop: spacing.xs,
  },
  introText: {
    paddingRight: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  categoriesCard: {
    backgroundColor: colors.white,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: 4,
    paddingBottom: spacing.md,
  },
  noteText: {
    flex: 1,
  },
});
