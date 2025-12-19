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
  Dimensions,
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
import { getCoverImageUris } from '@/utils/coverImagesLoader';
import { preloadFontsForPdf } from '@/utils/fontLoader';
import { Asset } from 'expo-asset';
import { PDFDocument, rgb } from 'pdf-lib';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

          // Получаем изображение обложки для экспорта
          // ВАЖНО: expo-print не поддерживает встраивание PDF напрямую через embed/iframe
          // Поэтому используем изображение обложки вместо PDF развертки
          // PDF развертки можно использовать только после предварительной конвертации в изображение
          if (projectCategory === 'pregnancy' || projectCategory === 'kids') {
            // Для беременности и детей получаем изображение обложки
            coverImage = getCoverForExport(albumId, projectCategory);
            console.log(`[PDF Export] Получено изображение обложки: albumId=${albumId}, category=${projectCategory}, coverImage=${!!coverImage}`);
            
            // Также получаем PDF развертку для возможной будущей конвертации (пока не используется)
            const coverType = selectedFormat?.type || 'hard';
            coverPdf = getCoverPdfForExport(albumId, projectCategory, coverType);
            console.log(`[PDF Export] PDF развертка получена (для справки): coverPdf=${!!coverPdf}`);
          } else {
            if (albumId) {
              coverImage = getCoverForExport(albumId, projectCategory || undefined);
            }
          }

          // Загружаем изображения - сначала проверяем сохраненные изменения
          const savedImages = await AsyncStorage.getItem(`@project_images_${projectId}`);
          if (savedImages) {
            images = JSON.parse(savedImages);
          } else {
            // Если нет сохраненных изменений, загружаем оригинальные изображения
            if (albumId) {
              images = await getAlbumImageUris(albumId);
            }
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

      // Если PDF развертка обложки еще не получена, пытаемся получить по albumId
      if ((projectCategory === 'pregnancy' || projectCategory === 'kids') && !coverPdf && albumId) {
        const coverType = selectedFormat?.type || 'hard';
        coverPdf = getCoverPdfForExport(albumId, projectCategory, coverType);
        // Если PDF развертка не найдена, используем изображение обложки
        if (!coverPdf) {
          coverImage = getCoverForExport(albumId, projectCategory);
        }
      } else if (!coverImage && albumId) {
        const cover = getCoverForExport(albumId, projectCategory || undefined);
        if (cover) {
          coverImage = cover;
        }
      }

      if (images.length === 0 && albumId) {
        try {
          images = await getAlbumImageUris(albumId);
        } catch (error) {
          console.error(`[PDF Export] Ошибка при загрузке изображений альбома:`, error);
        }
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
              
              // Удаляем временный файл асинхронно в фоне (не ждем завершения для ускорения)
              FileSystem.deleteAsync(tempPath, { idempotent: true }).catch(() => {});
              
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

      // Функция для загрузки PDF развертки обложки как байтов для pdf-lib
      const loadPdfAsBytes = async (pdfModule: any): Promise<Uint8Array | null> => {
        try {
          if (typeof pdfModule === 'number') {
            // Это require() модуль PDF, используем Asset API
            const asset = Asset.fromModule(pdfModule);
            await asset.downloadAsync();
            
            if (asset.localUri) {
              // Читаем PDF как base64 и конвертируем в байты (оптимизированно)
              const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              return base64ToUint8Array(base64);
            } else if (asset.uri) {
              // Если это веб URI, загружаем через fetch
              if (Platform.OS === 'web') {
                const response = await fetch(asset.uri);
                const arrayBuffer = await response.arrayBuffer();
                return new Uint8Array(arrayBuffer);
              } else {
                // Для мобильных устройств скачиваем и читаем
                const tempFileName = `temp_pdf_${Date.now()}.pdf`;
                const tempPath = FileSystem.cacheDirectory + tempFileName;
                const downloadResult = await FileSystem.downloadAsync(asset.uri, tempPath);
                
                if (downloadResult.uri) {
                  const base64 = await FileSystem.readAsStringAsync(downloadResult.uri, {
                    encoding: FileSystem.EncodingType.Base64,
                  });
                  // Удаляем файл асинхронно в фоне (не ждем завершения)
                  FileSystem.deleteAsync(tempPath, { idempotent: true }).catch(() => {});
                  return base64ToUint8Array(base64);
                }
              }
            }
          } else if (typeof pdfModule === 'string') {
            // Это строка URI
            if (pdfModule.startsWith('data:application/pdf;base64,')) {
              const base64 = pdfModule.split(',')[1];
              const binaryString = atob(base64);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              return bytes;
            } else if (pdfModule.startsWith('file://')) {
              const base64 = await FileSystem.readAsStringAsync(pdfModule, {
                encoding: FileSystem.EncodingType.Base64,
              });
              const binaryString = atob(base64);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              return bytes;
            }
          }
          
          return null;
        } catch (error) {
          console.error(`[PDF Export] Ошибка при загрузке PDF:`, error);
          return null;
        }
      };

      // Оптимизированная функция для конвертации base64 в Uint8Array
      const base64ToUint8Array = (base64: string): Uint8Array => {
        // Используем более быстрый метод для больших строк
        if (base64.length > 10000) {
          // Для больших строк используем более эффективный метод
          const binaryString = atob(base64);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          // Используем цикл с блоками для оптимизации
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          return bytes;
        } else {
          // Для маленьких строк используем стандартный метод
          const binaryString = atob(base64);
          return new Uint8Array(binaryString.split('').map(char => char.charCodeAt(0)));
        }
      };

      // Функция для конвертации изображения в байты для pdf-lib (оптимизированная)
      const loadImageAsBytes = async (uri: string): Promise<Uint8Array | null> => {
        try {
          if (uri.startsWith('data:image')) {
            // Извлекаем base64 из data URI
            const base64 = uri.split(',')[1];
            return base64ToUint8Array(base64);
          }
          
          if (uri.startsWith('file://')) {
            const base64 = await FileSystem.readAsStringAsync(uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            return base64ToUint8Array(base64);
          }
          
          if (uri.startsWith('http://') || uri.startsWith('https://')) {
            if (Platform.OS === 'web') {
              const response = await fetch(uri);
              const arrayBuffer = await response.arrayBuffer();
              return new Uint8Array(arrayBuffer);
            } else {
              const tempFileName = `temp_img_${Date.now()}.png`;
              const tempPath = FileSystem.cacheDirectory + tempFileName;
              const downloadResult = await FileSystem.downloadAsync(uri, tempPath);
              
              if (downloadResult.uri) {
                const base64 = await FileSystem.readAsStringAsync(downloadResult.uri, {
                  encoding: FileSystem.EncodingType.Base64,
                });
                // Удаляем файл асинхронно в фоне (не ждем завершения)
                FileSystem.deleteAsync(tempPath, { idempotent: true }).catch(() => {});
                return base64ToUint8Array(base64);
              }
            }
          }
          
          return null;
        } catch (error) {
          console.error(`[PDF Export] Ошибка при загрузке изображения:`, error);
          return null;
        }
      };

      // Функция для конвертации PDF в base64 (для разверток обложек) - оставлена для совместимости
      const convertPdfToBase64 = async (pdfModule: any, imageIndex: number): Promise<string | null> => {
        try {
          if (typeof pdfModule === 'number') {
            // Это require() модуль PDF, используем Asset API
            const asset = Asset.fromModule(pdfModule);
            await asset.downloadAsync();
            
            if (asset.localUri) {
              // Читаем PDF как base64
              const pdfBase64 = await FileSystem.readAsStringAsync(asset.localUri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              // Возвращаем data URI для PDF
              return `data:application/pdf;base64,${pdfBase64}`;
            } else if (asset.uri) {
              // Если это веб URI, загружаем через fetch
              if (Platform.OS === 'web') {
                const response = await fetch(asset.uri);
                const blob = await response.blob();
                return new Promise((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    if (typeof reader.result === 'string') {
                      resolve(reader.result);
                    } else {
                      reject(new Error('Failed to convert PDF'));
                    }
                  };
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });
              } else {
                // Для мобильных устройств скачиваем и читаем
                const tempFileName = `temp_pdf_${Date.now()}_${imageIndex}.pdf`;
                const tempPath = FileSystem.cacheDirectory + tempFileName;
                const downloadResult = await FileSystem.downloadAsync(asset.uri, tempPath);
                
                if (downloadResult.uri) {
                  const pdfBase64 = await FileSystem.readAsStringAsync(downloadResult.uri, {
                    encoding: FileSystem.EncodingType.Base64,
                  });
                  // Очищаем временный файл
                  try {
                    await FileSystem.deleteAsync(tempPath, { idempotent: true });
                  } catch (cleanupError) {
                    console.warn(`[PDF Export] Не удалось удалить временный файл:`, cleanupError);
                  }
                  return `data:application/pdf;base64,${pdfBase64}`;
                }
              }
            }
          } else if (typeof pdfModule === 'string') {
            // Это строка URI
            if (pdfModule.startsWith('data:')) {
              return pdfModule; // Уже в формате data URI
            }
            // Читаем как файл
            const pdfBase64 = await FileSystem.readAsStringAsync(pdfModule, {
              encoding: FileSystem.EncodingType.Base64,
            });
            return `data:application/pdf;base64,${pdfBase64}`;
          }
          
          return null;
        } catch (error) {
          console.error(`[PDF Export] Ошибка при конвертации PDF:`, error);
          return null;
        }
      };

      // Используем pdf-lib для создания PDF с разверткой обложки из папки albums
      // Создаем новый PDF документ
      const pdfDoc = await PDFDocument.create();
      let processedCount = 0;
      let skippedCount = 0;
      const totalImages = images.length;
      const hasCover = coverPdf !== null;
      const totalPages = totalImages + (hasCover ? 1 : 0);
      
      setGenerationProgress({ current: 0, total: totalPages });
      console.log(`[PDF Export] Начало обработки ${totalPages} страниц (${totalImages} изображений + ${hasCover ? '1 развертка обложки' : '0 обложек'})...`);
      console.log(`[PDF Export] Параметры: albumId=${albumId}, projectCategory=${projectCategory}, hasCover=${hasCover}, coverPdf=${!!coverPdf}`);

      // Предзагружаем все данные параллельно для максимальной скорости
      console.log(`[PDF Export] Параллельная предзагрузка всех данных...`);
      
      // Собираем все промисы для параллельной загрузки
      const preloadPromises: Promise<any>[] = [];
      
      // 1. Предзагружаем изображения развертки обложки (если есть)
      let coverImages: string[] = [];
      let coverPagesCount = 0;
      if (hasCover && (projectCategory === 'pregnancy' || projectCategory === 'kids') && coverPdf) {
        console.log(`[PDF Export] Начало загрузки изображений развертки обложки из папки: ${coverPdf}...`);
        const coverPromise = (async () => {
          try {
            // coverPdf теперь это название папки (строка), а не PDF файл
            const images = await getCoverImageUris(coverPdf);
            if (images && images.length > 0) {
              coverImages = images;
              coverPagesCount = images.length;
              console.log(`[PDF Export] ✓ Загружено ${coverPagesCount} изображений развертки обложки`);
            } else {
              console.warn(`[PDF Export] ✗ Изображения развертки обложки не найдены для папки: ${coverPdf}`);
            }
          } catch (error) {
            console.warn(`[PDF Export] ✗ Ошибка загрузки изображений развертки обложки:`, error);
          }
        })();
        preloadPromises.push(coverPromise);
      }
      
      // 2. Предзагружаем все изображения страниц
      console.log(`[PDF Export] Начало загрузки ${totalImages} изображений...`);
      const imageBytesPromises = images.map((imageUri, index) => 
        loadImageAsBytes(imageUri).catch((error) => {
          console.warn(`[PDF Export] Ошибка загрузки изображения ${index + 1}:`, error);
          return null;
        })
      );
      preloadPromises.push(...imageBytesPromises);
      
      // 3. Предзагружаем все изображения-аннотации
      const annotationImageUris = new Set<string>();
      annotations.forEach(ann => {
        if (ann.type === 'image' && ann.imageUri) {
          annotationImageUris.add(ann.imageUri);
        }
      });
      
      const annotationImagePromises = Array.from(annotationImageUris).map(uri =>
        loadImageAsBytes(uri).catch((error) => {
          console.warn(`[PDF Export] Ошибка загрузки изображения-аннотации:`, error);
          return null;
        })
      );
      preloadPromises.push(...annotationImagePromises);
      
      // Загружаем все параллельно батчами для оптимизации памяти
      const allPromises = preloadPromises;
      const totalToLoad = allPromises.length;
      // Увеличиваем размер батча для максимальной скорости (больше параллельных операций)
      const batchSize = Math.min(30, Math.max(15, Math.ceil(totalToLoad / 4))); // Динамический размер батча
      let loadedCount = 0;
      
      // Загружаем батчами с оптимизацией
      const loadedResults: any[] = [];
      const progressUpdateInterval = Math.max(1, Math.floor(totalToLoad / 20)); // Обновляем прогресс реже
      for (let i = 0; i < allPromises.length; i += batchSize) {
        const batch = allPromises.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch);
        loadedResults.push(...batchResults);
        loadedCount = Math.min(i + batchSize, totalToLoad);
        
        // Обновляем прогресс только периодически для уменьшения overhead
        if (i % progressUpdateInterval === 0 || i + batchSize >= totalToLoad) {
          const progress = Math.floor((loadedCount / totalToLoad) * 50); // 50% на загрузку
          setGenerationProgress({ current: progress, total: 100 });
        }
      }
      
      // Извлекаем результаты
      let resultIndex = 0;
      // coverImages уже загружены отдельно, не нужно пропускать результат
      
      const loadedImageBytes: (Uint8Array | null)[] = loadedResults.slice(resultIndex, resultIndex + totalImages);
      resultIndex += totalImages;
      
      // Загружаем байты изображений развертки обложки
      let coverImageBytes: (Uint8Array | null)[] = [];
      if (coverImages.length > 0) {
        console.log(`[PDF Export] Загрузка байтов ${coverImages.length} изображений развертки обложки...`);
        const coverImageBytesPromises = coverImages.map((imageUri, index) =>
          loadImageAsBytes(imageUri).catch((error) => {
            console.warn(`[PDF Export] Ошибка загрузки изображения развертки ${index + 1}:`, error);
            return null;
          })
        );
        coverImageBytes = await Promise.all(coverImageBytesPromises);
        console.log(`[PDF Export] ✓ Загружено ${coverImageBytes.filter(b => b !== null).length} из ${coverImages.length} изображений развертки`);
      }
      
      // Создаем маппинг изображений-аннотаций
      const annotationImageMap = new Map<string, Uint8Array | null>();
      Array.from(annotationImageUris).forEach((uri, index) => {
        annotationImageMap.set(uri, loadedResults[resultIndex + index] || null);
      });
      
      console.log(`[PDF Export] ✓ Предзагрузка завершена, начинаем создание PDF...`);
      
      // Предзагружаем шрифты для PDF
      console.log(`[PDF Export] Предзагрузка шрифтов...`);
      const fontsMap = await preloadFontsForPdf(pdfDoc);
      console.log(`[PDF Export] ✓ Загружено ${fontsMap.size} шрифтов`);
      
      // Загружаем аннотации обложки
      let coverAnnotations: Annotation[] = [];
      if (projectId) {
        const savedCoverAnnotations = await AsyncStorage.getItem(`@project_cover_annotations_${projectId}`);
        if (savedCoverAnnotations) {
          coverAnnotations = JSON.parse(savedCoverAnnotations);
          console.log(`[PDF Export] Загружено ${coverAnnotations.length} аннотаций обложки`);
        }
      }

      // ВАЖНО: Сначала добавляем развертку обложки в начало документа
      // Обложка всегда должна быть первой в PDF файле
      if (coverImageBytes.length > 0 && coverPagesCount > 0) {
        try {
          setGenerationProgress({ current: 50, total: 100 });
          
          // Создаем страницы PDF из изображений развертки обложки
          for (let coverPageIndex = 0; coverPageIndex < coverImageBytes.length; coverPageIndex++) {
            const imageBytes = coverImageBytes[coverPageIndex];
            if (!imageBytes) {
              console.warn(`[PDF Export] Пропуск изображения развертки ${coverPageIndex + 1}: не удалось загрузить`);
              continue;
            }
            
            // Определяем формат изображения
            const isPng = imageBytes[0] === 0x89 && imageBytes[1] === 0x50 && imageBytes[2] === 0x4E && imageBytes[3] === 0x47;
            const isJpg = imageBytes[0] === 0xFF && imageBytes[1] === 0xD8;
            
            // Встраиваем изображение в PDF
            let embeddedImage;
            try {
              embeddedImage = isPng 
                ? await pdfDoc.embedPng(imageBytes)
                : isJpg 
                  ? await pdfDoc.embedJpg(imageBytes)
                  : await pdfDoc.embedPng(imageBytes);
            } catch (embedError) {
              console.warn(`[PDF Export] Ошибка встраивания изображения развертки ${coverPageIndex + 1}:`, embedError);
              continue;
            }
            
            // Получаем размеры изображения
            const imageDims = embeddedImage.scale(1);
            const imageWidth = imageDims.width;
            const imageHeight = imageDims.height;
            
            // Создаем страницу с размерами изображения
            const coverPage = pdfDoc.addPage([imageWidth, imageHeight]);
            
            // Рисуем изображение на странице
            coverPage.drawImage(embeddedImage, {
              x: 0,
              y: 0,
              width: imageWidth,
              height: imageHeight,
            });
            
            // Применяем аннотации обложки к текущей странице развертки
            const pageCoverAnnotations = coverAnnotations.filter(ann => 
              ann.page === 'cover' || ann.page === coverPageIndex + 1
            );
            
            // Сортируем аннотации по zIndex
            const sortedAnnotations = [...pageCoverAnnotations].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
            
            // Масштабируем координаты аннотаций относительно размеров PDF страницы
            const scaleX = imageWidth / SCREEN_WIDTH;
            const scaleY = imageHeight / SCREEN_HEIGHT;
            
            // Применяем текстовые аннотации
            for (const ann of sortedAnnotations) {
              if (ann.type === 'text' && ann.content) {
                try {
                  // Масштабируем координаты
                  const scaledX = ann.x * scaleX;
                  const fontSize = (ann.fontSize || 16) * scaleY;
                  const scaledY = imageHeight - (ann.y * scaleY) - fontSize;
                  
                  // Оптимизированная конвертация цвета
                  const color = ann.color || '#000000';
                  const r = parseInt(color.substring(1, 3), 16) / 255;
                  const g = parseInt(color.substring(3, 5), 16) / 255;
                  const b = parseInt(color.substring(5, 7), 16) / 255;
                  
                  // Получаем шрифт для текста
                  const fontId = ann.fontFamily || 'default';
                  const font = fontId !== 'default' ? fontsMap.get(fontId) : undefined;
                  
                  // Рисуем текст на странице с выбранным шрифтом
                  coverPage.drawText(ann.content, {
                    x: scaledX,
                    y: scaledY,
                    size: fontSize,
                    color: rgb(r, g, b),
                    font: font, // Применяем выбранный шрифт или используем стандартный
                  });
                } catch (textError) {
                  // Тихо пропускаем ошибки для ускорения
                }
              }
            }
            
            processedCount++;
          }
          
          console.log(`[PDF Export] ✓ Развертка обложки добавлена ПЕРВОЙ (${coverPagesCount} страниц) с ${coverAnnotations.length} аннотациями`);
        } catch (coverError) {
          console.error(`[PDF Export] ✗ Ошибка при добавлении развертки обложки:`, coverError);
        }
      }

      // ВАЖНО: После обложки добавляем внутренние страницы альбома
      // Порядок: 1) Обложка, 2) Страницы альбома
      const actualCoverPagesCount = coverImageBytes.length > 0 ? coverPagesCount : 0;
      const progressStart = 50; // Начало прогресса обработки страниц (50% уже на загрузку)
      const progressRange = 45; // 45% на обработку страниц, 5% на сохранение
      
      for (let pageIndex = 0; pageIndex < images.length; pageIndex++) {
        const pageNumber = pageIndex + 1;
        const imageUri = images[pageIndex];
        const imageBytes = loadedImageBytes[pageIndex];
        
        try {
          // Обновляем прогресс реже для уменьшения overhead (каждые 3 страницы или последняя)
          if (pageIndex % 3 === 0 || pageIndex === images.length - 1) {
            const progress = progressStart + Math.floor((pageIndex / images.length) * progressRange);
            setGenerationProgress({ current: progress, total: 100 });
          }
          
          // Логируем реже для производительности (каждые 10 страниц)
          if (pageIndex % 10 === 0) {
            console.log(`[PDF Export] Обработка страницы ${pageNumber}/${totalImages}...`);
          }
          
          // Пропускаем страницу, если изображение не удалось загрузить
          if (!imageBytes) {
            console.warn(`[PDF Export] Пропуск страницы ${pageNumber}: не удалось загрузить изображение`);
            skippedCount++;
            continue;
          }
          
          // Предварительно определяем формат изображения для оптимизации
          const isPng = imageBytes[0] === 0x89 && imageBytes[1] === 0x50 && imageBytes[2] === 0x4E && imageBytes[3] === 0x47;
          const isJpg = imageBytes[0] === 0xFF && imageBytes[1] === 0xD8;

          // Фильтруем аннотации для текущей страницы
          const pageAnnotations = annotations.filter(ann => (ann.page || 1) === pageNumber);

          // Создаем новую страницу в PDF
          const page = pdfDoc.addPage([pageWidth, pageHeight]);
          
          // Встраиваем изображение в PDF (оптимизированная обработка формата)
          let embeddedImage;
          try {
            // Используем предварительно определенный формат для ускорения
            embeddedImage = isPng 
              ? await pdfDoc.embedPng(imageBytes)
              : isJpg 
                ? await pdfDoc.embedJpg(imageBytes)
                : await pdfDoc.embedPng(imageBytes); // Fallback на PNG
          } catch (embedError) {
            // Если первая попытка не сработала, пробуем альтернативный формат
            try {
              embeddedImage = isPng 
                ? await pdfDoc.embedJpg(imageBytes)
                : await pdfDoc.embedPng(imageBytes);
            } catch (jpgError) {
              // Тихо пропускаем проблемные изображения для ускорения
              skippedCount++;
              continue;
            }
          }
          
          // Вычисляем размеры изображения с учетом полей
          const imageDims = embeddedImage.scale(1);
          const imageAspectRatio = imageDims.width / imageDims.height;
          const contentAspectRatio = contentWidth / contentHeight;
          
          let drawWidth = contentWidth;
          let drawHeight = contentHeight;
          
          if (imageAspectRatio > contentAspectRatio) {
            // Изображение шире - подгоняем по ширине
            drawHeight = contentWidth / imageAspectRatio;
          } else {
            // Изображение выше - подгоняем по высоте
            drawWidth = contentHeight * imageAspectRatio;
          }
          
          // Центрируем изображение на странице
          const x = margin + (contentWidth - drawWidth) / 2;
          const y = pageHeight - margin - drawHeight - (contentHeight - drawHeight) / 2;
          
          // Рисуем изображение на странице
          page.drawImage(embeddedImage, {
            x,
            y,
            width: drawWidth,
            height: drawHeight,
          });
          
          // Добавляем аннотации (предварительно отсортированные для оптимизации)
          // Сортируем один раз перед циклом для ускорения
          const sortedAnnotations = pageAnnotations.length > 0 
            ? [...pageAnnotations].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
            : [];
          
          // Кэш для встроенных изображений-аннотаций (избегаем повторного встраивания)
          const embeddedImagesCache = new Map<string, any>();
          
          for (const ann of sortedAnnotations) {
            try {
              if (ann.type === 'text' && ann.content) {
                // Добавляем текстовую аннотацию (оптимизированная конвертация цвета)
                const color = ann.color || '#000000';
                const r = parseInt(color.substring(1, 3), 16) / 255;
                const g = parseInt(color.substring(3, 5), 16) / 255;
                const b = parseInt(color.substring(5, 7), 16) / 255;
                
                // Получаем шрифт для текста
                const fontId = ann.fontFamily || 'default';
                const font = fontId !== 'default' ? fontsMap.get(fontId) : undefined;
                
                page.drawText(ann.content, {
                  x: ann.x,
                  y: pageHeight - ann.y - (ann.height || 20), // Инвертируем Y координату
                  size: ann.fontSize || 16,
                  color: rgb(r, g, b),
                  font: font, // Применяем выбранный шрифт или используем стандартный
                });
              } else if (ann.type === 'image' && ann.imageUri) {
                // Используем предзагруженное изображение-аннотацию с кэшированием
                const annImageBytes = annotationImageMap.get(ann.imageUri);
                if (annImageBytes) {
                  try {
                    // Проверяем кэш перед встраиванием
                    let embeddedAnnImage = embeddedImagesCache.get(ann.imageUri);
                    if (!embeddedAnnImage) {
                      const isPng = annImageBytes[0] === 0x89 && annImageBytes[1] === 0x50;
                      embeddedAnnImage = isPng 
                        ? await pdfDoc.embedPng(annImageBytes)
                        : await pdfDoc.embedJpg(annImageBytes);
                      embeddedImagesCache.set(ann.imageUri, embeddedAnnImage);
                    }
                    
                    page.drawImage(embeddedAnnImage, {
                      x: ann.x,
                      y: pageHeight - ann.y - ann.height, // Инвертируем Y координату
                      width: ann.width,
                      height: ann.height,
                    });
                  } catch (annEmbedError) {
                    // Тихо пропускаем ошибки для ускорения
                  }
                }
              }
            } catch (annError) {
              // Тихо пропускаем ошибки для ускорения обработки
            }
          }
          
          processedCount++;
          
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

      console.log(`[PDF Export] Сохранение PDF файла...`);
      setGenerationProgress({ current: 95, total: 100 });
      
      // Сохраняем PDF документ в байты с максимальной оптимизацией производительности
      const pdfBytes = await pdfDoc.save({
        useObjectStreams: false, // Отключаем object streams для ускорения
        addDefaultPage: false,
      });
      
      setGenerationProgress({ current: 98, total: 100 });
      
      // Сохраняем PDF в файл
      const fileName = `project_${projectId || 'export'}_${Date.now()}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      // Конвертируем Uint8Array в base64 для сохранения (оптимизированный метод)
      // Используем более эффективный способ для больших файлов
      let base64: string;
      if (pdfBytes.length > 100000) {
        // Для больших файлов используем блочный метод
        const chunkSize = 8192;
        const chunks: string[] = [];
        for (let i = 0; i < pdfBytes.length; i += chunkSize) {
          const chunk = pdfBytes.slice(i, i + chunkSize);
          chunks.push(String.fromCharCode.apply(null, Array.from(chunk)));
        }
        base64 = btoa(chunks.join(''));
      } else {
        // Для маленьких файлов используем стандартный метод
        base64 = btoa(String.fromCharCode.apply(null, Array.from(pdfBytes)));
      }
      
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      setGenerationProgress({ current: 100, total: 100 });
      
      console.log(`[PDF Export] PDF успешно создан: ${fileUri}`);

      setPdfUri(fileUri);
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

