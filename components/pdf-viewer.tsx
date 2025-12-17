import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import PdfAnnotations, { type Annotation } from './pdf-annotations';
import PdfSkeletonLoader from './pdf-skeleton-loader';

import NativePdfViewer from './pdf-viewer-native';
import WebPdfViewer from './pdf-viewer-web';

interface PdfViewerProps {
  pdfPath: string | number | any;
  albumName?: string;
  onPageChange?: (page: number, totalPages: number) => void;
  onError?: (error: any) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Маппинг PDF файлов для статического require
const PDF_ASSETS = {
  // Основные PDF файлы
  'Блок БЕРЕМЕННОСТЬ 60 стр.pdf': require('../assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр.pdf'),
  'Блок БЕРЕМЕННОСТЬ A5 другой блок.pdf': require('../assets/pdfs/Блок БЕРЕМЕННОСТЬ A5 другой блок.pdf'),
  'Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр.pdf': require('../assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр.pdf'),
  // Preview версии PDF файлов
  'Блок БЕРЕМЕННОСТЬ 60 стр_preview.pdf': require('../assets/pdfs/preview/Блок БЕРЕМЕННОСТЬ 60 стр_preview.pdf'),
  'Блок БЕРЕМЕННОСТЬ A5 другой блок_preview.pdf': require('../assets/pdfs/preview/Блок БЕРЕМЕННОСТЬ A5 другой блок_preview.pdf'),
};

export default function PdfViewer({ pdfPath, albumName, onPageChange, onError }: PdfViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(60);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTool, setCurrentTool] = useState<'text' | 'image' | 'drawing' | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [pdfSource, setPdfSource] = useState<any>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Отладочная информация
  React.useEffect(() => {
    console.log('PdfViewer mounted with pdfPath:', pdfPath);
    console.log('pdfPath type:', typeof pdfPath);
    console.log('Available PDF assets:', Object.keys(PDF_ASSETS));
    
    // Проверяем, есть ли файл в маппинге (только если pdfPath - строка)
    if (typeof pdfPath === 'string') {
      const fileName = pdfPath.split('/').pop() || pdfPath;
      console.log('Extracted filename:', fileName);
      console.log('Is in PDF_ASSETS:', !!PDF_ASSETS[fileName as keyof typeof PDF_ASSETS]);
      
      if (PDF_ASSETS[fileName as keyof typeof PDF_ASSETS]) {
        console.log('PDF asset found:', PDF_ASSETS[fileName as keyof typeof PDF_ASSETS]);
      }
    } else if (typeof pdfPath === 'number') {
      console.log('PDF path is asset ID (number):', pdfPath);
    }
  }, [pdfPath]);

  const handleLoadComplete = () => {
    console.log('PDF load completed successfully');
    setIsLoading(false);
  };

  const handleError = (error: any) => {
    console.error('PDF Error:', error);
    let errorMessage = 'Ошибка загрузки PDF файла';
    
    if (error.message && error.message.includes('file not found')) {
      errorMessage = 'PDF файл не найден. Проверьте путь к файлу.';
    } else if (error.message && error.message.includes('network')) {
      errorMessage = 'Ошибка сети при загрузке PDF.';
    } else if (error.message && error.message.includes('Invalid PDF')) {
      errorMessage = 'Неверный формат PDF файла.';
    } else if (error.message && error.message.includes('Permission denied')) {
      errorMessage = 'Нет доступа к PDF файлу.';
    } else if (error.message && error.message.includes('timeout')) {
      errorMessage = 'Превышено время ожидания загрузки PDF.';
    }
    
    setError(errorMessage);
    setIsLoading(false);
    onError?.(error);
  };


  const handleAnnotationAdd = (annotation: Annotation) => {
    setAnnotations(prev => [...prev, annotation]);
  };

  const handleAnnotationUpdate = (id: string, updates: Partial<Annotation>) => {
    setAnnotations(prev => 
      prev.map(annotation => 
        annotation.id === id ? { ...annotation, ...updates } : annotation
      )
    );
  };

  const handleAnnotationDelete = (id: string) => {
    setAnnotations(prev => prev.filter(annotation => annotation.id !== id));
  };

