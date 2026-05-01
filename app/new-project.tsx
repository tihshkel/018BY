import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  pages: number;
  sections: number;
  hasReminders: boolean;
  coverImage?: string;
}

const categories: Category[] = [
  { id: 'pregnancy', name: 'Беременность', icon: 'heart-outline' },
  { id: 'kids', name: 'Дети 0–7 лет', icon: 'flower-outline' },
  { id: 'wedding', name: 'Свадьба', icon: 'diamond-outline' },
  { id: 'family', name: 'Семья', icon: 'people-outline' },
  { id: 'diary', name: 'Дневники', icon: 'book-outline' },
];

const products: Record<string, Product[]> = {
  pregnancy: [
    {
      id: 'preg-hard',
      name: 'Дневник в твёрдой обложке',
      description: '32 раздела, 120 страниц, напоминания по неделям',
      pages: 120,
      sections: 32,
      hasReminders: true,
    },
    {
      id: 'preg-soft',
      name: 'Дневник в мягкой обложке',
      description: '28 разделов, 96 страниц, напоминания по неделям',
      pages: 96,
      sections: 28,
      hasReminders: true,
    },
  ],
  kids: [
    {
      id: 'kids-album',
      name: 'Альбом 0–1 год',
      description: '40 разделов, 160 страниц, напоминания по месяцам',
      pages: 160,
      sections: 40,
      hasReminders: true,
    },
  ],
  wedding: [
    {
      id: 'wedding-book',
      name: 'Свадебная книга',
      description: '24 раздела, 100 страниц, напоминания',
      pages: 100,
      sections: 24,
      hasReminders: true,
    },
  ],
  family: [
    {
      id: 'family-album',
      name: 'Семейный альбом',
      description: '36 разделов, 140 страниц',
      pages: 140,
      sections: 36,
      hasReminders: false,
    },
  ],
  diary: [
    {
      id: 'diary-book',
      name: 'Личный дневник',
      description: 'Дневник для записи мыслей и воспоминаний',
      pages: 100,
      sections: 20,
      hasReminders: false,
    },
  ],
};

