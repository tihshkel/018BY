import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { projectCategories } from '@/constants/projectTemplates';
import {
  getGridColumnCount,
  getGridColumnWrapperStyle,
  getGridListStyle,
  getTabletContentShell,
  getTabletSectionWrap,
  PICKER_CONTENT_MAX_WIDTH,
  useResponsiveLayout,
} from '@/utils/responsive';

export default function ProjectsScreen() {
  const layout = useResponsiveLayout(PICKER_CONTENT_MAX_WIDTH);
  const contentShellStyle = getTabletContentShell(layout);
  const sectionWrap = getTabletSectionWrap(layout, {
    phonePadding: 24,
    tabletPadding: 0,
  });
  const categoryColumnCount = getGridColumnCount(layout);
  const gridListStyle = getGridListStyle(layout);
  const gridColumnWrapper = getGridColumnWrapperStyle(12);

  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleCategorySelect = (categoryId: string) => {
    router.push({
      pathname: '/projects/templates',
      params: { category: categoryId },
    });
  };

  const renderCategoryCard = useCallback(
    (category: (typeof projectCategories)[number], variant: 'row' | 'grid') => {
      const isGrid = variant === 'grid';
      return (
        <TouchableOpacity
          style={[styles.categoryCard, isGrid && styles.categoryCardGrid]}
          onPress={() => handleCategorySelect(category.id)}
          activeOpacity={0.7}
        >
          <View
            style={[styles.categoryIcon, isGrid && styles.categoryIconGrid]}
          >
            <Ionicons
              name={category.icon as keyof typeof Ionicons.glyphMap}
              size={28}
              color="#C9A89A"
            />
          </View>
          <Text
            style={[styles.categoryName, isGrid && styles.categoryNameGrid]}
            numberOfLines={isGrid ? 2 : undefined}
          >
            {category.name}
          </Text>
          {!isGrid && (
            <Ionicons name="chevron-forward" size={20} color="#C9A89A" />
          )}
        </TouchableOpacity>
      );
    },
    []
  );

  const renderCategoryItem = useCallback(
    ({ item }: { item: (typeof projectCategories)[number] }) =>
      renderCategoryCard(item, 'grid'),
    [renderCategoryCard]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View style={[styles.content, contentShellStyle, animatedStyle]}>
        <View style={[styles.header, sectionWrap]}>
          <Text
            style={[styles.title, layout.isTablet && styles.titleTablet]}
          >
            Мои истории
          </Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            layout.isTablet && styles.scrollContentTablet,
          ]}
        >
          <View style={[styles.categoriesContainer, sectionWrap]}>
            {layout.isTablet ? (
              <FlatList
                key={`projects-categories-cols-${categoryColumnCount}`}
                data={projectCategories}
                keyExtractor={(item) => item.id}
                renderItem={renderCategoryItem}
                numColumns={categoryColumnCount}
                scrollEnabled={false}
                style={gridListStyle}
                columnWrapperStyle={
                  categoryColumnCount > 1 ? gridColumnWrapper : undefined
                }
              />
            ) : (
              projectCategories.map((category) => (
                <React.Fragment key={category.id}>
                  {renderCategoryCard(category, 'row')}
                </React.Fragment>
              ))
            )}
          </View>
        </ScrollView>
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
    paddingTop: 24,
    paddingBottom: 32,
  },
  title: {
    fontSize: 32,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
  },
  titleTablet: {
    fontSize: 36,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  scrollContentTablet: {
    flexGrow: 1,
  },
  categoriesContainer: {
    paddingBottom: 24,
    gap: 12,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 2,
    borderColor: '#F0E8E0',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  categoryCardGrid: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 0,
    minWidth: 0,
    minHeight: 140,
  },
  categoryIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
  },
  categoryIconGrid: {
    marginRight: 0,
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 19,
    color: '#5B4D3F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
    flex: 1,
    letterSpacing: 0.2,
  },
  categoryNameGrid: {
    flex: 0,
    width: '100%',
  },
});
