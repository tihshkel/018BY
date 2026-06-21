import { CatalogProductCard } from '@/components/catalog/catalog-product-card';
import { HomeSectionHeader } from '@/components/home/home-section-header';
import { AppButton, AppFilterSheet, AppHeader, AppScreen, AppText } from '@/components/ui';
import { colors, spacing, surfaces } from '@/constants/design-tokens';
import { getWildberriesProductImageUrl } from '@/utils/wildberriesProductImage';
import {
  CATALOG_MAX_WIDTH,
  getTabletContentShell,
  getTabletSectionWrap,
  useResponsiveLayout,
} from '@/utils/responsive';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GIFT_ITEMS, type GiftItem } from '../(tabs)/gifts';

interface LocalParams {
  category?: string | string[];
}

const formatCategoryName = (value: LocalParams['category']) => {
  if (Array.isArray(value)) {
    return value[0];
  }
  if (typeof value === 'string') {
    return value;
  }
  return null;
};

const CATEGORY_TO_CELEBRATIONS: Record<string, string[]> = {
  'Ожидание чуда': ['Беременность'],
  'Праздники и события': ['День рождения'],
  'Первые годы малыша': ['Выписка', 'Первый год'],
  'Семья': [],
  'Мои истории: дневники': [],
  'Любовь и свадьба': [],
};

const CATEGORY_TO_SKU_PREFIXES: Record<string, string[]> = {
  'Мои истории: дневники': ['DD'],
  'Любовь и свадьба': ['SVA'],
};

const ALL_CATEGORIES = [
  'Ожидание чуда',
  'Первые годы малыша',
  'Семья',
  'Любовь и свадьба',
  'Праздники и события',
  'Мои истории: дневники',
];

type CoverType = 'all' | 'hard' | 'soft';

const getCoverType = (title: string): 'hard' | 'soft' | null => {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('твердой обложке') || lowerTitle.includes('твердой')) {
    return 'hard';
  }
  if (lowerTitle.includes('мягкой обложке') || lowerTitle.includes('мягкой')) {
    return 'soft';
  }
  return null;
};

