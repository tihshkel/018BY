import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllAlbumTemplates, type AlbumTemplate } from '@/albums';
import { projectCategories } from '@/constants/projectTemplates';

interface LocalParams {
  category?: string | string[];
  productId?: string | string[];
  reminderDate?: string | string[];
}

const normalizeParam = (value?: string | string[] | null) => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return typeof value === 'string' ? value : null;
};

const getCategoryLabel = (categoryId: string | null) => {
  if (!categoryId) {
    return null;
  }
  const category = projectCategories.find(item => item.id === categoryId);
  return category?.name ?? null;
};

const matchAlbumWithCategory = (album: AlbumTemplate, categoryId: string) => {
  if (categoryId === 'holidays') {
    return album.category === 'travel' || album.category === 'holidays';
  }
  return album.category === categoryId;
};

export default function SelectAlbumScreen() {
  const params = useLocalSearchParams<LocalParams>();
  const categoryId = normalizeParam(params.category);
  const productId = normalizeParam(params.productId);
  const reminderDateParam = normalizeParam(params.reminderDate);
  const reminderDateISO =
    reminderDateParam && !Number.isNaN(Date.parse(reminderDateParam))
      ? new Date(reminderDateParam).toISOString()
      : null;

  const categoryLabel = getCategoryLabel(categoryId);

  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const opacity = useSharedValue(0);

  const albumTemplates = useMemo(() => getAllAlbumTemplates(), []);

  const filteredAlbums = useMemo(() => {
    if (!categoryId) {
      return albumTemplates;
    }
    return albumTemplates.filter(album => matchAlbumWithCategory(album, categoryId));
  }, [albumTemplates, categoryId]);

  // Предзагрузка всех изображений альбомов при монтировании и фокусе экрана
  useFocusEffect(
    React.useCallback(() => {
      const preloadAlbumImages = async () => {
        try {
          // Предзагружаем изображения всех отфильтрованных альбомов
          const imagesToPreload = filteredAlbums
            .filter(album => album.thumbnailPath)
            .map(album => album.thumbnailPath!);
          
          // Предзагружаем только строковые URI (локальные ресурсы не требуют предзагрузки)
          await Promise.all(
            imagesToPreload.map(imageSource => {
              if (typeof imageSource === 'string') {
                return Image.prefetch(imageSource).catch(err => {
                  console.warn('⚠️ Ошибка предзагрузки изображения альбома:', err);
                });
              }
              // Пропускаем локальные ресурсы (числа) - они загружаются быстро
              return Promise.resolve();
            })
          );
          
          console.log('✅ Изображения альбомов предзагружены');
        } catch (error) {
          console.error('❌ Ошибка предзагрузки изображений альбомов:', error);
        }
      };

      preloadAlbumImages();
    }, [filteredAlbums])
  );

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleSelectAlbum = async (album: AlbumTemplate) => {
    try {
      setSelectedAlbum(album.id);

      // Создаем новый проект на основе готового PDF-альбома
      const projectId = Date.now().toString();
      
      // Сохраняем информацию о проекте
      const projectData = {
        id: projectId,
        title: album.name,
        category: album.category,
        hasPdfTemplate: true,
        pdfPath: album.pdfPath,
        albumId: album.id, // Сохраняем ID альбома для поиска в шаблонах
        sourceTemplateId: productId ?? null,
        reminderDate: reminderDateISO,
        thumbnailPath: album.thumbnailPath, // Сохраняем путь к миниатюре
        createdAt: new Date().toISOString(),
        isReadyMadeAlbum: true, // Флаг, что это готовый альбом
      };

      await AsyncStorage.setItem(`@project_${projectId}`, JSON.stringify(projectData));
      // Сохраняем pdfPath как строку (если это число, конвертируем в строку)
      const pdfPathString = typeof album.pdfPath === 'number' 
        ? String(album.pdfPath) 
        : (album.pdfPath || '');
      await AsyncStorage.setItem(`@project_pdf_${projectId}`, pdfPathString);

      // Сохраняем в список проектов
      const existingProjects = await AsyncStorage.getItem('@user_projects');
      const projects = existingProjects ? JSON.parse(existingProjects) : [];
      projects.push(projectData);
      await AsyncStorage.setItem('@user_projects', JSON.stringify(projects));

      // Переходим к редактированию готового PDF-альбома
      router.push(`/edit-album?id=${projectId}`);
    } catch (error) {
      console.error('Error loading album template:', error);
      Alert.alert(
        'Ошибка',
        'Не удалось создать проект. Попробуйте еще раз.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Animated.View style={[styles.content, animatedStyle]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#8B6F5F" />
          </TouchableOpacity>
          <Text style={styles.title}>Выберите альбом</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.subtitle}>
            {categoryLabel
              ? `Выберите альбом в категории «${categoryLabel}»`
              : 'Выберите альбом для создания проекта'}
          </Text>

          {filteredAlbums.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle-outline" size={40} color="#D4C4B5" />
              <Text style={styles.emptyStateText}>
                Пока нет альбомов для этой категории. Выберите другую тему или вернитесь назад.
              </Text>
            </View>
          ) : (
            filteredAlbums.map(album => (
            <TouchableOpacity
              key={album.id}
              style={[
                styles.albumCard,
                selectedAlbum === album.id && styles.albumCardSelected,
              ]}
              onPress={() => handleSelectAlbum(album)}
              activeOpacity={0.85}
            >
              <View style={styles.albumThumbnail}>
                {album.thumbnailPath ? (
                  <Image
                    source={album.thumbnailPath}
                    style={styles.albumImage}
                    contentFit="cover"
                    priority={filteredAlbums.indexOf(album) < 5 ? "high" : "normal"}
                    cachePolicy="disk"
                    transition={0}
                    fadeDuration={0}
                    recyclingKey={album.id}
                  />
                ) : (
                  <View style={styles.albumIcon}>
                    <Ionicons
                      name={
                        album.category === 'pregnancy'
                          ? 'heart'
                          : album.category === 'kids'
                          ? 'flower'
                          : album.category === 'family'
                          ? 'people'
                          : album.category === 'wedding'
                          ? 'diamond'
                          : 'airplane'
                      }
                      size={40}
                      color={selectedAlbum === album.id ? '#FFFFFF' : '#C9A89A'}
                    />
                  </View>
                )}
              </View>
              <View style={styles.albumContent}>
                <Text style={styles.albumName}>{album.name}</Text>
                <Text style={styles.albumDescription}>{album.description}</Text>
                <Text style={styles.albumPages}>{album.pages} страниц</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={24}
                color={selectedAlbum === album.id ? '#C9A89A' : '#D4C4B5'}
              />
            </TouchableOpacity>
            ))
          )}
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
    paddingTop: 16,
    paddingBottom: 24,
  },
  backButton: {
    marginRight: 12,
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
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
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
    marginBottom: 28,
    lineHeight: 24,
    textAlign: 'center',
  },
  albumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    marginBottom: 18,
    borderWidth: 2,
    borderColor: '#F0E8E0',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  albumCardSelected: {
    borderColor: '#C9A89A',
    backgroundColor: '#FAF8F5',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 4,
  },
  albumThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginRight: 18,
    overflow: 'hidden',
  },
  albumImage: {
    width: '100%',
    height: '100%',
  },
  albumIcon: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumContent: {
    flex: 1,
  },
  albumName: {
    fontSize: 20,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
    marginBottom: 6,
  },
  albumDescription: {
    fontSize: 15,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    lineHeight: 22,
    marginBottom: 4,
  },
  albumPages: {
    fontSize: 13,
    color: '#B8A898',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '400',
  },
  emptyState: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#9B8E7F',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
  },
});

