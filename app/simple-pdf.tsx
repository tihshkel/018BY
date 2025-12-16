import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SimplePdfScreen() {
  const [isLoading, setIsLoading] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleOpenPdf = async () => {
    try {
      setIsLoading(true);
      
      // Получаем URI файла из assets
      const pdfUri = FileSystem.documentDirectory + 'Блок БЕРЕМЕННОСТЬ 60 стр.pdf';
      
      // Копируем файл из assets в документы
      const assetUri = require('@/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр.pdf');
      
      // Для тестирования показываем информацию о файле
      Alert.alert(
        'PDF Информация',
        `Файл найден в assets: ${!!assetUri}\nПуть: ${pdfUri}`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Пытаемся открыть файл
              if (Platform.OS === 'web') {
                // Для веб-версии открываем в новой вкладке
                window.open('/assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр.pdf', '_blank');
              } else {
                // Для мобильных устройств используем Sharing
                Sharing.shareAsync(assetUri).catch(console.error);
              }
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('Error opening PDF:', error);
      Alert.alert('Ошибка', 'Не удалось открыть PDF файл');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewPdfInfo = () => {
    Alert.alert(
      'Информация о PDF',
      'Файл: Блок БЕРЕМЕННОСТЬ 60 стр.pdf\nСтраниц: 60\nРазмер: ~2.5 MB\nФормат: PDF 1.4',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#8B6F5F" />
        </TouchableOpacity>
        <Text style={styles.title}>PDF Просмотр</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* PDF Preview Card */}
        <View style={styles.pdfCard}>
          <View style={styles.pdfPreview}>
            <Image
              source={require('@/assets/images/albums/DB1_0.png')}
              style={styles.pdfImage}
              contentFit="cover"
              priority="high"
              cachePolicy="disk"
              transition={0}
              fadeDuration={0}
              recyclingKey="pdf-preview"
            />
            <View style={styles.pdfOverlay}>
              <Ionicons name="document-text" size={48} color="#FFFFFF" />
            </View>
          </View>
          
          <View style={styles.pdfInfo}>
            <Text style={styles.pdfTitle}>Блок БЕРЕМЕННОСТЬ 60 стр</Text>
            <Text style={styles.pdfDescription}>
              Альбом для записи воспоминаний о беременности
            </Text>
            <View style={styles.pdfStats}>
              <View style={styles.statItem}>
                <Ionicons name="document-outline" size={16} color="#8B6F5F" />
                <Text style={styles.statText}>60 страниц</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="images-outline" size={16} color="#8B6F5F" />
                <Text style={styles.statText}>Фото места</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="create-outline" size={16} color="#8B6F5F" />
                <Text style={styles.statText}>Редактируемый</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={handleOpenPdf}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={isLoading ? "hourglass-outline" : "open-outline"} 
              size={24} 
              color="#FFFFFF" 
            />
            <Text style={styles.actionButtonText}>
              {isLoading ? 'Загрузка...' : 'Открыть PDF'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={handleViewPdfInfo}
            activeOpacity={0.8}
          >
            <Ionicons name="information-circle-outline" size={24} color="#8B6F5F" />
            <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
              Информация
            </Text>
          </TouchableOpacity>
        </View>

        {/* Features List */}
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Возможности альбома:</Text>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.featureText}>60 страниц для записи воспоминаний</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.featureText}>Места для фотографий</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.featureText}>Редактируемые поля</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.featureText}>Красивый дизайн</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#F0E8E0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 18,
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
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  pdfCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  pdfPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  pdfImage: {
    width: '100%',
    height: '100%',
  },
  pdfOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfInfo: {
    alignItems: 'center',
  },
  pdfTitle: {
    fontSize: 20,
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
  pdfDescription: {
    fontSize: 14,
    color: '#9B8E7F',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  pdfStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 12,
    color: '#8B6F5F',
    fontWeight: '500',
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButton: {
    backgroundColor: '#4A90E2',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#F0E8E0',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  secondaryButtonText: {
    color: '#8B6F5F',
  },
  featuresContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  featuresTitle: {
    fontSize: 18,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
    marginBottom: 16,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#8B6F5F',
    flex: 1,
    lineHeight: 20,
  },
});

