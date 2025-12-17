import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
  Share,
  Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAlbumImageUris, getAlbumPageCount } from '@/utils/albumImages';
import { Annotation } from '@/components/pdf-annotations';
import { getCoverForExport } from '@/utils/coverMapping';
import { getCoverPdfForExport } from '@/utils/coverPdfMapping';
import { Asset } from 'expo-asset';

interface FormatOption {
  id: string;
  name: string;
  type: 'hard' | 'soft';
  margins: string;
  size: string;
  orientation: string;
  description: string;
}

const formatOptions: FormatOption[] = [
  {
    id: 'hard',
    name: 'Для печати в твёрдой обложке',
    type: 'hard',
    margins: '15 мм',
    size: 'A4 (210 × 297 мм)',
    orientation: 'Вертикальная',
    description: 'Идеально для подарка и долгого хранения',
  },
  {
    id: 'soft',
    name: 'Для печати в мягкой обложке',
    type: 'soft',
    margins: '10 мм',
    size: 'A5 (148 × 210 мм)',
    orientation: 'Вертикальная',
    description: 'Компактный и удобный формат',
  },
];

export default function ExportPdfScreen() {
  const params = useLocalSearchParams();
  const projectId = params.id as string;
  
  const [selectedFormat, setSelectedFormat] = useState<FormatOption | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const opacity = useSharedValue(0);
  const loadingRotation = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
  }, []);

  useEffect(() => {
    if (isGenerating) {
      loadingRotation.value = withRepeat(
        withSequence(
          withTiming(360, { duration: 1000 }),
          withTiming(0, { duration: 0 })
        ),
        -1,
        false
      );
    }
  }, [isGenerating]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const loadingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${loadingRotation.value}deg` }],
  }));

  const handleCreatePdf = async () => {
    if (!selectedFormat) return;

    setIsGenerating(true);
    setShowPreview(false);

    try {
      let albumId: string | null = null;
      let projectCategory: string | null = null;
      let images: string[] = [];
      let annotations: Annotation[] = [];
      let coverImage: any = null;
      let coverPdf: any = null;

      // Если есть projectId, пытаемся загрузить данные проекта
      if (projectId) {
        const projectData = await AsyncStorage.getItem(`@project_${projectId}`);
        if (projectData) {
          const project = JSON.parse(projectData);
          albumId = project.albumId || projectId;
          projectCategory = project.category || null;

          // Получаем PDF обложку для экспорта (приоритет для беременности)
          if (projectCategory === 'pregnancy') {
            coverPdf = getCoverPdfForExport(albumId, projectCategory);
          }
          
          // Если PDF обложка не найдена, используем изображение обложки
          if (!coverPdf) {
            coverImage = getCoverForExport(albumId, projectCategory);
          }

          // Загружаем изображения - сначала проверяем сохраненные изменения
          const savedImages = await AsyncStorage.getItem(`@project_images_${projectId}`);
          if (savedImages) {
            images = JSON.parse(savedImages);
          } else {
            // Если нет сохраненных изменений, загружаем оригинальные изображения
            images = await getAlbumImageUris(albumId);
          }

          // Загружаем аннотации
          const annotationsData = await AsyncStorage.getItem(`@project_annotations_${projectId}`);
          if (annotationsData) {
            annotations = JSON.parse(annotationsData);
          }
        }
      }

      // Если проект не найден или нет projectId, используем значения по умолчанию
      if (!albumId) {
        albumId = 'pregnancy_60'; // Значение по умолчанию
        projectCategory = 'pregnancy';
      }

      // Если обложка еще не получена, пытаемся получить по albumId
      if (!coverPdf && !coverImage && albumId) {
        if (projectCategory === 'pregnancy') {
          coverPdf = getCoverPdfForExport(albumId, projectCategory);
        }
        if (!coverPdf) {
          coverImage = getCoverForExport(albumId, projectCategory);
        }
      }

      if (images.length === 0) {
        images = await getAlbumImageUris(albumId);
      }
      
      if (images.length === 0) {
        throw new Error('Изображения не найдены');
      }

      // Определяем размеры страницы
      const isA5 = selectedFormat.type === 'soft';
      const pageWidth = isA5 ? 420 : 595; // A5: 148mm = 420pt, A4: 210mm = 595pt
      const pageHeight = isA5 ? 595 : 842; // A5: 210mm = 595pt, A4: 297mm = 842pt
      const margin = selectedFormat.type === 'hard' ? 42.5 : 28.3; // 15mm = 42.5pt, 10mm = 28.3pt
      const contentWidth = pageWidth - (margin * 2);
      const contentHeight = pageHeight - (margin * 2);

      // Функция для конвертации изображения в base64 с обработкой ошибок
      const convertImageToBase64 = async (uri: string, imageIndex: number): Promise<string | null> => {
        try {
          console.log(`[PDF Export] Обработка изображения ${imageIndex + 1}: ${uri.substring(0, 50)}...`);
          
          if (uri.startsWith('data:')) {
            return uri; // Уже в формате base64
          }
          
          if (uri.startsWith('file://')) {
            const base64 = await FileSystem.readAsStringAsync(uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            return `data:image/png;base64,${base64}`;
          }
          
          if (uri.startsWith('http://') || uri.startsWith('https://')) {
            // Для веб-версии используем fetch
            if (Platform.OS === 'web') {
              const response = await fetch(uri);
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              const blob = await response.blob();
              return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  if (typeof reader.result === 'string') {
                    resolve(reader.result);
                  } else {
                    reject(new Error('Failed to convert image'));
                  }
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            } else {
              // Для мобильных устройств загружаем через FileSystem
              const tempFileName = `temp_${Date.now()}_${imageIndex}.png`;
              const tempPath = FileSystem.cacheDirectory + tempFileName;
              
              const downloadResult = await FileSystem.downloadAsync(uri, tempPath);
              
              if (!downloadResult.uri) {
                throw new Error('Download failed: no URI returned');
              }
              
              const base64 = await FileSystem.readAsStringAsync(downloadResult.uri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              
              // Очищаем временный файл после использования
              try {
                const fileInfo = await FileSystem.getInfoAsync(tempPath);
                if (fileInfo.exists) {
                  await FileSystem.deleteAsync(tempPath, { idempotent: true });
                }
              } catch (cleanupError) {
                console.warn(`[PDF Export] Не удалось удалить временный файл ${tempPath}:`, cleanupError);
              }
              
              return `data:image/png;base64,${base64}`;
            }
          }
          
          // Пытаемся прочитать как локальный файл
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          return `data:image/png;base64,${base64}`;
        } catch (error) {
          console.error(`[PDF Export] Ошибка при конвертации изображения ${imageIndex + 1}:`, error);
          return null; // Возвращаем null для пропуска проблемного изображения
        }
      };

      // Функция для конвертации require() модуля в base64
      const convertRequireImageToBase64 = async (imageModule: any, imageIndex: number): Promise<string | null> => {
        try {
          if (typeof imageModule === 'number') {
            // Это require() модуль, используем Asset API
            const asset = Asset.fromModule(imageModule);
            await asset.downloadAsync();
            
            if (asset.localUri) {
              return await convertImageToBase64(asset.localUri, imageIndex);
            } else if (asset.uri) {
              return await convertImageToBase64(asset.uri, imageIndex);
            }
          } else if (typeof imageModule === 'string') {
            // Это строка URI
            return await convertImageToBase64(imageModule, imageIndex);
          }
          
          return null;
        } catch (error) {
          console.error(`[PDF Export] Ошибка при конвертации require() изображения:`, error);
          return null;
        }
      };

      // Функция для конвертации PDF обложки в base64 изображение
      // Для expo-print лучше всего конвертировать первую страницу PDF в изображение
      // Но так как это сложно без нативных модулей, используем PDF напрямую через data URI
      const convertPdfCoverToBase64 = async (pdfModule: any): Promise<string | null> => {
        try {
          if (!pdfModule) return null;
          
          // Загружаем PDF через Asset API
          const asset = Asset.fromModule(pdfModule);
          await asset.downloadAsync();
          
          const pdfUri = asset.localUri || asset.uri;
          if (!pdfUri) return null;
          
          // Читаем PDF файл как base64
          const pdfBytes = await FileSystem.readAsStringAsync(pdfUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          // Возвращаем data URI для PDF
          // expo-print может использовать это через embed или iframe
          return `data:application/pdf;base64,${pdfBytes}`;
        } catch (error) {
          console.error(`[PDF Export] Ошибка при конвертации PDF обложки:`, error);
          return null;
        }
      };

      // Создаем HTML для PDF с изображениями и аннотациями
      // Обрабатываем изображения последовательно для оптимизации памяти
      let htmlPages = '';
      let processedCount = 0;
      let skippedCount = 0;
      const totalImages = images.length;
      const hasCover = coverPdf !== null || coverImage !== null;
      const totalPages = totalImages + (hasCover ? 1 : 0);
      
      setGenerationProgress({ current: 0, total: totalPages });
      console.log(`[PDF Export] Начало обработки ${totalPages} страниц (${totalImages} изображений + ${hasCover ? '1 обложка' : '0 обложек'})...`);

      // Добавляем обложку в начало, если она есть (только для беременности)
      if (hasCover && projectCategory === 'pregnancy') {
        try {
          console.log(`[PDF Export] Обработка обложки...`);
          setGenerationProgress({ current: 1, total: totalPages });
          
          let coverSrc: string | null = null;
          
          // Приоритет: сначала пытаемся использовать PDF обложку
          if (coverPdf) {
            console.log(`[PDF Export] Использование PDF обложки...`);
            coverSrc = await convertPdfCoverToBase64(coverPdf);
            
            if (coverSrc) {
              // Создаем HTML для PDF обложки
              // Используем object для вставки PDF (expo-print поддерживает это)
              // Если object не работает, можно использовать iframe как fallback
              const coverHtml = `
                <div class="page" style="width: ${pageWidth}pt; height: ${pageHeight}pt; position: relative; margin: 0; background: #FFFFFF; overflow: hidden; page-break-after: always;">
                  <object data="${coverSrc}#page=1" type="application/pdf" style="width: 100%; height: 100%; border: none; display: block;">
                    <iframe src="${coverSrc}#page=1" style="width: 100%; height: 100%; border: none; display: block;" type="application/pdf"></iframe>
                  </object>
                </div>
              `;
              htmlPages += coverHtml;
              processedCount++;
              console.log(`[PDF Export] PDF обложка добавлена (${pageWidth}x${pageHeight}pt)`);
            } else {
              console.warn(`[PDF Export] Не удалось загрузить PDF обложку, пробуем изображение...`);
            }
          }
          
          // Если PDF обложка не загрузилась, используем изображение обложки
          if (!coverSrc && coverImage) {
            console.log(`[PDF Export] Использование изображения обложки...`);
            coverSrc = await convertRequireImageToBase64(coverImage, -1);
            
            if (coverSrc) {
              // Создаем HTML для обложки (полная страница без полей)
              const coverHtml = `
                <div class="page" style="width: ${pageWidth}pt; height: ${pageHeight}pt; position: relative; margin: 0; background: #FFFFFF; overflow: hidden;">
                  <img src="${coverSrc}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
                </div>
              `;
              htmlPages += coverHtml;
              processedCount++;
              console.log(`[PDF Export] Обложка-изображение добавлена (${pageWidth}x${pageHeight}pt)`);
            } else {
              console.warn(`[PDF Export] Не удалось загрузить обложку`);
              skippedCount++;
            }
          } else if (!coverSrc) {
            console.warn(`[PDF Export] Не удалось загрузить обложку`);
            skippedCount++;
          }
        } catch (coverError) {
          console.error(`[PDF Export] Ошибка при обработке обложки:`, coverError);
          skippedCount++;
        }
      }

      // Обрабатываем страницы альбома
      for (let pageIndex = 0; pageIndex < images.length; pageIndex++) {
        const pageNumber = pageIndex + 1;
        const imageUri = images[pageIndex];
        
        try {
          // Обновляем прогресс (учитываем обложку)
          const currentPageNumber = hasCover ? pageIndex + 2 : pageIndex + 1;
          setGenerationProgress({ current: currentPageNumber, total: totalPages });
          console.log(`[PDF Export] Обработка страницы ${pageNumber}/${totalImages}...`);
          
          // Конвертируем изображение страницы в base64
          const imageSrc = await convertImageToBase64(imageUri, pageIndex);
          
          // Пропускаем страницу, если изображение не удалось загрузить
          if (!imageSrc) {
            console.warn(`[PDF Export] Пропуск страницы ${pageNumber}: не удалось загрузить изображение`);
            skippedCount++;
            continue;
          }

          // Фильтруем аннотации для текущей страницы
          const pageAnnotations = annotations.filter(ann => (ann.page || 1) === pageNumber);

          // Создаем HTML для страницы
          let pageHtml = `
            <div class="page" style="width: ${pageWidth}pt; height: ${pageHeight}pt; position: relative; margin: ${margin}pt; background: #FFFFFF;">
              <img src="${imageSrc}" style="width: ${contentWidth}pt; height: auto; max-height: ${contentHeight}pt; object-fit: contain; display: block;" />
          `;

          // Добавляем аннотации (сортируем по zIndex для правильного порядка)
          const sortedAnnotations = [...pageAnnotations].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
          
          for (let annIndex = 0; annIndex < sortedAnnotations.length; annIndex++) {
            const ann = sortedAnnotations[annIndex];
            
            try {
              if (ann.type === 'text' && ann.content) {
                // Текст без фона, как в приложении
                pageHtml += `
                  <div style="position: absolute; left: ${ann.x}pt; top: ${ann.y}pt; width: ${ann.width}pt; min-height: ${ann.height}pt; 
                    color: ${ann.color || '#000000'}; font-size: ${ann.fontSize || 16}pt; 
                    background: transparent; padding: 4pt; 
                    word-wrap: break-word; overflow: visible; white-space: pre-wrap; z-index: ${ann.zIndex || 1};">
                    ${(ann.content || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}
                  </div>
                `;
              } else if (ann.type === 'image' && ann.imageUri) {
                // Конвертируем изображение-аннотацию в base64
                const annotationImageSrc = await convertImageToBase64(ann.imageUri, pageIndex * 1000 + annIndex);
                
                if (annotationImageSrc) {
                  pageHtml += `
                    <img src="${annotationImageSrc}" style="position: absolute; left: ${ann.x}pt; top: ${ann.y}pt; 
                      width: ${ann.width}pt; height: ${ann.height}pt; border-radius: 6pt; 
                      border: 2pt solid #C9A89A; object-fit: cover; z-index: ${ann.zIndex || 1};" />
                  `;
                } else {
                  console.warn(`[PDF Export] Пропуск аннотации-изображения на странице ${pageNumber}`);
                }
              }
            } catch (annError) {
              console.error(`[PDF Export] Ошибка при обработке аннотации ${annIndex} на странице ${pageNumber}:`, annError);
              // Продолжаем обработку остальных аннотаций
            }
          }

          pageHtml += `</div>`;
          htmlPages += pageHtml;
          processedCount++;
          
          // Освобождаем память: очищаем ссылку на base64 строку после добавления в HTML
          // (в JavaScript это происходит автоматически, но явно указываем намерение)
          
        } catch (pageError) {
          console.error(`[PDF Export] Ошибка при обработке страницы ${pageNumber}:`, pageError);
          skippedCount++;
          // Продолжаем обработку следующих страниц
        }
      }
      
      console.log(`[PDF Export] Обработка завершена: ${processedCount} страниц обработано, ${skippedCount} пропущено`);
      
      if (processedCount === 0) {
        throw new Error('Не удалось обработать ни одного изображения');
      }
      
      if (skippedCount > 0) {
        Alert.alert(
          'Предупреждение',
          `Обработано ${processedCount} из ${totalPages} страниц. ${skippedCount} страниц пропущено из-за ошибок.`
        );
      }

      console.log(`[PDF Export] Генерация HTML (${htmlPages.length} символов)...`);
      
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                margin: 0;
                padding: 0;
                font-family: 'Arial', sans-serif;
              }
              .page {
                page-break-after: always;
                page-break-inside: avoid;
              }
              .page:last-child {
                page-break-after: auto;
              }
            </style>
          </head>
          <body>
            ${htmlPages}
          </body>
        </html>
      `;

      console.log(`[PDF Export] Создание PDF файла...`);
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
        width: pageWidth,
        height: pageHeight,
      });
      
      console.log(`[PDF Export] PDF успешно создан: ${uri}`);

      setPdfUri(uri);
      setShowPreview(true);
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Ошибка', 'Не удалось создать PDF файл. ' + (error as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!pdfUri) return;

    try {
      const fileName = `project_${projectId}_${Date.now()}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      // Используем legacy API для совместимости
      await FileSystem.copyAsync({
        from: pdfUri,
        to: fileUri,
      });

      Alert.alert('Успешно', `Файл сохранён: ${fileName}`);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить файл');
    }
  };

  const handleShare = async () => {
    if (!pdfUri) return;

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(pdfUri);
      } else {
        Alert.alert('Недоступно', 'Функция отправки недоступна на этом устройстве');
      }
    } catch (error) {
      console.error('Error sharing PDF:', error);
      Alert.alert('Ошибка', 'Не удалось отправить файл');
    }
  };

  const handleEmail = () => {
    if (!pdfUri) return;
    
    // В реальном приложении можно использовать expo-mail-composer
    Alert.alert(
      'Отправка по email',
      'Прикрепите файл к письму и отправьте его',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Открыть почту', onPress: () => Linking.openURL('mailto:') },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Animated.View style={[styles.content, animatedStyle]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#8B6F5F" />
          </TouchableOpacity>
          <Text style={styles.title}>Экспорт в PDF</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {!showPreview ? (
            <>
              {/* Выбор формата */}
              <Text style={styles.sectionTitle}>Выберите формат печати</Text>
              
              {formatOptions.map((format) => (
                <TouchableOpacity
                  key={format.id}
                  style={[
                    styles.formatCard,
                    selectedFormat?.id === format.id && styles.formatCardSelected,
                  ]}
                  onPress={() => setSelectedFormat(format)}
                  activeOpacity={0.85}
                >
                  <View style={styles.formatHeader}>
                    <View
                      style={[
                        styles.formatIcon,
                        selectedFormat?.id === format.id && styles.formatIconSelected,
                      ]}
                    >
                      <Ionicons
                        name={format.type === 'hard' ? 'book' : 'book-outline'}
                        size={32}
                        color={selectedFormat?.id === format.id ? '#FFFFFF' : '#C9A89A'}
                      />
                    </View>
                    <View style={styles.formatInfo}>
                      <Text
                        style={[
                          styles.formatName,
                          selectedFormat?.id === format.id && styles.formatNameSelected,
                        ]}
                      >
                        {format.name}
                      </Text>
                      <Text style={styles.formatDescription}>{format.description}</Text>
                    </View>
                    {selectedFormat?.id === format.id && (
                      <View style={styles.checkIcon}>
                        <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                      </View>
                    )}
                  </View>

                  <View style={styles.formatSpecs}>
                    <View style={styles.specItem}>
                      <Ionicons name="square-outline" size={16} color="#9B8E7F" />
                      <Text style={styles.specText}>{format.size}</Text>
                    </View>
                    <View style={styles.specItem}>
                      <Ionicons name="resize-outline" size={16} color="#9B8E7F" />
                      <Text style={styles.specText}>Поля: {format.margins}</Text>
                    </View>
                    <View style={styles.specItem}>
                      <Ionicons name="phone-portrait-outline" size={16} color="#9B8E7F" />
                      <Text style={styles.specText}>{format.orientation}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}

              {/* Кнопка создания PDF */}
              <TouchableOpacity
                style={[
                  styles.createButton,
                  (!selectedFormat || isGenerating) && styles.createButtonDisabled,
                ]}
                onPress={handleCreatePdf}
                disabled={!selectedFormat || isGenerating}
                activeOpacity={0.7}
              >
                {isGenerating ? (
                  <View style={styles.loadingContainer}>
                    <Animated.View style={loadingAnimatedStyle}>
                      <Ionicons name="refresh" size={24} color="#FFFFFF" />
                    </Animated.View>
                    <View style={styles.progressContainer}>
                      <Text style={styles.createButtonText}>
                        Создание PDF... {generationProgress.total > 0 && `${generationProgress.current}/${generationProgress.total}`}
                      </Text>
                      {generationProgress.total > 0 && (
                        <View style={styles.progressBar}>
                          <View 
                            style={[
                              styles.progressBarFill, 
                              { width: `${(generationProgress.current / generationProgress.total) * 100}%` }
                            ]} 
                          />
                        </View>
                      )}
                    </View>
                  </View>
                ) : (
                  <>
                    <Ionicons name="document-text-outline" size={24} color="#FFFFFF" />
                    <Text style={styles.createButtonText}>Создать PDF</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Превью готового PDF */}
              <View style={styles.previewContainer}>
                <View style={styles.previewIcon}>
                  <Ionicons name="document-text" size={64} color="#C9A89A" />
                </View>
                <Text style={styles.previewTitle}>PDF готов!</Text>
                <Text style={styles.previewSubtitle}>
                  Ваш файл подготовлен к печати
                </Text>
              </View>

              {/* Действия с PDF */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleDownload}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionIcon}>
                    <Ionicons name="download-outline" size={28} color="#C9A89A" />
                  </View>
                  <Text style={styles.actionText}>Скачать</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleShare}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionIcon}>
                    <Ionicons name="mail-outline" size={28} color="#C9A89A" />
                  </View>
                  <Text style={styles.actionText}>Отправить</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleEmail}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionIcon}>
                    <Ionicons name="print-outline" size={28} color="#C9A89A" />
                  </View>
                  <Text style={styles.actionText}>Печать</Text>
                </TouchableOpacity>
              </View>

              {/* Подсказка */}
              <View style={styles.hintContainer}>
                <Ionicons name="information-circle-outline" size={20} color="#9B8E7F" />
                <Text style={styles.hintText}>
                  Этот файл готов к печати в любом салоне. Просто передайте его оператору
                </Text>
              </View>
            </>
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
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '500',
    marginBottom: 20,
  },
  formatCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 26,
    marginBottom: 18,
    borderWidth: 2,
    borderColor: '#F0E8E0',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  formatCardSelected: {
    borderColor: '#C9A89A',
    backgroundColor: '#FAF8F5',
  },
  formatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  formatIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  formatIconSelected: {
    backgroundColor: '#C9A89A',
  },
  formatInfo: {
    flex: 1,
  },
  formatName: {
    fontSize: 18,
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
  formatNameSelected: {
    color: '#8B6F5F',
  },
  formatDescription: {
    fontSize: 14,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
  },
  checkIcon: {
    marginLeft: 8,
  },
  formatSpecs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0E8E0',
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  specText: {
    fontSize: 13,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '300',
  },
  createButton: {
    backgroundColor: '#C9A89A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 36,
    borderRadius: 18,
    marginTop: 12,
    gap: 14,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 5,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  progressContainer: {
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  previewContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  previewIcon: {
    marginBottom: 24,
  },
  previewTitle: {
    fontSize: 24,
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
  previewSubtitle: {
    fontSize: 16,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    textAlign: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 32,
    marginBottom: 24,
  },
  actionButton: {
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  actionText: {
    fontSize: 14,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '500',
  },
  hintContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#F0E8E0',
  },
  hintText: {
    flex: 1,
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

