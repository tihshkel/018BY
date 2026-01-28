import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

// Категории с новыми названиями
const CATALOG_CATEGORIES = [
  { id: 'pregnancy', name: 'Ожидание чуда', icon: 'heart-outline' },
  { id: 'kids', name: 'Первые годы малыша', icon: 'flower-outline' },
  { id: 'family', name: 'Семья', icon: 'people-outline' },
  { id: 'wedding', name: 'Любовь и свадьба', icon: 'diamond-outline' },
  { id: 'holidays', name: 'Праздники и события', icon: 'gift-outline' },
  { id: 'girls', name: 'Мои истории: дневники', icon: 'book-outline' },
];

export default function PaperCatalogScreen() {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
  }, []);

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
      <Animated.View style={[styles.content, animatedStyle]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#8B6F5F" />
          </TouchableOpacity>
          <Text style={styles.title}>КАТАЛОГ ТОВАРОВ</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.subtitle}>
            Выберите категорию, чтобы посмотреть доступные товары
          </Text>

          {/* Категории */}
          <View style={styles.categoriesContainer}>
            {CATALOG_CATEGORIES.map(category => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                onPress={() => handleCategorySelect(category.name)}
                activeOpacity={0.7}
              >
                <View style={styles.categoryIcon}>
                  <Ionicons
                    name={category.icon as any}
                    size={28}
                    color="#C9A89A"
                  />
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Ionicons name="chevron-forward" size={20} color="#C9A89A" />
              </TouchableOpacity>
            ))}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingBottom: 100,
  },
  subtitle: {
    fontSize: 16,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '400',
    paddingHorizontal: 24,
    marginBottom: 24,
    lineHeight: 22,
  },
  categoriesContainer: {
    paddingHorizontal: 24,
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
  categoryIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
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
});