export default function PaperCatalogTemplatesScreen() {
  const params = useLocalSearchParams();
  const categoryName = formatCategoryName(params.category);
  const categoryTitle = categoryName || 'Категория не выбрана';

  const layout = useResponsiveLayout(CATALOG_MAX_WIDTH);
  const contentShellStyle = getTabletContentShell(layout);
  const sectionWrap = getTabletSectionWrap(layout, { phonePadding: spacing.md, tabletPadding: 0 });

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryName);
  const [selectedCoverType, setSelectedCoverType] = useState<CoverType>('all');

  useEffect(() => {
    if (categoryName) {
      setSelectedCategory(categoryName);
    }
  }, [categoryName]);

  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const hasActiveFilters =
    selectedCategory !== categoryName || selectedCoverType !== 'all';

  const categoryItems = useMemo(() => {
    const filterCategory = selectedCategory || categoryName;

    if (!filterCategory) {
      return [];
    }

    let filtered: GiftItem[] = [];

    const skuPrefixes = CATEGORY_TO_SKU_PREFIXES[filterCategory] || [];
    if (skuPrefixes.length > 0) {
      filtered = GIFT_ITEMS.filter((item) =>
        skuPrefixes.some((prefix) => item.sku.startsWith(prefix))
      );
    } else if (filterCategory === 'Праздники и события') {
      filtered = GIFT_ITEMS.filter(
        (item) =>
          item.celebrations.includes('День рождения') && !item.sku.startsWith('DD')
      );
    } else {
      const celebrationsToMatch = CATEGORY_TO_CELEBRATIONS[filterCategory] || [];
      if (celebrationsToMatch.length > 0) {
        filtered = GIFT_ITEMS.filter((item) =>
          item.celebrations.some((celeb) => celebrationsToMatch.includes(celeb))
        );
      }
    }

    if (selectedCoverType !== 'all') {
      filtered = filtered.filter((item) => {
        const coverType = getCoverType(item.title);
        if (selectedCoverType === 'hard') {
          return coverType === 'hard';
        }
        if (selectedCoverType === 'soft') {
          return coverType === 'soft';
        }
        return true;
      });
    }

    return filtered;
  }, [categoryName, selectedCategory, selectedCoverType]);

  useFocusEffect(
    React.useCallback(() => {
      const preloadCategoryImages = async () => {
        if (categoryItems.length === 0) return;

        const wbUrls = categoryItems
          .map((item) => getWildberriesProductImageUrl(item.link))
          .filter((u): u is string => Boolean(u));

        await Promise.all(wbUrls.map((uri) => Image.prefetch(uri).catch(() => undefined)));
      };

      preloadCategoryImages();
    }, [categoryItems])
  );

  const handleOpenLink = useCallback(async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      console.error('Не удалось открыть ссылку:', error);
    }
  }, []);

  const headerTitle =
    hasActiveFilters || categoryItems.length > 0
      ? `${categoryTitle} · ${categoryItems.length}`
      : categoryTitle;

  if (!categoryName) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.errorWrap, sectionWrap]}>
          <AppHeader title="Каталог" />
          <View style={styles.errorState}>
            <View style={styles.errorIconWrap}>
              <Ionicons name="alert-circle-outline" size={36} color={colors.primary} />
            </View>
            <AppText variant="titleSm" style={styles.errorTitle}>
              Категория не выбрана
            </AppText>
            <AppText variant="bodySm" style={styles.errorText}>
              Вернитесь к списку и выберите категорию ещё раз.
            </AppText>
            <AppButton title="Вернуться" onPress={() => router.back()} style={styles.errorButton} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View style={[styles.content, contentShellStyle, animatedStyle]}>
        <View style={sectionWrap}>
          <AppHeader
            title={headerTitle}
            right={
              <Pressable
                onPress={() => setShowFilterModal(true)}
                style={styles.filterButton}
                accessibilityRole="button"
                accessibilityLabel="Фильтры"
              >
                <Ionicons
                  name="options-outline"
                  size={22}
                  color={hasActiveFilters ? colors.primary : colors.textPrimary}
                />
                {hasActiveFilters ? <View style={styles.filterBadge} /> : null}
              </Pressable>
            }
          />
        </View>

        <AppScreen scroll contentContainerStyle={[styles.scrollContent, sectionWrap]}>
          <HomeSectionHeader title="Товары" />

          {categoryItems.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="gift-outline" size={36} color={colors.primary} />
              </View>
              <AppText variant="titleSm" style={styles.emptyTitle}>
                Ничего не найдено
              </AppText>
              <AppText variant="bodySm" style={styles.emptyText}>
                Попробуйте другую категорию или сбросьте фильтры обложки.
              </AppText>
              {hasActiveFilters ? (
                <AppButton
                  title="Сбросить фильтры"
                  variant="outline"
                  onPress={() => {
                    setSelectedCategory(categoryName);
                    setSelectedCoverType('all');
                  }}
                  style={styles.emptyButton}
                />
              ) : null}
            </View>
          ) : (
            <View style={styles.productsList}>
              {categoryItems.map((item, index) => (
                <CatalogProductCard
                  key={item.id}
                  item={item}
                  imagePriority={index < 8 ? 'high' : 'normal'}
                  onPress={() => handleOpenLink(item.link)}
                />
              ))}
            </View>
          )}
        </AppScreen>
      </Animated.View>

      <AppFilterSheet
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Расширенный поиск"
        sections={[
          {
            id: 'category',
            title: 'Раздел',
            options: ALL_CATEGORIES.map((category) => ({
              value: category,
              label: category,
            })),
            value: selectedCategory ?? categoryName ?? ALL_CATEGORIES[0],
            onChange: (value) => setSelectedCategory(value),
          },
          {
            id: 'cover',
            title: 'Тип обложки',
            options: [
              { value: 'all', label: 'Все' },
              { value: 'hard', label: 'Твердая обложка' },
              { value: 'soft', label: 'Мягкая обложка' },
            ],
            value: selectedCoverType,
            onChange: (value) => setSelectedCoverType(value as CoverType),
          },
        ]}
        onReset={() => {
          setSelectedCategory(categoryName);
          setSelectedCoverType('all');
        }}
        onApply={() => setShowFilterModal(false)}
      />
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
    gap: spacing.sm,
  },
  productsList: {
    gap: spacing.md,
  },
  filterButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 10,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySurface,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  emptyButton: {
    minWidth: 220,
  },
  errorWrap: {
    flex: 1,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  errorIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySurface,
    marginBottom: spacing.sm,
  },
  errorTitle: {
    textAlign: 'center',
  },
  errorText: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  errorButton: {
    minWidth: 200,
  },
});