export default function NewProjectScreen() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 32 : 20);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSystemDatePicker, setShowSystemDatePicker] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    if (product.hasReminders) {
      setShowDatePicker(true);
    } else {
      // Создать проект без даты
      handleCreateProject(product, null);
    }
  };

  const handleDateConfirm = () => {
    setShowDatePicker(false);
    if (selectedProduct) {
      handleCreateProject(selectedProduct, selectedDate);
    }
  };

  const handleCreateProject = (product: Product, date: Date | null) => {
    // Переходим к выбору готового PDF-альбома
    router.push('/select-album');
  };

  const handleSkipDate = () => {
    if (selectedProduct) {
      handleCreateProject(selectedProduct, null);
    }
    setShowDatePicker(false);
  };

  const handleSystemDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      // На Android календарь закрывается автоматически после выбора
      setShowSystemDatePicker(false);
      if (event.type === 'set' && date) {
        setSelectedDate(date);
        // После выбора даты снова открываем модальное окно
        setTimeout(() => {
          setShowDatePicker(true);
        }, 300);
      }
    } else {
      // На iOS обновляем дату при каждом изменении
      if (date) {
        setSelectedDate(date);
      }
    }
  };

  const handleDatePreviewPress = () => {
    if (Platform.OS === 'android') {
      // На Android закрываем модальное окно и показываем календарь отдельно
      setShowDatePicker(false);
      setTimeout(() => {
        setShowSystemDatePicker(true);
      }, 300);
    } else {
      // На iOS показываем календарь внутри модального окна
      setShowSystemDatePicker(true);
    }
  };

  const currentProducts = selectedCategory ? products[selectedCategory] || [] : [];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Animated.View style={[styles.content, animatedStyle]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#8B6F5F" />
          </TouchableOpacity>
          <Text style={styles.title}>Что хотите сохранить?</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: bottomInset + 32 },
          ]}
        >
          {/* Категории */}
          <View style={styles.categoriesContainer}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  selectedCategory === category.id && styles.categoryCardSelected,
                ]}
                onPress={() => handleCategorySelect(category.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.categoryIcon,
                    selectedCategory === category.id && styles.categoryIconSelected,
                  ]}
                >
                  <Ionicons
                    name={category.icon as any}
                    size={28}
                    color={selectedCategory === category.id ? '#FFFFFF' : '#C9A89A'}
                  />
                </View>
                <Text
                  style={[
                    styles.categoryName,
                    selectedCategory === category.id && styles.categoryNameSelected,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Продукты выбранной категории */}
          {selectedCategory && currentProducts.length > 0 && (
            <View style={styles.productsContainer}>
              <Text style={styles.productsTitle}>Выберите вариант</Text>
              {currentProducts.map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={styles.productCard}
                  onPress={() => handleProductSelect(product)}
                  activeOpacity={0.85}
                >
                  <View style={styles.productImage}>
                    <Ionicons name="book" size={40} color="#C9A89A" />
                  </View>
                  <View style={styles.productContent}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productDescription}>{product.description}</Text>
                    {(product.hasReminders && (selectedCategory === 'pregnancy' || selectedCategory === 'kids')) && (
                      <View style={styles.productFeatures}>
                        <View style={styles.feature}>
                          <Ionicons name="notifications-outline" size={16} color="#9B8E7F" />
                          <Text style={styles.featureText}>Напоминания</Text>
                        </View>
                      </View>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#D4C4B5" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Модальное окно выбора даты */}
        <Modal
          visible={showDatePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {selectedCategory === 'pregnancy'
                  ? 'Когда родится ребёнок?'
                  : selectedCategory === 'wedding'
                  ? 'Дата свадьбы?'
                  : 'Укажите дату события'}
              </Text>
              <Text style={styles.modalSubtitle}>
                Эта дата станет основой для всех напоминаний и рекомендаций
              </Text>

              {Platform.OS === 'ios' && showSystemDatePicker ? (
                <View style={styles.datePickerContainer}>
                  <View style={styles.datePickerHeader}>
                    <TouchableOpacity
                      onPress={() => setShowSystemDatePicker(false)}
                      style={styles.datePickerCancelButton}
                    >
                      <Text style={styles.datePickerCancelText}>Отмена</Text>
                    </TouchableOpacity>
                    <Text style={styles.datePickerHeaderTitle}>Выберите дату</Text>
                    <TouchableOpacity
                      onPress={() => setShowSystemDatePicker(false)}
                      style={styles.datePickerDoneButton}
                    >
                      <Text style={styles.datePickerDoneText}>Готово</Text>
                    </TouchableOpacity>
                  </View>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="spinner" // wheels иногда падает на старых iOS, spinner стабильнее
                  onChange={handleSystemDateChange}
                  locale="ru-RU"
                  maximumDate={new Date(2030, 11, 31)}
                  minimumDate={new Date(1900, 0, 1)}
                  themeVariant="light"
                  textColor="#8B6F5F"
                />
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.datePreview}
                  onPress={handleDatePreviewPress}
                  activeOpacity={0.7}
                >
                  <Text style={styles.datePreviewText}>
                    {selectedDate && !isNaN(selectedDate.getTime()) 
                      ? selectedDate.toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : 'Выберите дату'
                    }
                  </Text>
                  <Text style={styles.datePreviewHint}>
                    Выберите дату в системном календаре
                  </Text>
                </TouchableOpacity>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={handleSkipDate}
                  activeOpacity={0.7}
                >
                  <Text style={styles.skipButtonText}>Пропустить</Text>
                  <Text style={styles.skipButtonHint}>
                    Без даты напоминания не будут работать
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleDateConfirm}
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmButtonText}>Подтвердить</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Календарь для Android (показывается отдельно) */}
        {Platform.OS === 'android' && showSystemDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={handleSystemDateChange}
            locale="ru_RU"
            maximumDate={new Date(2030, 11, 31)}
            minimumDate={new Date(1900, 0, 1)}
          />
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
  },
  categoriesContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
    gap: 12,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0E8E0',
  },
  categoryCardSelected: {
    borderColor: '#C9A89A',
    backgroundColor: '#FAF8F5',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  categoryIconSelected: {
    backgroundColor: '#C9A89A',
  },
  categoryName: {
    fontSize: 18,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '500',
    flex: 1,
  },
  categoryNameSelected: {
    color: '#8B6F5F',
  },
  productsContainer: {
    paddingHorizontal: 24,
  },
  productsTitle: {
    fontSize: 20,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '500',
    marginBottom: 16,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  productImage: {
    width: 80,
    height: 100,
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  productContent: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
    marginBottom: 8,
  },
  productDescription: {
    fontSize: 14,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    marginBottom: 12,
    lineHeight: 20,
  },
  productFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 12,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  datePicker: {
    marginVertical: 20,
  },
  modalButtons: {
    gap: 12,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 15,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '400',
    marginBottom: 4,
  },
  skipButtonHint: {
    fontSize: 12,
    color: '#B8A89A',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
  },
  confirmButton: {
    backgroundColor: '#C9A89A',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  datePreview: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#FAF8F5',
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E8D5C7',
    shadowColor: '#8B6F5F',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  datePreviewText: {
    fontSize: 20,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '500',
    marginBottom: 8,
  },
  datePreviewHint: {
    fontSize: 13,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
  },
  datePickerContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 0 : 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D5C7',
  },
  datePickerHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  datePickerCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  datePickerCancelText: {
    color: '#9B8E7F',
    fontSize: 16,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  datePickerDoneButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  datePickerDoneText: {
    color: '#C9A89A',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
});