  const handleOpenInExternalApp = async () => {
    try {
      const fileName = typeof pdfPath === 'string' ? pdfPath.split('/').pop() || pdfPath : String(pdfPath);
      if (fileName && PDF_ASSETS[fileName as keyof typeof PDF_ASSETS]) {
        // Для локальных файлов показываем сообщение
        Alert.alert(
          'Открыть PDF',
          'PDF файл готов к просмотру. Для полного функционала используйте веб-версию приложения.',
          [
            { text: 'OK', style: 'default' }
          ]
        );
      } else {
        // Для URL файлов пытаемся открыть в браузере
        const url = getPdfUrl();
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          Alert.alert('Ошибка', 'Не удалось открыть PDF файл');
        }
      }
    } catch (error) {
      console.error('Error opening PDF:', error);
      Alert.alert('Ошибка', 'Не удалось открыть PDF файл');
    }
  };

  // Функция для проверки существования PDF файла
  const checkPdfExists = async (pdfPath: string | number | any): Promise<boolean> => {
    try {
      // Если pdfPath - это число (asset ID), файл существует
      if (typeof pdfPath === 'number') {
        return true;
      }
      
      if (typeof pdfPath !== 'string') {
        return true;
      }
      
      let fileName = pdfPath.split('/').pop() || pdfPath;
      
      // Убираем путь к папке preview из имени файла, если он есть
      if (fileName.includes('/')) {
        fileName = fileName.split('/').pop() || fileName;
      }
      
      // Проверяем, есть ли файл в маппинге assets (основной или preview)
      if (PDF_ASSETS[fileName as keyof typeof PDF_ASSETS]) {
        return true;
      }
      
      // Для других файлов проверяем через FileSystem
      if (Platform.OS !== 'web') {
        const fileInfo = await FileSystem.getInfoAsync(pdfPath);
        return fileInfo.exists;
      }
      
      return true; // Для веб-версии предполагаем, что файл существует
    } catch (error) {
      console.error('Error checking PDF existence:', error);
      return false;
    }
  };

  const getPdfUrl = () => {
    // Если pdfPath - это число (asset ID), возвращаем пустую строку (не используется)
    if (typeof pdfPath === 'number') {
      return '';
    }
    
    if (typeof pdfPath !== 'string') {
      return String(pdfPath);
    }
    
    // Для файлов из assets используем прямой путь
    if (pdfPath.startsWith('./assets/')) {
      return pdfPath.replace('./', '');
    }
    
    // Для других локальных файлов используем file:// протокол
    if (pdfPath.startsWith('./') || pdfPath.startsWith('/')) {
      const cleanPath = pdfPath.replace('./', '');
      return `file://${cleanPath}`;
    }
    
    // Для URL используем как есть
    return pdfPath;
  };

  // Загружаем PDF файл с оптимизациями
  React.useEffect(() => {
    const loadPdf = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Проверяем существование PDF файла
        const fileExists = await checkPdfExists(pdfPath);
        if (!fileExists) {
          handleError(new Error('PDF file not found'));
          return;
        }
        
        let source;
        let fileName: string | null = null;
        
        // Если pdfPath - это число (asset ID), используем его напрямую
        if (typeof pdfPath === 'number') {
          source = pdfPath;
          console.log('Loading PDF from asset ID:', pdfPath);
        } else {
          // Для файлов из assets используем маппинг
          fileName = typeof pdfPath === 'string' ? pdfPath.split('/').pop() || pdfPath : String(pdfPath);
          
          // Убираем путь к папке preview из имени файла, если он есть
          // Например: "preview/Блок БЕРЕМЕННОСТЬ 60 стр_preview.pdf" -> "Блок БЕРЕМЕННОСТЬ 60 стр_preview.pdf"
          if (fileName.includes('/')) {
            fileName = fileName.split('/').pop() || fileName;
          }
          
          // Проверяем наличие файла в маппинге (основной или preview)
          if (fileName && PDF_ASSETS[fileName as keyof typeof PDF_ASSETS]) {
            source = PDF_ASSETS[fileName as keyof typeof PDF_ASSETS];
            console.log('Loading PDF from assets:', fileName);
            console.log('PDF source set to:', source);
            
            // Предзагружаем PDF для быстрого отображения
            if (Platform.OS !== 'web') {
              try {
                // Пытаемся предзагрузить PDF
                const asset = PDF_ASSETS[fileName as keyof typeof PDF_ASSETS];
                if (asset && typeof asset === 'number') {
                  // Это локальный ассет, он уже оптимизирован
                  console.log('PDF asset preloaded');
                }
              } catch (preloadError) {
                console.log('PDF preload failed, continuing with normal load');
              }
            }
          } else {
            // Для других файлов используем URI с оптимизациями
            const pdfUrl = getPdfUrl();
            source = {
              uri: pdfUrl,
              cache: true,
              // Добавляем параметры для ускорения загрузки
              headers: {
                'Cache-Control': 'max-age=31536000', // 1 год кэширования
              },
            };
            console.log('Loading PDF from URI:', source.uri);
          }
        }
        
        console.log('Setting PDF source:', source);
        setPdfSource(source);
        
        // Для локальных assets сразу сбрасываем loading, так как они загружаются мгновенно
        if (typeof pdfPath === 'number' || (typeof pdfPath === 'string' && fileName && PDF_ASSETS[fileName as keyof typeof PDF_ASSETS])) {
          console.log('Local asset detected, setting loading to false');
          setTimeout(() => {
            setIsLoading(false);
          }, 100); // Небольшая задержка для рендера
        }
        
        // Добавляем таймаут для загрузки PDF
        const loadTimeout = setTimeout(() => {
          if (isLoading) {
            console.warn('PDF loading timeout, forcing load complete');
            setIsLoading(false);
          }
        }, 10000); // 10 секунд таймаут
        
        // Очищаем таймаут при успешной загрузке
        const originalHandleLoadComplete = handleLoadComplete;
        const wrappedHandleLoadComplete = () => {
          clearTimeout(loadTimeout);
          originalHandleLoadComplete();
        };
        
        // Сохраняем обернутую функцию для использования
        (window as any).wrappedHandleLoadComplete = wrappedHandleLoadComplete;
        
      } catch (err) {
        console.error('Error loading PDF:', err);
        handleError(err);
      }
    };
    
    if (pdfPath) {
      loadPdf();
    }
  }, [pdfPath]);

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="document-outline" size={64} color="#FF6B6B" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => setError(null)}>
          <Text style={styles.retryButtonText}>Попробовать снова</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Отладочная информация для рендера
  console.log('PdfViewer render - isLoading:', isLoading, 'pdfSource:', !!pdfSource, 'error:', error, 'pdfPath:', pdfPath);

  return (
    <View style={styles.container}>
      {/* PDF Viewer */}
      <View style={styles.pdfContainer}>
        {isLoading ? (
          <PdfSkeletonLoader />
        ) : pdfSource ? (
          <View style={styles.pdfContainer}>
            {/* PDF компонент с поддержкой веб и мобильных платформ */}
            <View style={styles.pdfWrapper}>
              {Platform.OS === 'web' ? (
                // Веб-версия PDF viewer
                <WebPdfViewer
                  pdfPath={pdfPath}
                  albumName={albumName}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  isEditing={isEditing}
                  currentTool={currentTool}
                  annotations={annotations}
                  onAnnotationAdd={handleAnnotationAdd}
                  onAnnotationUpdate={handleAnnotationUpdate}
                  onAnnotationDelete={handleAnnotationDelete}
                />
              ) : (
                // Мобильная версия без нативных модулей
                <>
                  <NativePdfViewer
                    source={pdfSource}
                    style={styles.pdf}
                    onLoadComplete={(numberOfPages, filePath) => {
                      console.log(`PDF loaded: ${numberOfPages} pages`);
                      setTotalPages(numberOfPages);
                      handleLoadComplete();
                    }}
                    onPageChanged={(page, numberOfPages) => {
                      console.log(`Current page: ${page}`);
                      setCurrentPage(page);
                      onPageChange?.(page, numberOfPages);
                    }}
                    onError={(error) => {
                      console.error('PDF Error:', error);
                      handleError(error);
                    }}
                    onPressBlank={(event) => {
                      if (isEditing && currentTool === 'text') {
                        const { locationX, locationY } = event;
                        handleAnnotationAdd({
                          id: Date.now().toString(),
                          type: 'text',
                          x: locationX - 100,
                          y: locationY - 20,
                          width: 200,
                          height: 40,
                          content: 'Новый текст',
                          color: '#000000',
                          fontSize: 16,
                          zIndex: annotations.length + 1,
                        });
                      }
                    }}
                    enablePaging={true}
                    enableRTL={false}
                    enableAntialiasing={true}
                    enableAnnotationRendering={true}
                    password=""
                    spacing={0}
                    minScale={1.0}
                    maxScale={3.0}
                    scale={1.2}
                    horizontal={false}
                    page={1}
                    onLoadProgress={(percent) => {
                      console.log(`PDF loading progress: ${percent}%`);
                      setLoadingProgress(percent);
                    }}
                    enableDoubleTapZoom={true}
                    enableSingleTapZoom={true}
                    enableSwipe={true}
                    swipeHorizontal={false}
                  />

                  {/* Аннотации поверх PDF */}
                  <PdfAnnotations
                    annotations={annotations}
                    onAnnotationAdd={handleAnnotationAdd}
                    onAnnotationUpdate={handleAnnotationUpdate}
                    onAnnotationDelete={handleAnnotationDelete}
                    isEditing={isEditing}
                    currentTool={currentTool}
                  />
                </>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.pdfPlaceholder}>
            <View style={styles.pdfBadge}>
              <Ionicons name="document-text-outline" size={48} color="#4A90E2" />
            </View>
            <Text style={styles.pdfPlaceholderText}>
              PDF не найден
            </Text>
            <View style={styles.pdfInfoBox}>
              <Text style={styles.pdfPageInfo}>
                Проверьте путь к файлу: {pdfPath}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.openButton}
              onPress={handleOpenInExternalApp}
              activeOpacity={0.7}
            >
              <Ionicons name="open-outline" size={20} color="#FFFFFF" />
              <Text style={styles.openButtonText}>Открыть PDF</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  pdfContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#FAF8F5',
  },
  pdfSubtitle: {
    fontSize: 14,
    color: '#9B8E7F',
    fontWeight: '500',
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0E8E0',
  },
  pdfWrapper: {
    flex: 1,
    position: 'relative',
    margin: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F5F0EB',
  },
  pdf: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  pdfPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  pdfBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  pdfPlaceholderText: {
    fontSize: 20,
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
  },
  pdfPageInfo: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  pdfDescription: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    zIndex: 1,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    fontWeight: '400',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F5F0EB',
  },
  errorText: {
    fontSize: 15,
    color: '#9B8E7F',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    fontWeight: '400',
    lineHeight: 22,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C9A89A',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  // Веб-версия стили
  webPdfContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  webPdfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FAF8F5',
    borderBottomWidth: 2,
    borderBottomColor: '#F0E8E0',
  },
  webPdfTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B6F5F',
    marginLeft: 12,
    fontFamily: 'Georgia',
    fontStyle: 'italic',
  },
  webPdfContent: {
    flex: 1,
    padding: 20,
  },
  webPdfPage: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webPdfPageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B6F5F',
    marginBottom: 20,
  },
  webPdfPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  webPdfPlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B6F5F',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  webPdfDescription: {
    fontSize: 14,
    color: '#9B8E7F',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    maxWidth: 300,
  },
  webPdfInfo: {
    backgroundColor: '#E8F4FD',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C9A89A',
    marginTop: 16,
  },
  webPdfInfoText: {
    fontSize: 14,
    color: '#8B6F5F',
    textAlign: 'center',
    fontWeight: '500',
  },
  // Стили для индикатора прогресса
  progressContainer: {
    marginTop: 16,
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '80%',
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 2,
  },
  progressText: {
    marginTop: 8,
    fontSize: 12,
    color: '#8B6F5F',
    fontWeight: '500',
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  openButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
