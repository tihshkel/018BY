import React, { useState, useMemo } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getAllAlbumTemplates, type AlbumTemplate } from '@/albums';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CoverType {
  id: string;
  title: string;
  description: string;
  image: any;
  color: string;
  gradient: string[];
}

export default function SelectCoverScreen() {
  const { celebration } = useLocalSearchParams<{ celebration: string }>();
  const containerOpacity = useSharedValue(0);

  // Получаем все альбомы и преобразуем их в обложки
  const albumTemplates = getAllAlbumTemplates();
  
  const coverTypes: CoverType[] = useMemo(() => {
    // Генерация градиентов на основе категорий
    const categoryGradients: { [key: string]: string[] } = {
      pregnancy: ['#FF6B9D', '#FF8E9B'],
      kids: ['#4ECDC4', '#44A08D'],
      family: ['#D4A574', '#C9A89A'],
      wedding: ['#F093FB', '#F5576C'],
      travel: ['#FFD89B', '#19547B'],
    };

    // Фильтруем альбомы по категории, если указана
    const filteredAlbums = celebration 
      ? albumTemplates.filter(album => album.category === celebration)
      : albumTemplates;

    return filteredAlbums.map((album, index) => {
      const gradient = categoryGradients[album.category] || ['#8B6F5F', '#A68B5B'];
      return {
        id: album.id,
        title: album.name,
        description: album.description,
        image: album.thumbnailPath,
        color: gradient[0],
        gradient,
      };
    });
  }, [albumTemplates, celebration]);

  React.useEffect(() => {
    containerOpacity.value = withTiming(1, { duration: 400 });
  }, []);

  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: containerOpacity.value,
    };
  });

  const handleCoverSelect = (coverId: string) => {
    if (!celebration) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Сразу переходим на страницу выбора действия
    router.push({
      pathname: '/select-action',
      params: { 
        celebration,
        coverType: coverId
      }
    });
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
    };
    return celebrationMap[celebrationId] || 'Праздник';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient
        colors={['#F5F0EB', '#FAF8F5', '#F5F0EB']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <Animated.View style={[styles.content, containerAnimatedStyle]}>
        {/* Заголовок с кнопкой назад */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#8B6F5F" />
          </TouchableOpacity>
          
          <View style={styles.headerText}>
            <Text style={styles.title}>Выберите обложку</Text>
            <Text style={styles.subtitle}>
              Для альбома "{getCelebrationTitle(celebration || '')}"
            </Text>
          </View>
        </View>

        {/* Список типов обложек */}
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {coverTypes.map((cover) => (
            <TouchableOpacity
              key={cover.id}
              style={styles.coverCard}
              onPress={() => handleCoverSelect(cover.id)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FFFFFF', '#FFFFFF']}
                style={styles.cardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardImageContainer}>
                    <Image
                      source={cover.image}
                      style={styles.cardImage}
                      contentFit="cover"
                      priority={coverTypes.indexOf(cover) < 5 ? "high" : "normal"}
                      cachePolicy="disk"
                      transition={0}
                      fadeDuration={0}
                      recyclingKey={cover.id}
                    />
                  </View>
                  
                  <View style={styles.cardTextContainer}>
                    <Text style={styles.cardTitle}>
                      {cover.title}
                    </Text>
                    <Text style={styles.cardDescription}>
                      {cover.description}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#C9A89A" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerText: {
    flex: 1,
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
    marginBottom: 4,
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
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardGradient: {
    padding: 20,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardImageContainer: {
    width: 100,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FAF8F5',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardTextContainer: {
    flex: 1,
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
    marginBottom: 6,
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
});
