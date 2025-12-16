import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAlbumTemplatesByCategory } from '@/albums';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Celebration {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  gradient: string[];
  image: any;
}

const celebrations: Celebration[] = [
  {
    id: 'pregnancy',
    title: 'Беременность',
    description: 'Дневник ожидания малыша',
    icon: 'heart-outline',
    color: '#FF6B9D',
    gradient: ['#FF6B9D', '#FF8E9B'],
    image: require('@/assets/images/albums/DB1_0.png'),
  },
  {
    id: 'kids',
    title: 'Детство',
    description: 'Первые годы жизни',
    icon: 'happy-outline',
    color: '#4ECDC4',
    gradient: ['#4ECDC4', '#44A08D'],
    image: require('@/assets/images/albums/DB2_0.png'),
  },
  {
    id: 'family',
    title: 'Семья',
    description: 'Семейные моменты',
    icon: 'people-outline',
    color: '#45B7D1',
    gradient: ['#45B7D1', '#96C93D'],
    image: require('@/assets/images/albums/DB3_0.png'),
  },
  {
    id: 'wedding',
    title: 'Свадьба',
    description: 'Самый важный день',
    icon: 'diamond-outline',
    color: '#F093FB',
    gradient: ['#F093FB', '#F5576C'],
    image: require('@/assets/images/albums/DB4_0.png'),
  },
  {
    id: 'travel',
    title: 'Путешествия',
    description: 'Воспоминания о поездках',
    icon: 'airplane-outline',
    color: '#FFD89B',
    gradient: ['#FFD89B', '#19547B'],
    image: require('@/assets/images/albums/DB5_0.png'),
  },
];

export default function SelectCelebrationScreen() {
  const [selectedCelebration, setSelectedCelebration] = useState<string | null>(null);
  const containerOpacity = useSharedValue(0);

  // Предзагрузка изображений при монтировании экрана
  useEffect(() => {
    const preloadImages = async () => {
      try {
        // Предзагружаем все изображения через Image.prefetch (быстрее)
        const preloadPromises = celebrations.map(celebration => 
          Image.prefetch(celebration.image as number).catch(err => {
            console.warn('⚠️ Ошибка предзагрузки изображения:', err);
          })
        );
        await Promise.all(preloadPromises);
        console.log('✅ Изображения праздников предзагружены');
      } catch (error) {
        console.error('❌ Ошибка предзагрузки изображений:', error);
        // В случае ошибки изображения все равно будут загружаться по требованию
      }
    };

    preloadImages();
  }, []);

  useEffect(() => {
    containerOpacity.value = withTiming(1, { duration: 400 });
  }, [containerOpacity]);

  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: containerOpacity.value,
    };
  });

  const handleCelebrationSelect = (celebrationId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCelebration(celebrationId);
  };

  const handleContinue = async () => {
    if (selectedCelebration) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      try {
        // Находим первый альбом с PDF для выбранной категории
        const albums = getAlbumTemplatesByCategory(selectedCelebration as any);
        const albumWithPdf = albums.find(album => album.pdfPath && album.hasPdfTemplate);
        
        if (albumWithPdf && albumWithPdf.pdfPath) {
          // Создаем новый проект на основе готового PDF-альбома
          const projectId = Date.now().toString();
          
          // Сохраняем информацию о проекте
          const projectData = {
            id: projectId,
            title: albumWithPdf.name,
            category: albumWithPdf.category,
            hasPdfTemplate: true,
            pdfPath: albumWithPdf.pdfPath,
            albumId: albumWithPdf.id,
            createdAt: new Date().toISOString(),
            isReadyMadeAlbum: true,
          };

          await AsyncStorage.setItem(`@project_${projectId}`, JSON.stringify(projectData));
          // Сохраняем pdfPath как строку (если это число, конвертируем в строку)
          const pdfPathString = typeof albumWithPdf.pdfPath === 'number' 
            ? String(albumWithPdf.pdfPath) 
            : (albumWithPdf.pdfPath || '');
          await AsyncStorage.setItem(`@project_pdf_${projectId}`, pdfPathString);

          // Сохраняем в список проектов
          const existingProjects = await AsyncStorage.getItem('@user_projects');
          const projects = existingProjects ? JSON.parse(existingProjects) : [];
          projects.push(projectData);
          await AsyncStorage.setItem('@user_projects', JSON.stringify(projects));

          // Переходим сразу к редактированию PDF
          router.push(`/edit-album?id=${projectId}`);
        } else {
          // Если нет PDF, переходим к выбору обложки
          router.push({
            pathname: '/select-cover',
            params: { celebration: selectedCelebration }
          });
        }
      } catch (error) {
        console.error('Error creating project:', error);
        // В случае ошибки переходим к выбору обложки
        router.push({
          pathname: '/select-cover',
          params: { celebration: selectedCelebration }
        });
      }
    }
  };

  const selectedCelebrationData = celebrations.find(c => c.id === selectedCelebration);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient
        colors={['#F5F0EB', '#FAF8F5', '#F5F0EB']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <Animated.View style={[styles.content, containerAnimatedStyle]}>
        {/* Заголовок */}
        <View style={styles.header}>
          <Text style={styles.title}>Выберите праздник</Text>
          <Text style={styles.subtitle}>
            Какой альбом вы хотите создать?
          </Text>
        </View>

        {/* Список праздников */}
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {celebrations.map((celebration) => (
            <TouchableOpacity
              key={celebration.id}
              style={[
                styles.celebrationCard,
                selectedCelebration === celebration.id && styles.celebrationCardSelected,
              ]}
              onPress={() => handleCelebrationSelect(celebration.id)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  selectedCelebration === celebration.id
                    ? celebration.gradient
                    : ['#FFFFFF', '#FFFFFF']
                }
                style={styles.cardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardImageContainer}>
                    <Image
                      source={celebration.image}
                      style={styles.cardImage}
                      contentFit="cover"
                      priority="high"
                      cachePolicy="disk"
                      transition={0}
                      fadeDuration={0}
                    />
                  </View>
                  
                  <View style={styles.cardTextContainer}>
                    <Text
                      style={[
                        styles.cardTitle,
                        selectedCelebration === celebration.id && styles.cardTitleSelected,
                      ]}
                    >
                      {celebration.title}
                    </Text>
                    <Text
                      style={[
                        styles.cardDescription,
                        selectedCelebration === celebration.id && styles.cardDescriptionSelected,
                      ]}
                    >
                      {celebration.description}
                    </Text>
                  </View>

                  <View style={styles.cardIconContainer}>
                    <Ionicons
                      name={celebration.icon as any}
                      size={24}
                      color={
                        selectedCelebration === celebration.id
                          ? '#FFFFFF'
                          : celebration.color
                      }
                    />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Кнопка продолжения */}
        {selectedCelebration && (
          <View style={styles.continueContainer}>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={selectedCelebrationData?.gradient || ['#C9A89A', '#8B6F5F']}
                style={styles.continueButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.continueButtonText}>
                  Продолжить
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    alignItems: 'center',
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
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  celebrationCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  celebrationCardSelected: {
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    transform: [{ scale: 1.02 }],
  },
  cardGradient: {
    padding: 20,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardImageContainer: {
    width: 80,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 16,
    backgroundColor: '#FAF8F5',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 20,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
    marginBottom: 4,
  },
  cardTitleSelected: {
    color: '#FFFFFF',
  },
  cardDescription: {
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
  cardDescriptionSelected: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  continueButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  continueButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 12,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
});
