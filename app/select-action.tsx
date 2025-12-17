import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getAlbumTemplateById } from '@/albums';
import { getWildberriesLink } from '@/utils/albumGiftMapping';

export default function SelectActionScreen() {
  const { celebration, coverType } = useLocalSearchParams<{
    celebration: string;
    coverType: string;
  }>();
  const containerOpacity = useSharedValue(0);

  React.useEffect(() => {
    containerOpacity.value = withTiming(1, { duration: 400 });
  }, []);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const albumTemplate = coverType ? getAlbumTemplateById(coverType) : null;
  const isPregnancy = celebration === 'pregnancy';

  const handleEdit = () => {
    if (!coverType || !celebration) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Для беременности показываем выбор внутренней части
    if (isPregnancy) {
      router.push({
        pathname: '/select-interior',
        params: {
          celebration,
          coverType,
        },
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
      
      router.push({
        pathname: '/edit-album',
        params,
      });
    }
  };

  const handleBuy = async () => {
    if (!albumTemplate) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Ищем ссылку на WB по изображению обложки, ID альбома и названию
    // Для детских альбомов используем ID для точного сопоставления (dfa_7 -> DFA7)
    const wbLink = getWildberriesLink(albumTemplate.name, albumTemplate.thumbnailPath, albumTemplate.id);
    
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
      console.warn('Ссылка на Wildberries не найдена для:', albumTemplate.name, 'ID:', albumTemplate.id);
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
    };
    return celebrationMap[celebrationId] || 'Праздник';
  };


  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Animated.View style={[styles.content, containerAnimatedStyle]}>
        {/* Заголовок с кнопкой назад */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#8B6F5F" />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.title}>Что вы хотите сделать?</Text>
            <Text style={styles.subtitle}>
              Выберите дальнейшее действие
            </Text>
          </View>
        </View>

        {/* Показываем выбранную обложку и кнопки действий */}
        {albumTemplate && (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Карточка с выбранной обложкой */}
            <View style={styles.coverCard}>
              <View style={styles.coverImageContainer}>
                {albumTemplate.thumbnailPath && (
                  <Image
                    source={albumTemplate.thumbnailPath}
                    style={styles.coverImage}
                    contentFit="cover"
                    priority="high"
                    cachePolicy="disk"
                    transition={0}
                    fadeDuration={0}
                  />
                )}
              </View>
              <View style={styles.coverInfo}>
                <Text style={styles.coverName}>{albumTemplate.name}</Text>
                <Text style={styles.coverDescription}>
                  {albumTemplate.description}
                </Text>
              </View>
            </View>

            {/* Кнопки действий */}
            <View style={styles.actionsContainer}>
              {/* Кнопка редактирования */}
              <TouchableOpacity
                style={styles.actionCard}
                onPress={handleEdit}
                activeOpacity={0.85}
              >
                <View style={styles.actionImageContainer}>
                  <View style={styles.actionImageSolid}>
                    <Ionicons name="create-outline" size={28} color="#8B6F5F" />
                  </View>
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Редактировать в приложении</Text>
                  <Text style={styles.actionDescription}>
                    Создайте свой уникальный альбом
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#C9A89A" />
              </TouchableOpacity>

              {/* Кнопка покупки */}
              <TouchableOpacity
                style={styles.actionCard}
                onPress={handleBuy}
                activeOpacity={0.85}
              >
                <View style={styles.actionImageContainer}>
                  <View style={styles.actionImageSolid}>
                    <Ionicons name="cart-outline" size={28} color="#8B6F5F" />
                  </View>
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitleSolid}>Купить бумажную версию</Text>
                  <Text style={styles.actionDescriptionSolid}>
                    Перейти на Wildberries
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#C9A89A" />
              </TouchableOpacity>
            </View>
          </ScrollView>
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
    backgroundColor: '#FAF8F5',
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
    color: '#9B8E7F',
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
    borderColor: '#F0E8E0',
    shadowColor: '#8B6F5F',
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
    backgroundColor: '#FAF8F5',
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
    color: '#9B8E7F',
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


