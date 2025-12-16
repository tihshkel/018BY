import React, { useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface InteriorOption {
  id: string;
  title: string;
  description: string;
  pdfPath: any;
  previewImagePath: any;
}

const INTERIOR_OPTIONS: InteriorOption[] = [
  {
    id: 'pregnancy_60',
    title: 'Блок БЕРЕМЕННОСТЬ 60 стр',
    description: '60 страниц для записи всех важных моментов',
    pdfPath: require('../assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр.pdf'),
    previewImagePath: require('../assets/pdfs/preview/pregnancy_60_preview.png'),
  },
  {
    id: 'pregnancy_a5',
    title: 'Блок БЕРЕМЕННОСТЬ A5 другой блок',
    description: 'Альтернативный вариант в формате A5',
    pdfPath: require('../assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок.pdf'),
    previewImagePath: require('../assets/pdfs/preview/pregnancy_a5_preview.png'),
  },
];

export default function SelectInteriorScreen() {
  const { celebration, coverType } = useLocalSearchParams<{
    celebration: string;
    coverType: string;
  }>();
  const [selectedInterior, setSelectedInterior] = useState<string | null>(null);
  const containerOpacity = useSharedValue(0);

  React.useEffect(() => {
    containerOpacity.value = withTiming(1, { duration: 400 });
  }, []);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const handleInteriorSelect = (interiorId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedInterior(interiorId);
  };

  const handleContinue = () => {
    if (selectedInterior && celebration && coverType) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      router.push({
        pathname: '/edit-album',
        params: {
          celebration,
          coverType,
          interiorType: selectedInterior,
        },
      });
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const selectedInteriorData = INTERIOR_OPTIONS.find(i => i.id === selectedInterior);

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
            <Text style={styles.title}>Выберите внутреннюю часть</Text>
            <Text style={styles.subtitle}>
              Выберите вариант оформления страниц
            </Text>
          </View>
        </View>

        {/* Список вариантов внутренней части */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {INTERIOR_OPTIONS.map((interior) => (
            <TouchableOpacity
              key={interior.id}
              style={[
                styles.interiorCard,
                selectedInterior === interior.id && styles.interiorCardSelected,
              ]}
              onPress={() => handleInteriorSelect(interior.id)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.cardGradient,
                  selectedInterior === interior.id && styles.cardGradientSelected,
                ]}
              >
                <View style={styles.cardContent}>
                  {/* Превью изображения */}
                  <View style={styles.previewContainer}>
                    <Image
                      source={interior.previewImagePath}
                      style={styles.previewImage}
                      contentFit="cover"
                      priority={INTERIOR_OPTIONS.indexOf(interior) < 2 ? "high" : "normal"}
                      cachePolicy="disk"
                      transition={0}
                      fadeDuration={0}
                    />
                    {selectedInterior === interior.id && (
                      <View style={styles.selectedOverlay}>
                        <Ionicons name="checkmark-circle" size={32} color="#FFFFFF" />
                      </View>
                    )}
                  </View>

                  <View style={styles.cardTextContainer}>
                    <Text
                      style={[
                        styles.cardTitle,
                        selectedInterior === interior.id && styles.cardTitleSelected,
                      ]}
                    >
                      {interior.title}
                    </Text>
                    <Text
                      style={[
                        styles.cardDescription,
                        selectedInterior === interior.id && styles.cardDescriptionSelected,
                      ]}
                    >
                      {interior.description}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Кнопка продолжения */}
        {selectedInterior && (
          <View style={styles.continueContainer}>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
              activeOpacity={0.8}
            >
              <View style={styles.continueButtonContent}>
                <Text style={styles.continueButtonText}>
                  Продолжить
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </View>
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
  interiorCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  interiorCardSelected: {
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    transform: [{ scale: 1.02 }],
  },
  cardGradient: {
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  cardGradientSelected: {
    backgroundColor: '#8B6F5F',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewContainer: {
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 16,
    backgroundColor: '#FAF8F5',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
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
  continueButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 12,
    backgroundColor: '#8B6F5F',
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

