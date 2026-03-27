import PageRenderer, { type PageRendererRef } from '@/components/page-renderer';
import { Annotation } from '@/components/pdf-annotations';
import { pushAccountDataToCloud, scheduleSyncToCloud } from '@/utils/account-sync';
import { getKidsFirstLastPages, getPregnancyFirstLastPagesFromGitHub, getFamilyOrHolidayFirstLastPages } from '@/utils/albumFirstLastPages';
import { getAlbumImageUris } from '@/utils/albumImages';
import { getCoverExportPdfFileNameFromCoverType } from '@/utils/coverExportPdfMapping';
import { getCoverImageUris } from '@/utils/coverImagesLoader';
import { getCoverForExport } from '@/utils/coverMapping';
import { getCoverPdfForExport } from '@/utils/coverPdfMapping';
import { downloadExportCoverPdfToCache } from '@/utils/exportCoverPdfDownloader';
import { preloadFontsForPdf } from '@/utils/fontLoader';
import { Ionicons } from '@expo/vector-icons';
import fontkit from '@pdf-lib/fontkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { PDFDocument, cmyk, rgb } from 'pdf-lib';

function hexToColor(hex: string, useCmyk: boolean) {
  const r = parseInt(hex.substring(1, 3), 16) / 255;
  const g = parseInt(hex.substring(3, 5), 16) / 255;
  const b = parseInt(hex.substring(5, 7), 16) / 255;
  if (!useCmyk) return rgb(r, g, b);
  const k = 1 - Math.max(r, g, b);
  if (k >= 1) return cmyk(0, 0, 0, 1);
  return cmyk((1 - r - k) / (1 - k), (1 - g - k) / (1 - k), (1 - b - k) / (1 - k), k);
}
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Dimensions,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FormatOption {
  id: string;
  name: string;
  type: 'electronic' | 'hard' | 'soft';
  margins: string;
  size: string;
  orientation: string;
  description: string;
}

function getFormatOptions(category: string | null): FormatOption[] {
  const isKids = category === 'kids';
  return [
    {
      id: 'electronic',
      name: 'Электронная версия',
      type: 'electronic',
      margins: '10 мм',
      size: isKids ? '210 × 210 мм' : 'A5 (148 × 210 мм)',
      orientation: isKids ? 'Квадратная' : 'Вертикальная',
      description: 'Для просмотра на устройстве',
    },
    {
      id: 'hard',
      name: 'Для печати в твёрдой обложке',
      type: 'hard',
      margins: '15 мм',
      size: isKids ? '210 × 210 мм' : '180 × 240 мм',
      orientation: isKids ? 'Квадратная' : 'Вертикальная',
      description: 'Идеально для подарка и долгого хранения',
    },
    {
      id: 'soft',
      name: 'Для печати в мягкой обложке',
      type: 'soft',
      margins: '10 мм',
      size: isKids ? '210 × 210 мм' : 'A5 (148 × 210 мм)',
      orientation: isKids ? 'Квадратная' : 'Вертикальная',
      description: 'Компактный и удобный формат',
    },
  ];
}

export default function ExportPdfScreen() {
  const params = useLocalSearchParams();
  const projectId = params.id as string;
  const formatParam = params.format as string | undefined;
  const coverTypeParam = params.coverType as string | undefined;
  const celebrationParam = params.celebration as string | undefined;
  
  const [projectCat, setProjectCat] = useState<string | null>(null);

  // Используем celebration из URL как fallback, пока категория не загружена из проекта
  const effectiveCategory = projectCat ?? (celebrationParam === 'holiday' ? 'holidays' : celebrationParam) ?? null;
  const formatOptions = React.useMemo(() => getFormatOptions(effectiveCategory), [effectiveCategory]);

  const [selectedFormat, setSelectedFormat] = useState<FormatOption | null>(null);

  // При изменении категории (или при первом рендере) обновляем selectedFormat
  React.useEffect(() => {
    if (formatParam) {
      const found = formatOptions.find(f => f.id === formatParam) || null;
      setSelectedFormat(found);
    }
  }, [formatOptions, formatParam]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [downloadStep, setDownloadStep] = useState<1 | 2 | null>(null);
  const [coverDownloaded, setCoverDownloaded] = useState(false);
  const [firstLastDownloaded, setFirstLastDownloaded] = useState(false);
  const [interiorDownloaded, setInteriorDownloaded] = useState(false);
  const [isDownloadingCover, setIsDownloadingCover] = useState(false);
  const [isDownloadingFirstLast, setIsDownloadingFirstLast] = useState(false);
  const [isDownloadingInterior, setIsDownloadingInterior] = useState(false);
  const [firstLastPdfUri, setFirstLastPdfUri] = useState<string | null>(null);
  const opacity = useSharedValue(0);
  const loadingRotation = useSharedValue(0);
  
  // Для рендера страниц в фото (PageRenderer)
  const [renderingPage, setRenderingPage] = useState<{
    imageUri: string;
    annotations: Annotation[];
    pageNumber: number;
    viewport: { width: number; height: number };
  } | null>(null);
  const pageRendererRef = useRef<PageRendererRef>(null);
  const [pageRendererReady, setPageRendererReady] = useState(false);
  const pageSnapshotPromiseRef = useRef<{
    resolve: (uri: string | null) => void;
    reject: (error: Error) => void;
  } | null>(null);
  const captureSettingsRef = useRef<{ scale: number; quality: number }>({ scale: 1.35, quality: 0.92 });
  const scrollViewRef = useRef<ScrollView>(null);
  

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    // Загружаем категорию проекта для корректного отображения размеров
    if (projectId) {
      AsyncStorage.getItem(`@project_${projectId}`).then(data => {
        if (data) {
          try {
            const project = JSON.parse(data);
            if (project.category) {
              setProjectCat(project.category);
            }
          } catch {}
        }
      });
    }
  }, [projectId]);

  // Логи в экспорте могут сильно тормозить. Используем локальные no-op, не ломая глобальный console.
  const log = (..._args: any[]) => {};
  const warn = (..._args: any[]) => {};
  const errorLog = (..._args: any[]) => {};

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
  
  // Обработчик готовности PageRenderer
  useEffect(() => {
    if (pageRendererReady && pageRendererRef.current && pageSnapshotPromiseRef.current) {
      const captureSnapshot = async () => {
        try {
          // небольшая пауза на рендер аннотаций
          await new Promise(resolve => setTimeout(resolve, 150));
          const uri = await pageRendererRef.current?.capture();
          if (pageSnapshotPromiseRef.current) {
            pageSnapshotPromiseRef.current.resolve(uri || null);
            pageSnapshotPromiseRef.current = null;
          }
        } catch (error) {
          if (pageSnapshotPromiseRef.current) {
            pageSnapshotPromiseRef.current.reject(error as Error);
            pageSnapshotPromiseRef.current = null;
          }
        } finally {
          setPageRendererReady(false);
          setRenderingPage(null);
        }
      };
      captureSnapshot();
    }
  }, [pageRendererReady]);

  // Убрали автоматический запуск - пользователь должен сам выбрать формат и нажать кнопку

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const loadingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${loadingRotation.value}deg` }],
  }));

  const handleCreatePdfWithFormat = async (format?: FormatOption) => {
    const formatToUse = format || selectedFormat;
    if (!formatToUse) return;

    setIsGenerating(true);
    setShowPreview(false);
    setDownloadStep(null);
    setFirstLastPdfUri(null);
    setCoverDownloaded(false);
    setFirstLastDownloaded(false);
    setInteriorDownloaded(false);
    setGenerationStatus('Подготовка…');
    setGenerationProgress({ current: 0, total: 100 });

    try {
      let albumId: string | null = null;
      let projectCategory: string | null = null;
      let images: string[] = [];
      let annotations: Annotation[] = [];
      let coverImage: any = null;
      let coverPdf: any = null;
      let savedImages: string | null = null;
      let projectCoverType: string | null = null; // ID выбранной обложки (например, 'dfa_5', 'pregnancy_60')

      // Если есть projectId, пытаемся загрузить данные проекта
      if (projectId) {
        const projectData = await AsyncStorage.getItem(`@project_${projectId}`);
        if (projectData) {
          const project = JSON.parse(projectData);
          albumId = project.albumId || projectId;
          projectCategory = project.category || null;
          projectCoverType = project.coverType || null; // Сохраняем ID выбранной обложки
          console.log(`[PDF Export] Загружен проект: albumId=${albumId}, coverType=${projectCoverType}, category=${projectCategory}`);

          // Получаем изображение обложки для экспорта
          // ВАЖНО: expo-print не поддерживает встраивание PDF напрямую через embed/iframe
          // Поэтому используем изображение обложки вместо PDF развертки
          // PDF развертки можно использовать только после предварительной конвертации в изображение
          console.log(`[PDF Export] Загрузка обложки для albumId=${albumId}, projectCategory=${projectCategory}`);
          
          if (projectCategory === 'pregnancy' || projectCategory === 'kids') {
            // Для беременности и детей получаем изображение обложки по projectCoverType (выбранная обложка)
            const coverIdForCover = projectCoverType || albumId;
            coverImage = getCoverForExport(coverIdForCover, projectCategory);
            console.log(`[PDF Export] Получено изображение обложки: coverId=${coverIdForCover}, category=${projectCategory}, coverImage=${!!coverImage}`);
            
            // Также получаем PDF развертку по projectCoverType (выбранная обложка)
            const coverFormat = (formatToUse?.type === 'hard' || formatToUse?.type === 'soft') ? formatToUse.type : 'hard';
            coverPdf = getCoverPdfForExport(coverIdForCover, projectCategory, coverFormat);
            console.log(`[PDF Export] PDF развертка получена: coverId=${coverIdForCover}, format=${coverFormat}, coverPdf=${coverPdf || 'null'}`);
          } else {
            const coverIdForCover = projectCoverType || albumId;
            if (coverIdForCover) {
              coverImage = getCoverForExport(coverIdForCover, projectCategory || undefined);
              console.log(`[PDF Export] Обложка для другой категории: coverId=${coverIdForCover}, coverImage=${!!coverImage}`);
            }
          }

          // Загружаем изображения - сначала проверяем сохраненные изменения
          savedImages = await AsyncStorage.getItem(`@project_images_${projectId}`);
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

      // ВАЖНО: берём реальные размеры viewport редактора, чтобы экспорт был 1:1
      // (эти значения сохраняются в `app/edit-album.tsx`)
      const defaultViewport = { width: SCREEN_WIDTH, height: SCREEN_HEIGHT };
      let pagesViewport = defaultViewport;
      let coverViewport = defaultViewport;
      if (projectId) {
        try {
          const raw = await AsyncStorage.getItem(`@project_viewport_${projectId}`);
          if (raw) {
            const parsed = JSON.parse(raw) as any;
            if (typeof parsed?.width === 'number' && typeof parsed?.height === 'number' && parsed.width > 0 && parsed.height > 0) {
              pagesViewport = { width: parsed.width, height: parsed.height };
            }
          }
        } catch {}
        try {
          const raw = await AsyncStorage.getItem(`@project_cover_viewport_${projectId}`);
          if (raw) {
            const parsed = JSON.parse(raw) as any;
            if (typeof parsed?.width === 'number' && typeof parsed?.height === 'number' && parsed.width > 0 && parsed.height > 0) {
              coverViewport = { width: parsed.width, height: parsed.height };
            }
          }
        } catch {}
      }

      // Если проект не найден или нет projectId, используем значения по умолчанию
      if (!albumId) {
        console.error(`[PDF Export] Критическая ошибка: albumId не определен! projectId=${projectId}`);
        throw new Error('Не удалось определить альбом проекта. Пожалуйста, попробуйте пересоздать проект.');
      }
      
      console.log(`[PDF Export] Используем альбом: albumId=${albumId}, projectCategory=${projectCategory}, imagesCount=${images.length}`);

      // Если PDF развертка обложки еще не получена, пытаемся получить по projectCoverType
      const coverIdForCover = projectCoverType || albumId;
      if ((projectCategory === 'pregnancy' || projectCategory === 'kids') && !coverPdf && coverIdForCover) {
        const coverFormat = (formatToUse?.type === 'hard' || formatToUse?.type === 'soft') ? formatToUse.type : 'hard';
        coverPdf = getCoverPdfForExport(coverIdForCover, projectCategory, coverFormat);
        if (!coverPdf) {
          coverImage = getCoverForExport(coverIdForCover, projectCategory);
        }
      } else if (!coverImage && coverIdForCover) {
        const cover = getCoverForExport(coverIdForCover, projectCategory || undefined);
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

      // Для двухшагового экспорта: первый шаг = первая+последняя (или развертка), второй шаг = внутрянка
      // ДЛЯ ТВЕРДОЙ: первая/последняя не добавляем (шаг 1 = развертка из export)
      // ДЛЯ МЯГКОЙ/ЭЛЕКТРОННОЙ: первая/последняя в отдельный PDF (шаг 1), внутрянка отдельно (шаг 2)
      const coverIdForFirstLast = projectCoverType || albumId;
      let firstLastImages: string[] = [];
      
      if (formatToUse.type === 'hard') {
        console.log(`[PDF Export] Для твердой обложки: внутрянка только, развертка скачивается отдельно`);
      } else if (projectCategory === 'kids' || projectCategory === 'pregnancy') {
        try {
          const coverFormat = formatToUse.type === 'soft' || formatToUse.type === 'electronic' ? 'soft' : 'hard';
          if (projectCategory === 'kids') {
            const { firstPage, lastPage } = await getKidsFirstLastPages(coverIdForFirstLast, coverFormat);
            if (firstPage) firstLastImages.push(firstPage);
            if (lastPage) firstLastImages.push(lastPage);
            console.log(`[PDF Export] Загружена первая/последняя для kids: ${firstLastImages.length} стр.`);
          } else {
            const { firstPage, lastPages } = await getPregnancyFirstLastPagesFromGitHub(coverIdForFirstLast, coverFormat);
            if (firstPage) firstLastImages.push(firstPage);
            if (lastPages.length > 0) firstLastImages.push(...lastPages);
            console.log(`[PDF Export] Загружена первая/последняя для pregnancy: ${firstLastImages.length} стр.`);
          }
        } catch (error) {
          console.warn(`[PDF Export] Ошибка загрузки первой/последней:`, error);
        }
      } else if (projectCategory === 'family' || projectCategory === 'holidays' || projectCategory === 'holiday') {
        try {
          const { firstPage, lastPages } = await getFamilyOrHolidayFirstLastPages(coverIdForFirstLast, projectCategory);
          if (firstPage) firstLastImages.push(firstPage);
          if (lastPages.length > 0) firstLastImages.push(...lastPages);
          console.log(`[PDF Export] Загружена первая/последняя для ${projectCategory}: ${firstLastImages.length} стр.`);
        } catch (error) {
          console.warn(`[PDF Export] Ошибка загрузки первой/последней для ${projectCategory}:`, error);
        }
      } else if (images.length >= 2) {
        // Для diary и др.: первая и последняя страница из внутрянки
        firstLastImages = [images[0], images[images.length - 1]];
        console.log(`[PDF Export] Первая/последняя из внутрянки: 2 стр.`);
      }

      // Определяем размеры страницы
      const isKids = projectCategory === 'kids';
      let pageWidth: number;
      let pageHeight: number;
      if (isKids) {
        // 210×210 мм для всех детских альбомов
        pageWidth = 595;
        pageHeight = 595;
      } else if (formatToUse.type === 'hard') {
        // 180×240 мм для твёрдого переплёта
        pageWidth = 510;
        pageHeight = 680;
      } else {
        // A5 (148×210 мм) для мягкой обложки и электронной версии
        pageWidth = 420;
        pageHeight = 595;
      }
      const margin = formatToUse.type === 'hard' ? 42.5 : 28.3; // 15mm = 42.5pt для hard, 10mm = 28.3pt для soft/electronic
      const contentWidth = pageWidth - (margin * 2);
      const contentHeight = pageHeight - (margin * 2);

      const withTimeout = async <T,>(params: {
        label: string;
        timeoutMs: number;
        task: () => Promise<T>;
      }): Promise<T> => {
        const { label, timeoutMs, task } = params;
        if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return task();
        let timeoutHandle: any = null;
        try {
          const timeoutPromise = new Promise<T>((_, reject) => {
            timeoutHandle = setTimeout(() => reject(new Error(`[PDF Export] Timeout: ${label}`)), timeoutMs);
          });
          return await Promise.race([task(), timeoutPromise]);
        } finally {
          if (timeoutHandle) clearTimeout(timeoutHandle);
        }
      };

      const hashStringToHex = (value: string) => {
        // FNV-1a 32-bit
        let hash = 0x811c9dc5;
        for (let i = 0; i < value.length; i++) {
          hash ^= value.charCodeAt(i);
          hash = (hash * 0x01000193) >>> 0;
        }
        return hash.toString(16);
      };

      // Оптимизация для скорости: лёгкий ресайз до разумного предела
      // Для больших документов (40+ стр.) — сильнее сжатие, чтобы сериализация и запись PDF не зависали
      const optimizeImageForExport = async (uri: string, kind: 'page' | 'cover', isLargeDoc?: boolean) => {
        if (!uri) return uri;
        if (Platform.OS === 'web') return uri;
        if (!uri.startsWith('file://') && !uri.startsWith('/')) return uri;

        // Нормализуем путь без схемы
        let normalizedUri = uri.startsWith('/') ? `file://${uri}` : uri;

        const maxSide = kind === 'cover' ? 2400 : (isLargeDoc ? 1100 : 2000);
        const quality = kind === 'cover' ? 0.9 : (isLargeDoc ? 0.72 : 0.9);

        const cacheKey = hashStringToHex(`${normalizedUri}|${kind}|${maxSide}|${quality}`);
        const outUri = `${FileSystem.cacheDirectory}pdf_fast_${kind}_${cacheKey}.jpg`;
        try {
          const existing = await FileSystem.getInfoAsync(outUri);
          if (existing.exists) return outUri;
        } catch {
          // ignore
        }

        try {
          const result = await withTimeout({
            label: `ImageManipulator(${kind})`,
            timeoutMs: 6000,
            task: async () =>
              ImageManipulator.manipulateAsync(
                normalizedUri,
                [{ resize: { width: maxSide } }],
                { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
              ),
          });
          if (result?.uri) return result.uri;
        } catch {
          // ignore
        }

        return normalizedUri;
      };

      // Функция для конвертации изображения в base64 с обработкой ошибок
      const convertImageToBase64 = async (uri: string, imageIndex: number): Promise<string | null> => {
        try {
          console.log(`[PDF Export] Обработка изображения ${imageIndex + 1}: ${uri.substring(0, 50)}...`);
          
          if (uri.startsWith('data:')) {
            return uri; // Уже в формате base64
          }
          
          if (uri.startsWith('file://')) {
            const optimizedUri = await optimizeImageForExport(uri, 'page');
            const base64 = await withTimeout({
              label: `readAsString(file://) ${imageIndex + 1}`,
              timeoutMs: 25000,
              task: async () =>
                FileSystem.readAsStringAsync(optimizedUri, {
                  encoding: FileSystem.EncodingType.Base64,
                }),
            });
            // после оптимизации это JPEG
            return `data:image/jpeg;base64,${base64}`;
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
              
              const downloadResult = await withTimeout({
                label: `download ${imageIndex + 1}`,
                timeoutMs: 30000,
                task: async () => FileSystem.downloadAsync(uri, tempPath),
              });
              
              if (!downloadResult.uri) {
                throw new Error('Download failed: no URI returned');
              }
              
              const optimizedUri = await optimizeImageForExport(downloadResult.uri, 'page');
              const base64 = await withTimeout({
                label: `readAsString(downloaded) ${imageIndex + 1}`,
                timeoutMs: 25000,
                task: async () =>
                  FileSystem.readAsStringAsync(optimizedUri, {
                    encoding: FileSystem.EncodingType.Base64,
                  }),
              });
              
              // Удаляем временный файл асинхронно в фоне (не ждем завершения для ускорения)
              FileSystem.deleteAsync(tempPath, { idempotent: true }).catch(() => {});
              
              return `data:image/jpeg;base64,${base64}`;
            }
          }
          
          // Пытаемся прочитать как локальный файл
          const base64 = await withTimeout({
            label: `readAsString(fallback) ${imageIndex + 1}`,
            timeoutMs: 25000,
            task: async () =>
              FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
              }),
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
          if (!uri) {
            console.warn(`[PDF Export] Пустой URI изображения`);
            return null;
          }

          // Если путь абсолютный без схемы (iOS tmp), добавляем file://
          if (uri.startsWith('/')) {
            uri = `file://${uri}`;
          }

          if (uri.startsWith('data:image')) {
            // Извлекаем base64 из data URI
            const base64 = uri.split(',')[1];
            if (!base64) {
              console.warn(`[PDF Export] Не удалось извлечь base64 из data URI`);
              return null;
            }
            return base64ToUint8Array(base64);
          }
          
          if (uri.startsWith('file://')) {
            // Проверяем существование файла
            const fileInfo = await FileSystem.getInfoAsync(uri);
            if (!fileInfo.exists) {
              console.warn(`[PDF Export] Файл не существует: ${uri}`);
              return null;
            }
            
            const base64 = await FileSystem.readAsStringAsync(uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            if (!base64 || base64.length === 0) {
              console.warn(`[PDF Export] Пустой base64 для файла: ${uri}`);
              return null;
            }
            return base64ToUint8Array(base64);
          }
          
          if (uri.startsWith('http://') || uri.startsWith('https://')) {
            if (Platform.OS === 'web') {
              const response = await fetch(uri);
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              const arrayBuffer = await response.arrayBuffer();
              return new Uint8Array(arrayBuffer);
            } else {
              const tempFileName = `temp_img_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
              const tempPath = FileSystem.cacheDirectory + tempFileName;
              
              try {
                const downloadResult = await FileSystem.downloadAsync(uri, tempPath);
                
                if (downloadResult.uri) {
                  const base64 = await FileSystem.readAsStringAsync(downloadResult.uri, {
                    encoding: FileSystem.EncodingType.Base64,
                  });
                  // Удаляем файл асинхронно в фоне (не ждем завершения)
                  FileSystem.deleteAsync(tempPath, { idempotent: true }).catch(() => {});
                  
                  if (!base64 || base64.length === 0) {
                    console.warn(`[PDF Export] Пустой base64 после скачивания: ${uri}`);
                    return null;
                  }
                  
                  return base64ToUint8Array(base64);
                } else {
                  console.warn(`[PDF Export] downloadResult.uri пуст для: ${uri}`);
                  return null;
                }
              } catch (downloadError) {
                console.error(`[PDF Export] Ошибка скачивания изображения ${uri}:`, downloadError);
                // Пытаемся удалить временный файл в случае ошибки
                FileSystem.deleteAsync(tempPath, { idempotent: true }).catch(() => {});
                return null;
              }
            }
          }
          
          // Пытаемся прочитать как require() модуль
          if (typeof uri === 'number') {
            const asset = Asset.fromModule(uri);
            await asset.downloadAsync();
            
            if (asset.localUri) {
              const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              return base64ToUint8Array(base64);
            } else if (asset.uri) {
              // Рекурсивно вызываем для URI
              return await loadImageAsBytes(asset.uri);
            }
          }
          
          console.warn(`[PDF Export] Неподдерживаемый формат URI: ${uri}`);
          return null;
        } catch (error) {
          console.error(`[PDF Export] Ошибка при загрузке изображения ${uri}:`, error);
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
      
      // Регистрируем fontkit для поддержки кастомных шрифтов
      try {
        pdfDoc.registerFontkit(fontkit);
      } catch (fontkitError) {
        console.warn('[PDF Export] Не удалось зарегистрировать fontkit, кастомные шрифты могут не работать:', fontkitError);
      }
      let processedCount = 0;
      let skippedCount = 0;
      const totalImages = images.length;
      const hasCover = coverPdf !== null;
      const totalPages = totalImages + (hasCover ? 1 : 0);
      
      setGenerationProgress({ current: 0, total: 100 });
      setGenerationStatus('Подготовка…');
      log(`[PDF Export] Начало обработки ${totalPages} страниц (${totalImages} изображений + ${hasCover ? '1 развертка обложки' : '0 обложек'})...`);
      log(`[PDF Export] Параметры: albumId=${albumId}, projectCategory=${projectCategory}, hasCover=${hasCover}, coverPdf=${!!coverPdf}`);

      // Быстрый и стабильный пайплайн:
      // - оптимизируем страницы батчами (кэш в FileSystem.cacheDirectory)
      // - загружаем изображения-аннотации батчами (без оптимизации, чтобы не мылить)
      // - обложку (если есть) оптимизируем и грузим батчами
      setGenerationStatus('Оптимизация и загрузка…');
      setGenerationProgress({ current: 3, total: 100 });

      const isLargeDoc = images.length >= (Platform.OS === 'android' ? 42 : 36);
      captureSettingsRef.current = {
        scale: isLargeDoc ? 1.2 : 1.35,
        quality: isLargeDoc ? 0.88 : 0.92,
      };

      // 1) Оптимизируем все страницы батчами (для больших документов — сильнее сжатие)
      const optimizedPageUris: string[] = new Array(images.length);
      for (let i = 0; i < images.length; i += 3) {
        const batch = images.slice(i, i + 3);
        const results = await Promise.all(
          batch.map(async (uri) => {
            try {
              return await optimizeImageForExport(uri, 'page', isLargeDoc);
            } catch {
              return uri;
            }
          })
        );
        for (let j = 0; j < batch.length; j++) optimizedPageUris[i + j] = results[j];
        const done = Math.min(images.length, i + batch.length);
        setGenerationProgress({ current: 3 + Math.floor((done / Math.max(1, images.length)) * 10), total: 100 }); // 3..13
      }

      // 2) Обложка (если есть)
      // ДЛЯ ТВЕРДОГО ПЕРЕПЛЕТА: не загружаем изображения развертки, т.к. пользователь скачает PDF из albums/export отдельно
      // ДЛЯ ЭЛЕКТРОННОЙ/МЯГКОЙ: загружаем первую и последнюю страницу из шаблона (уже добавлены в массив images)
      let coverImages: string[] = [];
      let coverPagesCount = 0;
      let coverImageBytes: (Uint8Array | null)[] = [];
      
      console.log(`[PDF Export] Загрузка обложки: format=${formatToUse.type}, hasCover=${hasCover}`);
      
      // Для твердого переплета пропускаем загрузку изображений обложки
      // Развертка будет скачиваться отдельно из albums/export (шаг 1)
      if (formatToUse.type !== 'hard') {
        // Только для электронной и мягкой версии загружаем изображения обложки
        console.log(`[PDF Export] Загружаем изображения обложки для ${formatToUse.type} версии`);
      } else {
        console.log(`[PDF Export] Твердый переплет: развертка будет скачиваться отдельно из albums/export`);
      }

      // 3) Изображения-аннотации (без оптимизации)
      const annotationImageUris = new Set<string>();
      for (const ann of annotations) {
        if (ann.type === 'image' && ann.imageUri) annotationImageUris.add(ann.imageUri);
      }
      const annotationImageMap = new Map<string, Uint8Array | null>();
      const annUris = Array.from(annotationImageUris);
      for (let i = 0; i < annUris.length; i += 4) {
        const batch = annUris.slice(i, i + 4);
        const results = await Promise.all(
          batch.map(async (uri) => {
            try {
              return await withTimeout({
                label: `load annotation image`,
                timeoutMs: 20000,
                task: async () => loadImageAsBytes(uri),
              });
            } catch {
              return null;
            }
          })
        );
        for (let j = 0; j < batch.length; j++) annotationImageMap.set(batch[j], results[j] ?? null);
      }

      setGenerationProgress({ current: 14, total: 100 });
      setGenerationStatus('Создание PDF…');

      // NOTE: optimizedPageUris нужен ниже в цикле страниц
      
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

      // ВАЖНО: Для твердого переплета развертка НЕ добавляется в PDF
      // Развертка скачивается отдельно из albums/export (шаг 1)
      // Поэтому для твердого переплета этот блок пропускается (coverImageBytes будет пустым)
      // Для электронной и мягкой версии развертка не нужна - там добавляются только первая и последняя страница внутренней части
      if (formatToUse.type === 'hard' && coverImageBytes.length > 0 && coverPagesCount > 0) {
        // Этот блок не должен выполняться для твердого переплета, т.к. coverImageBytes пустой
        console.log(`[PDF Export] Предупреждение: обнаружены изображения развертки для твердого переплета, пропускаем`);
        try {
          setGenerationStatus('Добавление обложки…');
          setGenerationProgress({ current: 18, total: 100 });
          
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
              embeddedImage = await withTimeout({
                label: `embed cover ${coverPageIndex + 1}`,
                timeoutMs: 20000,
                task: async () =>
                  isJpg
                    ? pdfDoc.embedJpg(imageBytes)
                    : isPng
                      ? pdfDoc.embedPng(imageBytes)
                      : pdfDoc.embedPng(imageBytes),
              });
            } catch (embedError) {
              console.warn(`[PDF Export] Ошибка встраивания изображения развертки ${coverPageIndex + 1}:`, embedError);
              continue;
            }
            
            // Получаем размеры изображения
            const imageDims = embeddedImage.scale(1);
            const imageWidth = imageDims.width;
            const imageHeight = imageDims.height;
            
            // Создаем страницу с теми же размерами, что и страницы альбома
            const coverPage = pdfDoc.addPage([pageWidth, pageHeight]);
            
            // Вычисляем размеры изображения с учетом полей (как для страниц альбома)
            const imageAspectRatio = imageWidth / imageHeight;
            const contentAspectRatio = contentWidth / contentHeight;
            
            // Вычисляем реальные размеры изображения на странице
            let actualImageWidth = contentWidth;
            let actualImageHeight = contentHeight;
            
            if (imageAspectRatio > contentAspectRatio) {
              // Изображение шире - подгоняем по ширине
              actualImageHeight = contentWidth / imageAspectRatio;
            } else {
              // Изображение выше - подгоняем по высоте
              actualImageWidth = contentHeight * imageAspectRatio;
            }
            
            // Центрируем изображение на странице
            const offsetX = margin + (contentWidth - actualImageWidth) / 2;
            const offsetY = pageHeight - margin - actualImageHeight - (contentHeight - actualImageHeight) / 2;
            
            // Рисуем изображение на странице
            coverPage.drawImage(embeddedImage, {
              x: offsetX,
              y: offsetY,
              width: actualImageWidth,
              height: actualImageHeight,
            });
            
            // Применяем аннотации обложки к текущей странице развертки
            const pageCoverAnnotations = coverAnnotations.filter(ann => 
              ann.page === 'cover' || ann.page === coverPageIndex + 1
            );
            
            // Сортируем аннотации по zIndex
            const sortedAnnotations = [...pageCoverAnnotations].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
            
            // Масштабируем координаты аннотаций относительно реальных размеров изображения на странице
            const scaleX = actualImageWidth / coverViewport.width;
            const scaleY = actualImageHeight / coverViewport.height;
            
            // Применяем текстовые аннотации
            for (const ann of sortedAnnotations) {
              if (ann.type === 'text' && ann.content) {
                try {
                  // Масштабируем координаты относительно реального изображения на странице
                  const scaledX = offsetX + (ann.x * scaleX);
                  const fontSize = (ann.fontSize || 16) * scaleY;
                  const scaledY = offsetY + actualImageHeight - (ann.y * scaleY) - fontSize;
                  
                  const colorHex = ann.color || '#000000';
                  const isPrint = formatToUse.type === 'hard' || formatToUse.type === 'soft';
                  
                  // Получаем шрифт для текста
                  const fontId = ann.fontFamily || 'default';
                  const font = fontId !== 'default' ? fontsMap.get(fontId) : undefined;
                  
                  // Рисуем текст на странице с выбранным шрифтом
                  coverPage.drawText(ann.content, {
                    x: scaledX,
                    y: scaledY,
                    size: fontSize,
                    color: hexToColor(colorHex, isPrint),
                    font: font,
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

      // Для soft/electronic: встраиваем первую страницу обложки ДО внутренних страниц
      const isSoftOrElectronic = formatToUse.type === 'soft' || formatToUse.type === 'electronic';
      if (isSoftOrElectronic && firstLastImages.length > 0) {
        try {
          setGenerationStatus('Добавление обложки…');
          setGenerationProgress({ current: 16, total: 100 });
          const firstCoverUri = firstLastImages[0];
          const optFirstCover = await optimizeImageForExport(firstCoverUri, 'cover', isLargeDoc).catch(() => firstCoverUri);
          const firstCoverBytes = await loadImageAsBytes(optFirstCover);
          if (firstCoverBytes) {
            const isJpg = firstCoverBytes[0] === 0xFF && firstCoverBytes[1] === 0xD8;
            const embeddedFirst = isJpg ? await pdfDoc.embedJpg(firstCoverBytes) : await pdfDoc.embedPng(firstCoverBytes);
            const dims = embeddedFirst.scale(1);
            const ar = dims.width / dims.height;
            const pageAr = pageWidth / pageHeight;
            let w = pageWidth, h = pageHeight;
            if (ar > pageAr) { h = pageWidth / ar; } else { w = pageHeight * ar; }
            const coverPage = pdfDoc.addPage([pageWidth, pageHeight]);
            const cx = (pageWidth - w) / 2;
            const cy = (pageHeight - h) / 2;
            coverPage.drawImage(embeddedFirst, { x: cx, y: cy, width: w, height: h });

            // Cover annotations на первой странице
            const sortedCoverAnns = [...coverAnnotations].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
            const cvScaleX = w / coverViewport.width;
            const cvScaleY = h / coverViewport.height;
            for (const ann of sortedCoverAnns) {
              if (ann.type === 'text' && ann.content) {
                try {
                  const scaledX = cx + (ann.x * cvScaleX);
                  const fontSize = (ann.fontSize || 16) * cvScaleY;
                  const scaledY = cy + h - (ann.y * cvScaleY) - fontSize;
                  const colorHex = ann.color || '#000000';
                  const fontId = ann.fontFamily || 'default';
                  const font = fontId !== 'default' ? fontsMap.get(fontId) : undefined;
                  coverPage.drawText(ann.content, {
                    x: scaledX, y: scaledY, size: fontSize,
                    color: hexToColor(colorHex, true), font,
                  });
                } catch {}
              }
            }
            processedCount++;
            console.log(`[PDF Export] ✓ Первая страница обложки добавлена с ${coverAnnotations.length} аннотациями`);
          }
        } catch (coverErr) {
          console.warn('[PDF Export] Ошибка добавления первой страницы обложки:', coverErr);
        }
      }

      // ВАЖНО: После обложки добавляем внутренние страницы альбома
      const actualCoverPagesCount = coverImageBytes.length > 0 ? coverPagesCount : 0;
      const progressStart = (isSoftOrElectronic && firstLastImages.length > 0) ? 22 : (coverImageBytes.length > 0 ? 22 : 18);
      const progressRange = 72;

      const embeddedImagesCache = new Map<string, any>();
      
      for (let pageIndex = 0; pageIndex < images.length; pageIndex++) {
        const pageNumber = pageIndex + 1;
        const imageUri = images[pageIndex];
        const optimizedPageUri = optimizedPageUris[pageIndex] || imageUri;
        
        try {
          // Обновляем прогресс на каждой странице, чтобы он рос плавно (1,3,5,...)
          const rawProgress = progressStart + Math.floor(((pageIndex + 1) / images.length) * progressRange);
          const oddProgress = rawProgress % 2 === 0 ? rawProgress + 1 : rawProgress;
          const cappedProgress = Math.min(99, oddProgress);
          setGenerationProgress({ current: cappedProgress, total: 100 });
          setGenerationStatus(`Создание PDF… ${pageNumber}/${images.length}`);
          
          // Логируем реже для производительности (каждые 10 страниц)
          if (pageIndex % 10 === 0) {
            console.log(`[PDF Export] Обработка страницы ${pageNumber}/${totalImages}...`);
          }
          
          // Фильтруем аннотации для текущей страницы
          const pageAnnotations = annotations.filter(ann => (ann.page || 1) === pageNumber);

          // Создаем новую страницу в PDF
          const page = pdfDoc.addPage([pageWidth, pageHeight]);
          
          // Попытка сделать быстрый скриншот страницы редактора (PageRenderer), если не успевает — fallback
          let pageSnapshotUri: string | null = null;
          try {
            pageSnapshotUri = await withTimeout({
              label: `PageRenderer capture ${pageNumber}`,
              timeoutMs: 3500,
              task: async () =>
                new Promise<string | null>((resolve, reject) => {
                  pageSnapshotPromiseRef.current = { resolve, reject };
                  setRenderingPage({
                    imageUri: optimizedPageUri,
                    annotations: pageAnnotations,
                    pageNumber,
                    viewport: pagesViewport,
                  });
                  // Safety timeout (если onReady не сработает)
                  setTimeout(() => {
                    if (pageSnapshotPromiseRef.current) {
                      pageSnapshotPromiseRef.current.resolve(null);
                      pageSnapshotPromiseRef.current = null;
                    }
                    setRenderingPage(null);
                    setPageRendererReady(false);
                  }, 3200);
                }),
            });
          } catch {
            pageSnapshotUri = null;
            setRenderingPage(null);
            setPageRendererReady(false);
          }

          if (pageSnapshotUri) {
            try {
              // снапшот уже jpeg (PageRenderer), но дополнительно прогоняем через оптимизацию+кэш
              const optimizedSnapshotUri = await optimizeImageForExport(pageSnapshotUri, 'page', isLargeDoc);
              const snapshotBytes = await loadImageAsBytes(optimizedSnapshotUri);
              if (snapshotBytes) {
                const embeddedSnapshot = await withTimeout({
                  label: `embed snapshot ${pageNumber}`,
                  timeoutMs: 20000,
                  task: async () => pdfDoc.embedJpg(snapshotBytes),
                });
                
                const snapshotDims = embeddedSnapshot.scale(1);
                const snapshotAspectRatio = snapshotDims.width / snapshotDims.height;
                const contentAspectRatio = contentWidth / contentHeight;

                // Для электронной и мягкой версии первая и последняя страница (внутренние) без полей
                const isFirstOrLastPageSnapshot = (formatToUse.type === 'electronic' || formatToUse.type === 'soft') && 
                                                  (pageIndex === 0 || pageIndex === images.length - 1);

                let snapshotWidth = contentWidth;
                let snapshotHeight = contentHeight;

                if (snapshotAspectRatio > contentAspectRatio) {
                  snapshotHeight = contentWidth / snapshotAspectRatio;
                } else {
                  snapshotWidth = contentHeight * snapshotAspectRatio;
                }

                // Для первой и последней страницы электронной/мягкой версии - без полей, на весь лист
                let snapshotX: number;
                let snapshotY: number;
                
                if (isFirstOrLastPageSnapshot) {
                  // Без полей - изображение на весь лист
                  const pageAspectRatio = pageWidth / pageHeight;
                  if (snapshotAspectRatio > pageAspectRatio) {
                    snapshotWidth = pageWidth;
                    snapshotHeight = pageWidth / snapshotAspectRatio;
                  } else {
                    snapshotHeight = pageHeight;
                    snapshotWidth = pageHeight * snapshotAspectRatio;
                  }
                  snapshotX = (pageWidth - snapshotWidth) / 2;
                  snapshotY = (pageHeight - snapshotHeight) / 2;
                } else {
                  // С полями - стандартная логика
                  snapshotX = margin + (contentWidth - snapshotWidth) / 2;
                  snapshotY = pageHeight - margin - contentHeight + (contentHeight - snapshotHeight) / 2;
                }
                
                page.drawImage(embeddedSnapshot, {
                  x: snapshotX,
                  y: snapshotY,
                  width: snapshotWidth,
                  height: snapshotHeight,
                });

                FileSystem.deleteAsync(pageSnapshotUri, { idempotent: true }).catch(() => {});
                
                processedCount++;
                continue;
              }
            } catch {
              // fallback пойдет ниже
            }
          }
          
          // Быстрый прямой подход - загружаем изображение страницы на лету
          let embeddedImage;
          try {
            const pageImageBytes = await loadImageAsBytes(optimizedPageUri);
            if (!pageImageBytes) {
              console.warn(`[PDF Export] Пропуск страницы ${pageNumber}: не удалось загрузить изображение`);
              skippedCount++;
              continue;
            }
            const isJpg = pageImageBytes[0] === 0xFF && pageImageBytes[1] === 0xD8;
            embeddedImage = await withTimeout({
              label: `embed page ${pageNumber}`,
              timeoutMs: 20000,
              task: async () => (isJpg ? pdfDoc.embedJpg(pageImageBytes) : pdfDoc.embedPng(pageImageBytes)),
            });
          } catch (embedError) {
            console.warn(`[PDF Export] Пропуск страницы ${pageNumber}: не удалось встроить изображение`, embedError);
            skippedCount++;
            continue;
          }
          
          // Вычисляем размеры изображения с учетом полей (ТОЧНО как в редакторе)
          const imageDims = embeddedImage.scale(1);
          const imageAspectRatio = imageDims.width / imageDims.height;
          const contentAspectRatio = contentWidth / contentHeight;
          
          // Для электронной и мягкой версии первая и последняя страница (внутренние) без полей
          const isFirstOrLastPage = (formatToUse.type === 'electronic' || formatToUse.type === 'soft') && 
                                    (pageIndex === 0 || pageIndex === images.length - 1);
          
          // Вычисляем реальные размеры изображения на странице (как в редакторе)
          let actualImageWidth = contentWidth;
          let actualImageHeight = contentHeight;
          
          if (imageAspectRatio > contentAspectRatio) {
            // Изображение шире - подгоняем по ширине
            actualImageHeight = contentWidth / imageAspectRatio;
          } else {
            // Изображение выше - подгоняем по высоте
            actualImageWidth = contentHeight * imageAspectRatio;
          }
          
          // Центрируем изображение на странице
          // Для первой и последней страницы электронной/мягкой версии - без полей, на весь лист
          let offsetX: number;
          let offsetY: number;
          
          if (isFirstOrLastPage) {
            // Без полей - изображение на весь лист
            const pageAspectRatio = pageWidth / pageHeight;
            if (imageAspectRatio > pageAspectRatio) {
              actualImageWidth = pageWidth;
              actualImageHeight = pageWidth / imageAspectRatio;
            } else {
              actualImageHeight = pageHeight;
              actualImageWidth = pageHeight * imageAspectRatio;
            }
            offsetX = (pageWidth - actualImageWidth) / 2;
            offsetY = (pageHeight - actualImageHeight) / 2;
          } else {
            // С полями - стандартная логика
            offsetX = margin + (contentWidth - actualImageWidth) / 2;
            offsetY = pageHeight - margin - actualImageHeight - (contentHeight - actualImageHeight) / 2;
          }
          
          // Рисуем изображение на странице
          page.drawImage(embeddedImage, {
            x: offsetX,
            y: offsetY,
            width: actualImageWidth,
            height: actualImageHeight,
          });
          
          // Добавляем аннотации (предварительно отсортированные для оптимизации)
          const sortedAnnotations = pageAnnotations.length > 0 
            ? [...pageAnnotations].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
            : [];
          
          const scaleX = actualImageWidth / pagesViewport.width;
          const scaleY = actualImageHeight / pagesViewport.height;
          
          for (const ann of sortedAnnotations) {
            try {
              if (ann.type === 'text' && ann.content) {
                const scaledX = offsetX + (ann.x * scaleX);
                const scaledY = offsetY + actualImageHeight - (ann.y * scaleY) - ((ann.height || 20) * scaleY);
                const scaledFontSize = (ann.fontSize || 16) * scaleY;
                
                const colorHex = ann.color || '#000000';
                const isPrint = formatToUse.type === 'hard' || formatToUse.type === 'soft';
                
                const fontId = ann.fontFamily || 'default';
                const font = fontId !== 'default' ? fontsMap.get(fontId) : undefined;
                
                page.drawText(ann.content, {
                  x: scaledX,
                  y: scaledY,
                  size: scaledFontSize,
                  color: hexToColor(colorHex, isPrint),
                  font: font,
                });
              } else if (ann.type === 'image' && ann.imageUri) {
                const scaledX = offsetX + (ann.x * scaleX);
                const scaledY = offsetY + actualImageHeight - (ann.y * scaleY) - (ann.height * scaleY);
                const scaledWidth = ann.width * scaleX;
                const scaledHeight = ann.height * scaleY;
                
                const annImageBytes = annotationImageMap.get(ann.imageUri);
                if (annImageBytes) {
                  try {
                    let embeddedAnnImage = embeddedImagesCache.get(ann.imageUri);
                    if (!embeddedAnnImage) {
                      const isJpg = annImageBytes[0] === 0xFF && annImageBytes[1] === 0xD8;
                      embeddedAnnImage = isJpg ? await pdfDoc.embedJpg(annImageBytes) : await pdfDoc.embedPng(annImageBytes);
                      embeddedImagesCache.set(ann.imageUri, embeddedAnnImage);
                    }
                    
                    page.drawImage(embeddedAnnImage, {
                      x: scaledX,
                      y: scaledY,
                      width: scaledWidth,
                      height: scaledHeight,
                    });
                  } catch (annEmbedError) {
                    // ignore
                  }
                }
              }
            } catch (annError) {
              // ignore
            }
          }
          
          processedCount++;
          
        } catch (pageError) {
          console.error(`[PDF Export] Ошибка при обработке страницы ${pageNumber}:`, pageError);
          skippedCount++;
        }
      }
      
      // Для soft/electronic: добавляем последнюю страницу обложки ПОСЛЕ внутренних страниц
      if (isSoftOrElectronic && firstLastImages.length > 1) {
        try {
          setGenerationStatus('Добавление последней страницы…');
          for (let li = 1; li < firstLastImages.length; li++) {
            const lastUri = firstLastImages[li];
            const optLastUri = await optimizeImageForExport(lastUri, 'cover', isLargeDoc).catch(() => lastUri);
            const lastBytes = await loadImageAsBytes(optLastUri);
            if (!lastBytes) continue;
            const isJpg = lastBytes[0] === 0xFF && lastBytes[1] === 0xD8;
            const embeddedLast = isJpg ? await pdfDoc.embedJpg(lastBytes) : await pdfDoc.embedPng(lastBytes);
            const dims = embeddedLast.scale(1);
            const ar = dims.width / dims.height;
            const pageAr = pageWidth / pageHeight;
            let w = pageWidth, h = pageHeight;
            if (ar > pageAr) { h = pageWidth / ar; } else { w = pageHeight * ar; }
            const lastPage = pdfDoc.addPage([pageWidth, pageHeight]);
            const lx = (pageWidth - w) / 2;
            const ly = (pageHeight - h) / 2;
            lastPage.drawImage(embeddedLast, { x: lx, y: ly, width: w, height: h });
            processedCount++;
          }
          console.log(`[PDF Export] ✓ Последняя страница обложки добавлена`);
        } catch (lastErr) {
          console.warn('[PDF Export] Ошибка добавления последней страницы обложки:', lastErr);
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

      const savePhaseStart = Date.now();
      console.log(`[PDF Export] Сохранение PDF файла (сериализация + запись)...`);
      setGenerationStatus('Сохранение PDF…');
      setGenerationProgress({ current: 95, total: 100 });

      const yieldToUI = () => new Promise<void>(r => setImmediate(r));

      const uint8ToBase64 = (bytes: Uint8Array): string => {
        // Быстрый путь (в RN часто доступен Buffer через полифиллы)
        // eslint-disable-next-line no-undef
        if (typeof Buffer !== 'undefined') {
          // eslint-disable-next-line no-undef
          return Buffer.from(bytes).toString('base64');
        }
        const chunkSize = 32768;
        const chunks: string[] = [];
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.slice(i, i + chunkSize);
          chunks.push(String.fromCharCode.apply(null, Array.from(chunk)));
        }
        return btoa(chunks.join(''));
      };

      // Для больших буферов — конвертация по чанкам с отдачей управления, чтобы UI не зависал
      const uint8ToBase64Async = async (bytes: Uint8Array): Promise<string> => {
        const CHUNK = 256 * 1024; // 256 KB на чанк
        const YIELD_EVERY = 4;   // отдавать управление каждые 4 чанка
        // eslint-disable-next-line no-undef
        if (typeof Buffer !== 'undefined' && bytes.length <= 8 * 1024 * 1024) {
          await yieldToUI();
          return Buffer.from(bytes).toString('base64');
        }
        if (bytes.length <= 2 * 1024 * 1024) {
          await yieldToUI();
          return uint8ToBase64(bytes);
        }
        const chunks: string[] = [];
        for (let i = 0; i < bytes.length; i += CHUNK) {
          const chunk = bytes.slice(i, i + CHUNK);
          chunks.push(String.fromCharCode.apply(null, Array.from(chunk)));
          if (chunks.length % YIELD_EVERY === 0) {
            setGenerationStatus('Подготовка к записи…');
            setGenerationProgress({ current: 95 + Math.min(2, Math.floor((i / bytes.length) * 3)), total: 100 });
            await yieldToUI();
          }
        }
        await yieldToUI();
        return btoa(chunks.join(''));
      };

      const fileName = `project_${projectId || 'export'}_${Date.now()}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      // Узкое место: сериализация 50+ страниц. Отдаём управление, чтобы UI успел показать статус.
      setGenerationStatus(isLargeDoc ? 'Сериализация PDF (1–2 мин)…' : 'Сериализация PDF…');
      await yieldToUI();
      let base64: string | null = null;
      const saveOpts = { useObjectStreams: true, addDefaultPage: false };
      if (isLargeDoc) {
        try {
          console.log('[PDF Export] Начинаем сериализацию (save), таймаут 3 мин…');
          const pdfBytes = await withTimeout({
            label: 'pdfDoc.save',
            timeoutMs: 180000,
            task: async () => pdfDoc.save(saveOpts),
          });
          console.log('[PDF Export] save() готов, размер', Math.round(pdfBytes.length / 1024), 'KB');
          setGenerationStatus('Подготовка к записи…');
          base64 = await uint8ToBase64Async(pdfBytes);
        } catch {
          try {
            setGenerationStatus('Сериализация PDF…');
            base64 = await withTimeout({
              label: 'pdfDoc.saveAsBase64',
              timeoutMs: 180000,
              task: async () =>
                (pdfDoc as any).saveAsBase64({ dataUri: false, ...saveOpts }),
            });
          } catch {
            base64 = null;
          }
        }
      } else {
        try {
          base64 = await withTimeout({
            label: 'pdfDoc.saveAsBase64',
            timeoutMs: 60000,
            task: async () =>
              (pdfDoc as any).saveAsBase64({
                dataUri: false,
                ...saveOpts,
              }),
          });
        } catch {
          const pdfBytes = await withTimeout({
            label: 'pdfDoc.save',
            timeoutMs: 60000,
            task: async () => pdfDoc.save(saveOpts),
          });
          base64 = uint8ToBase64(pdfBytes);
        }
      }
      if (!base64) throw new Error('Не удалось сериализовать PDF');
      console.log('[PDF Export] Сериализация завершена');

      setGenerationProgress({ current: 98, total: 100 });
      setGenerationStatus('Запись на диск…');

      await withTimeout({
        label: 'write pdf file',
        timeoutMs: 90000,
        task: async () =>
          FileSystem.writeAsStringAsync(fileUri, base64!, {
            encoding: FileSystem.EncodingType.Base64,
          }),
      });
      console.log('[PDF Export] Запись на диск завершена');

      setGenerationProgress({ current: 100, total: 100 });
      const savePhaseMs = Date.now() - savePhaseStart;
      console.log(`[PDF Export] PDF успешно создан: ${fileUri} (сохранение заняло ${Math.round(savePhaseMs / 1000)} с)`);

      // Сразу показываем результат пользователю, не дожидаясь истории и облака
      setPdfUri(fileUri);
      setShowPreview(true);

      // История и пуш в облако — в фоне, чтобы не блокировать показ PDF
      const historyPayload = { fileUri, fileName, projectId, formatToUse };
      Promise.resolve().then(async () => {
        try {
          const accessCode = await AsyncStorage.getItem('@access_code');
          if (!accessCode) return;
          const { fileUri: uri, fileName: fName, projectId: pId, formatToUse: fmt } = historyPayload;
          let projectName = 'Проект';
          if (pId) {
            const projectData = await AsyncStorage.getItem(`@project_${pId}`);
            if (projectData) {
              const project = JSON.parse(projectData);
              projectName = project.title || project.name || 'Проект';
            }
          }
          const exportRecord = {
            id: `${pId || 'export'}_${Date.now()}`,
            projectId: pId || null,
            projectName,
            format: fmt.name,
            date: new Date().toISOString(),
            fileUri: uri,
            fileName: fName,
          };
          const historyKey = `@export_history_${accessCode}`;
          const existingHistory = await AsyncStorage.getItem(historyKey);
          const history: any[] = existingHistory ? JSON.parse(existingHistory) : [];
          history.push(exportRecord);
          const trimmedHistory = history.slice(-100);
          await AsyncStorage.setItem(historyKey, JSON.stringify(trimmedHistory));
          await pushAccountDataToCloud();
          scheduleSyncToCloud();
        } catch (e) {
          console.warn('[PDF Export] Фон: не удалось сохранить историю/облако:', e);
        }
      });

      // Для soft/electronic: всё уже в одном PDF (обложка + внутрянка + последняя страница)
      // Для hard: двухшаговый экспорт (шаг 1 = развёртка из albums/export, шаг 2 = внутрянка)
      if (formatToUse.type === 'hard') {
        setDownloadStep(1);
      } else {
        setDownloadStep(2);
        setFirstLastDownloaded(true);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Ошибка', 'Не удалось создать PDF файл. ' + (error as Error).message);
    } finally {
      setIsGenerating(false);
      setGenerationStatus(null);
    }
  };

  const handleDownloadCoverPdf = async () => {
    try {
      setIsDownloadingCover(true);
      
      // Получаем coverType и category из параметров или данных проекта
      let coverType = coverTypeParam;
      let category = celebrationParam;
      
      console.log(`[PDF Export] handleDownloadCoverPdf - начало. coverTypeParam=${coverTypeParam}, celebrationParam=${celebrationParam}, projectId=${projectId}`);
      
      if (!coverType || !category) {
        // Пытаемся получить из данных проекта
        if (projectId) {
          const projectData = await AsyncStorage.getItem(`@project_${projectId}`);
          console.log(`[PDF Export] Загружены данные проекта: ${projectData ? 'да' : 'нет'}`);
          if (projectData) {
            const project = JSON.parse(projectData);
            console.log(`[PDF Export] Данные проекта:`, { coverType: project.coverType, category: project.category, albumId: project.albumId });
            if (!coverType && project.coverType) {
              coverType = project.coverType;
            }
            if (!category && project.category) {
              category = project.category;
            }
            
            // Fallback: если coverType не найден, определяем его по albumId
            if (!coverType && project.albumId) {
              const albumId = project.albumId;
              if (albumId.includes('premium')) {
                coverType = 'premium';
              } else if (albumId.includes('classic')) {
                coverType = 'classic';
              } else if (albumId.includes('soft')) {
                coverType = 'soft';
              } else if (albumId.includes('floral')) {
                coverType = 'floral';
              } else {
                coverType = 'standard';
              }
              console.log(`[PDF Export] CoverType определен по albumId: ${albumId} -> ${coverType}`);
            }
            
            // Fallback: если category не найдена, определяем ее по albumId
            if (!category && project.albumId) {
              const albumId = project.albumId;
              if (albumId.startsWith('pregnancy') || albumId.includes('pregnancy')) {
                category = 'pregnancy';
              } else if (albumId.startsWith('kids') || albumId.includes('kids')) {
                category = 'kids';
              }
              console.log(`[PDF Export] Category определена по albumId: ${albumId} -> ${category}`);
            }
          }
        }
      }
      
      console.log(`[PDF Export] После загрузки из проекта: coverType=${coverType}, category=${category}`);

      if (!coverType || !category) {
        console.error(`[PDF Export] Ошибка: не удалось определить тип обложки. coverType=${coverType}, category=${category}`);
        Alert.alert('Ошибка', 'Не удалось определить тип обложки. Пожалуйста, попробуйте пересоздать проект или обратитесь в поддержку.');
        setIsDownloadingCover(false);
        return;
      }

      // Получаем имя файла PDF обложки
      console.log(`[PDF Export] Вызов getCoverExportPdfFileNameFromCoverType(coverType=${coverType}, category=${category}, 'hard')`);
      const fileName = getCoverExportPdfFileNameFromCoverType(coverType, category, 'hard');
      console.log(`[PDF Export] Получено имя файла: ${fileName}`);
      if (!fileName) {
        Alert.alert('Ошибка', 'Не удалось определить имя файла обложки');
        setIsDownloadingCover(false);
        return;
      }

      const pdfUri = await downloadExportCoverPdfToCache(fileName);

      if (!pdfUri) {
        Alert.alert('Ошибка', `Не удалось загрузить PDF файл обложки: ${fileName}`);
        setIsDownloadingCover(false);
        return;
      }

      // Скачиваем файл
      if (Platform.OS === 'android') {
        try {
          const RNBlobUtil = require('react-native-blob-util').default;
          const { fs, config } = RNBlobUtil;
          
          const base64 = await FileSystem.readAsStringAsync(pdfUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          const downloadOptions = {
            fileCache: true,
            addAndroidDownloads: {
              useDownloadManager: true,
              notification: true,
              title: fileName,
              description: 'PDF обложка',
              mime: 'application/pdf',
              mediaScannable: true,
              path: `${fs.dirs.DownloadDir}/${fileName}`,
            },
          };
          
          const tempPath = `${fs.dirs.CacheDir}/${fileName}`;
          await fs.writeFile(tempPath, base64, 'base64');
          await config(downloadOptions).fetch('GET', `file://${tempPath}`);
          fs.unlink(tempPath).catch(() => {});
          
          Alert.alert('Успешно', `Обложка сохранена в папку "Загрузки": ${fileName}`);
          setCoverDownloaded(true);
          setDownloadStep(2);
        } catch (blobError) {
          console.warn('react-native-blob-util failed, using fallback:', blobError);
          const fileUri = `${FileSystem.documentDirectory}${fileName}`;
          await FileSystem.copyAsync({
            from: pdfUri,
            to: fileUri,
          });
          Alert.alert('Успешно', `Обложка сохранена: ${fileName}`);
          setCoverDownloaded(true);
          setDownloadStep(2);
        }
      } else if (Platform.OS === 'ios') {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(pdfUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Сохранить обложку',
            UTI: 'com.adobe.pdf',
          });
          setDownloadStep(2);
        } else {
          const fileUri = `${FileSystem.documentDirectory}${fileName}`;
          await FileSystem.copyAsync({
            from: pdfUri,
            to: fileUri,
          });
          Alert.alert('Успешно', `Обложка сохранена: ${fileName}`);
          setCoverDownloaded(true);
          setDownloadStep(2);
        }
      } else {
        const base64 = await FileSystem.readAsStringAsync(pdfUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${base64}`;
        link.download = fileName;
        link.click();
        Alert.alert('Успешно', `Обложка скачана: ${fileName}`);
        setDownloadStep(2);
      }
    } catch (error) {
      console.error('Error downloading cover PDF:', error);
      Alert.alert('Ошибка', 'Не удалось скачать обложку: ' + (error as Error).message);
    } finally {
      setIsDownloadingCover(false);
    }
  };

  const handleDownloadFirstLastPdf = async () => {
    if (!firstLastPdfUri) return;
    setIsDownloadingFirstLast(true);
    try {
      const fileName = `firstlast_${projectId || 'export'}_${Date.now()}.pdf`;
      if (Platform.OS === 'android') {
        try {
          const RNBlobUtil = require('react-native-blob-util').default;
          const { fs, config } = RNBlobUtil;
          const base64 = await FileSystem.readAsStringAsync(firstLastPdfUri, { encoding: FileSystem.EncodingType.Base64 });
          const downloadOptions = {
            fileCache: true,
            addAndroidDownloads: {
              useDownloadManager: true,
              notification: true,
              title: fileName,
              description: 'PDF первая и последняя страница',
              mime: 'application/pdf',
              mediaScannable: true,
              path: `${fs.dirs.DownloadDir}/${fileName}`,
            },
          };
          const tempPath = `${fs.dirs.CacheDir}/${fileName}`;
          await fs.writeFile(tempPath, base64, 'base64');
          await config(downloadOptions).fetch('GET', `file://${tempPath}`);
          fs.unlink(tempPath).catch(() => {});
          Alert.alert('Успешно', `Первая и последняя страница сохранены в папку "Загрузки": ${fileName}`);
        } catch (blobError) {
          const destUri = `${FileSystem.documentDirectory}${fileName}`;
          await FileSystem.copyAsync({ from: firstLastPdfUri, to: destUri });
          Alert.alert('Успешно', `Файл сохранён: ${fileName}`);
        }
        setFirstLastDownloaded(true);
        setDownloadStep(2);
      } else if (Platform.OS === 'ios') {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(firstLastPdfUri, { mimeType: 'application/pdf', dialogTitle: 'Сохранить первую и последнюю страницу', UTI: 'com.adobe.pdf' });
        } else {
          const destUri = `${FileSystem.documentDirectory}${fileName}`;
          await FileSystem.copyAsync({ from: firstLastPdfUri, to: destUri });
          Alert.alert('Успешно', `Файл сохранён: ${fileName}`);
        }
        setFirstLastDownloaded(true);
        setDownloadStep(2);
      } else {
        const base64 = await FileSystem.readAsStringAsync(firstLastPdfUri, { encoding: FileSystem.EncodingType.Base64 });
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${base64}`;
        link.download = fileName;
        link.click();
        Alert.alert('Успешно', `Файл скачан: ${fileName}`);
        setFirstLastDownloaded(true);
        setDownloadStep(2);
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось скачать: ' + (error as Error).message);
    } finally {
      setIsDownloadingFirstLast(false);
    }
  };

  const handleDownloadInteriorPdf = async () => {
    if (!pdfUri) {
      Alert.alert('Ошибка', 'PDF файл внутренней части не готов');
      return;
    }

    setIsDownloadingInterior(true);
    try {
      const fileName = `project_${projectId || 'export'}_${Date.now()}.pdf`;
      
      if (Platform.OS === 'android') {
        try {
          const RNBlobUtil = require('react-native-blob-util').default;
          const { fs, config } = RNBlobUtil;
          
          const base64 = await FileSystem.readAsStringAsync(pdfUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          const downloadOptions = {
            fileCache: true,
            addAndroidDownloads: {
              useDownloadManager: true,
              notification: true,
              title: fileName,
              description: 'PDF внутренняя часть',
              mime: 'application/pdf',
              mediaScannable: true,
              path: `${fs.dirs.DownloadDir}/${fileName}`,
            },
          };
          
          const tempPath = `${fs.dirs.CacheDir}/${fileName}`;
          await fs.writeFile(tempPath, base64, 'base64');
          await config(downloadOptions).fetch('GET', `file://${tempPath}`);
          fs.unlink(tempPath).catch(() => {});
          
          Alert.alert('Успешно', `Внутренняя часть сохранена в папку "Загрузки": ${fileName}`);
          setInteriorDownloaded(true);
        } catch (blobError) {
          console.warn('react-native-blob-util failed, using fallback:', blobError);
          const fileUri = `${FileSystem.documentDirectory}${fileName}`;
          await FileSystem.copyAsync({
            from: pdfUri,
            to: fileUri,
          });
          Alert.alert('Успешно', `Внутренняя часть сохранена: ${fileName}`);
        }
      } else if (Platform.OS === 'ios') {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(pdfUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Сохранить внутреннюю часть',
            UTI: 'com.adobe.pdf',
          });
        } else {
          const fileUri = `${FileSystem.documentDirectory}${fileName}`;
          await FileSystem.copyAsync({
            from: pdfUri,
            to: fileUri,
          });
          Alert.alert('Успешно', `Внутренняя часть сохранена: ${fileName}`);
        }
      } else {
        const base64 = await FileSystem.readAsStringAsync(pdfUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${base64}`;
        link.download = fileName;
        link.click();
        Alert.alert('Успешно', `Внутренняя часть скачана: ${fileName}`);
      }
    } catch (error) {
      console.error('Error downloading interior PDF:', error);
      Alert.alert('Ошибка', 'Не удалось скачать внутреннюю часть: ' + (error as Error).message);
    } finally {
      setIsDownloadingInterior(false);
    }
  };

  const handleDownload = async () => {
    if (!pdfUri) return;

    try {
      const fileName = `project_${projectId || 'export'}_${Date.now()}.pdf`;
      
      if (Platform.OS === 'android') {
        // Для Android используем react-native-blob-util для сохранения в папку Downloads
        try {
          const RNBlobUtil = require('react-native-blob-util').default;
          const { fs, config } = RNBlobUtil;
          
          // Читаем файл как base64
          const base64 = await FileSystem.readAsStringAsync(pdfUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          // Сохраняем в папку Downloads через DownloadManager
          const downloadOptions = {
            fileCache: true,
            addAndroidDownloads: {
              useDownloadManager: true,
              notification: true,
              title: fileName,
              description: 'PDF файл',
              mime: 'application/pdf',
              mediaScannable: true,
              path: `${fs.dirs.DownloadDir}/${fileName}`,
            },
          };
          
          // Создаем временный файл и скачиваем его через DownloadManager
          const tempPath = `${fs.dirs.CacheDir}/${fileName}`;
          await fs.writeFile(tempPath, base64, 'base64');
          
          // Используем config для правильного сохранения через DownloadManager
          const response = await config(downloadOptions).fetch('GET', `file://${tempPath}`);
          
          // Удаляем временный файл
          fs.unlink(tempPath).catch(() => {});
          
          Alert.alert('Успешно', `Файл сохранён в папку "Загрузки": ${fileName}`);
        } catch (blobError) {
          // Fallback: используем стандартный метод
          console.warn('react-native-blob-util failed, using fallback:', blobError);
          const fileUri = `${FileSystem.documentDirectory}${fileName}`;
          await FileSystem.copyAsync({
            from: pdfUri,
            to: fileUri,
          });
          Alert.alert('Успешно', `Файл сохранён: ${fileName}`);
        }
      } else if (Platform.OS === 'ios') {
        // Для iOS используем Sharing API для сохранения в Files app
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(pdfUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Сохранить PDF',
            UTI: 'com.adobe.pdf',
          });
        } else {
          // Fallback: сохраняем в документы
          const fileUri = `${FileSystem.documentDirectory}${fileName}`;
          await FileSystem.copyAsync({
            from: pdfUri,
            to: fileUri,
          });
          Alert.alert('Успешно', `Файл сохранён: ${fileName}`);
        }
      } else {
        // Для веб просто скачиваем файл
        const base64 = await FileSystem.readAsStringAsync(pdfUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${base64}`;
        link.download = fileName;
        link.click();
        Alert.alert('Успешно', `Файл скачан: ${fileName}`);
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить файл: ' + (error as Error).message);
    }
  };

  const handleShare = async () => {
    if (!pdfUri) return;

    try {
      // Проверяем существование файла
      const fileInfo = await FileSystem.getInfoAsync(pdfUri);
      if (!fileInfo.exists) {
        Alert.alert('Ошибка', 'PDF файл не найден');
        return;
      }

      if (Platform.OS === 'web') {
        // Для веб используем Web Share API
        const base64 = await FileSystem.readAsStringAsync(pdfUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const blob = await fetch(`data:application/pdf;base64,${base64}`).then(r => r.blob());
        const file = new File([blob], `project_${projectId || 'export'}_${Date.now()}.pdf`, { type: 'application/pdf' });
        
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'PDF файл',
          });
        } else {
          Alert.alert('Недоступно', 'Функция отправки недоступна в этом браузере');
        }
      } else {
        // Для мобильных устройств используем expo-sharing
        // expo-sharing работает с URI с префиксом file:// или без него
        
        // Проверяем доступность sharing
        const isAvailable = await Sharing.isAvailableAsync();
        if (!isAvailable) {
          Alert.alert('Недоступно', 'Функция отправки недоступна на этом устройстве');
          return;
        }
        
        // Используем оригинальный URI - expo-sharing сам обработает его правильно
        // На iOS и Android expo-sharing принимает URI с file:// префиксом
        let shareUri = pdfUri;
        
        // Убеждаемся, что URI имеет правильный формат
        if (!shareUri.startsWith('file://') && !shareUri.startsWith('http://') && !shareUri.startsWith('https://')) {
          shareUri = `file://${shareUri}`;
        }
        
        // Для Android получаем content:// URI, чтобы мессенджеры (в т.ч. Telegram) точно приняли файл
        if (Platform.OS === 'android') {
          try {
            shareUri = await FileSystem.getContentUriAsync(shareUri);
          } catch (contentErr) {
            // Если не удалось, остаемся на file://
          }
        }
        
        try {
          // expo-sharing shareAsync принимает URI и опциональные параметры
          // Для PDF файлов указываем mimeType
          const shareOptions = {
            mimeType: 'application/pdf',
            dialogTitle: 'Отправить PDF',
            ...(Platform.OS === 'ios' && { UTI: 'com.adobe.pdf' }),
          };
          
          // Вызываем shareAsync - это откроет системный диалог отправки
          await Sharing.shareAsync(shareUri, shareOptions);
        } catch (sharingError) {
          
          // Проверяем, не отменил ли пользователь отправку
          const errorMessage = (sharingError as Error).message || String(sharingError);
          const errorCode = (sharingError as any)?.code;
          
          if (
            errorMessage.includes('canceled') || 
            errorMessage.includes('Canceled') || 
            errorMessage.includes('User canceled') ||
            errorMessage.includes('cancelled') ||
            errorCode === 'ERR_CANCELED' ||
            errorCode === 'USER_CANCELED' ||
            errorCode === 'CANCELED'
          ) {
            // Пользователь отменил отправку - это нормально, не показываем ошибку
            return;
          }
          
          // Показываем ошибку с предложением сохранить файл
          Alert.alert(
            'Ошибка отправки',
            `Не удалось отправить файл.\n\nОшибка: ${errorMessage}\n\nПопробуйте сохранить файл и отправить его вручную через приложение.`,
            [
              { text: 'ОК', style: 'default' },
              {
                text: 'Сохранить',
                onPress: () => handleDownload(),
              },
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error in handleShare:', error);
      const errorMessage = (error as Error).message || String(error);
      
      // Если пользователь отменил отправку, не показываем ошибку
      if (
        errorMessage.includes('canceled') || 
        errorMessage.includes('Canceled') || 
        errorMessage.includes('User canceled') ||
        errorMessage.includes('cancelled')
      ) {
        return;
      }
      
      Alert.alert('Ошибка', 'Не удалось отправить файл: ' + errorMessage);
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
        {/* Оверлей генерации — как на "старом" экране (центральная плашка) */}
        {isGenerating ? (
          <View style={styles.exportOverlay} pointerEvents="auto">
            <View style={styles.exportOverlayCard}>
              <Animated.View style={loadingAnimatedStyle}>
                <Ionicons name="refresh" size={28} color="#C9A89A" />
              </Animated.View>
              <Text style={styles.exportOverlayTitle}>Создание PDF…</Text>
              {generationStatus ? (
                <Text style={styles.exportOverlaySubtitle}>{generationStatus}</Text>
              ) : null}
              {generationProgress.total > 0 ? (
                <Text style={styles.exportOverlaySubtitle}>
                  {generationProgress.current}/{generationProgress.total}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Скрытый рендерер страницы для “1 в 1” экспорта через снапшот */}
        {renderingPage ? (
          <View style={{ position: 'absolute', left: -10000, top: -10000, opacity: 0 }}>
            <PageRenderer
              ref={pageRendererRef}
              imageUri={renderingPage.imageUri}
              annotations={renderingPage.annotations}
              width={renderingPage.viewport.width}
              height={renderingPage.viewport.height}
              captureFormat="jpg"
              captureScale={captureSettingsRef.current.scale}
              captureQuality={captureSettingsRef.current.quality}
              onReady={() => setPageRendererReady(true)}
            />
          </View>
        ) : null}

        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="На главный экран"
          >
            <Ionicons name="chevron-back" size={24} color="#8B6F5F" />
          </TouchableOpacity>
          <Text style={styles.title}>Получить книгу</Text>
        </View>

        <ScrollView
          ref={scrollViewRef}
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
                  onPress={() => {
                    setSelectedFormat(format);
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 150);
                  }}
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
                        name={format.type === 'hard' ? 'book' : format.type === 'electronic' ? 'phone-portrait-outline' : 'book-outline'}
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
                onPress={() => {
                  if (selectedFormat) {
                    handleCreatePdfWithFormat(selectedFormat);
                  }
                }}
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
              {downloadStep && selectedFormat?.type === 'hard' ? (
                <View style={styles.downloadStepsContainer}>
                  <Text style={styles.downloadStepsTitle}>Скачивание книги</Text>
                  <Text style={styles.downloadStepsSubtitle}>
                    Для твёрдого переплёта скачайте развертку обложки и внутрянку отдельно
                  </Text>

                  {/* Шаг 1: Развертка обложки */}
                  <View style={styles.downloadStepCard}>
                    <View style={styles.downloadStepHeader}>
                      <View style={[
                        styles.downloadStepNumber,
                        coverDownloaded && styles.downloadStepNumberCompleted
                      ]}>
                        {coverDownloaded ? (
                          <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                        ) : (
                          <Text style={styles.downloadStepNumberText}>1</Text>
                        )}
                      </View>
                      <View style={styles.downloadStepInfo}>
                        <Text style={styles.downloadStepTitle}>Скачать развертку обложки</Text>
                        <Text style={styles.downloadStepDescription}>
                          PDF развертка для типографии
                        </Text>
                      </View>
                    </View>
                    {coverDownloaded ? (
                      <View style={styles.downloadStepButton}>
                        <Text style={styles.downloadStepButtonText}>Готово</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.downloadStepButton, isDownloadingCover && styles.downloadStepButtonDisabled]}
                        onPress={handleDownloadCoverPdf}
                        disabled={isDownloadingCover}
                        activeOpacity={0.7}
                      >
                        {isDownloadingCover ? (
                          <Text style={styles.downloadStepButtonText}>Скачивание...</Text>
                        ) : (
                          <>
                            <Ionicons name="download-outline" size={20} color="#FFFFFF" />
                            <Text style={styles.downloadStepButtonText}>Скачать развертку</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Шаг 2: Внутрянка */}
                  <View style={styles.downloadStepCard}>
                    <View style={styles.downloadStepHeader}>
                      <View style={[
                        styles.downloadStepNumber,
                        interiorDownloaded && styles.downloadStepNumberCompleted
                      ]}>
                        {interiorDownloaded ? (
                          <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                        ) : (
                          <Text style={styles.downloadStepNumberText}>2</Text>
                        )}
                      </View>
                      <View style={styles.downloadStepInfo}>
                        <Text style={styles.downloadStepTitle}>Скачать внутрянку</Text>
                        <Text style={styles.downloadStepDescription}>
                          PDF с отредактированными страницами
                        </Text>
                      </View>
                    </View>
                    {interiorDownloaded ? (
                      <View style={styles.downloadStepButton}>
                        <Text style={styles.downloadStepButtonText}>Готово</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.downloadStepButton,
                          (downloadStep < 2 || isDownloadingInterior) && styles.downloadStepButtonDisabled
                        ]}
                        onPress={handleDownloadInteriorPdf}
                        disabled={downloadStep < 2 || isDownloadingInterior}
                        activeOpacity={0.7}
                      >
                        {isDownloadingInterior ? (
                          <Text style={styles.downloadStepButtonText}>Скачивание...</Text>
                        ) : (
                          <>
                            <Ionicons name="download-outline" size={20} color="#FFFFFF" />
                            <Text style={styles.downloadStepButtonText}>Скачать внутрянку</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ) : downloadStep ? (
                <View style={styles.downloadStepsContainer}>
                  <Text style={styles.downloadStepsTitle}>Книга готова</Text>
                  <Text style={styles.downloadStepsSubtitle}>
                    Обложка, внутренние страницы и последняя страница объединены в один PDF
                  </Text>

                  <View style={styles.downloadStepCard}>
                    <View style={styles.downloadStepHeader}>
                      <View style={[
                        styles.downloadStepNumber,
                        interiorDownloaded && styles.downloadStepNumberCompleted
                      ]}>
                        {interiorDownloaded ? (
                          <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                        ) : (
                          <Ionicons name="book" size={20} color="#8B6F5F" />
                        )}
                      </View>
                      <View style={styles.downloadStepInfo}>
                        <Text style={styles.downloadStepTitle}>Скачать книгу</Text>
                        <Text style={styles.downloadStepDescription}>
                          Полный PDF: обложка + страницы + последняя страница
                        </Text>
                      </View>
                    </View>
                    {interiorDownloaded ? (
                      <View style={styles.downloadStepButton}>
                        <Text style={styles.downloadStepButtonText}>Готово</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.downloadStepButton,
                          isDownloadingInterior && styles.downloadStepButtonDisabled
                        ]}
                        onPress={handleDownloadInteriorPdf}
                        disabled={isDownloadingInterior}
                        activeOpacity={0.7}
                      >
                        {isDownloadingInterior ? (
                          <Text style={styles.downloadStepButtonText}>Скачивание...</Text>
                        ) : (
                          <>
                            <Ionicons name="download-outline" size={20} color="#FFFFFF" />
                            <Text style={styles.downloadStepButtonText}>Скачать книгу</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ) : null}

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
  exportOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 50,
    backgroundColor: 'rgba(250, 248, 245, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  exportOverlayCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8D5C7',
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 10,
  },
  exportOverlayTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B6F5F',
  },
  exportOverlaySubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9B8E7F',
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
  downloadStepsContainer: {
    marginTop: 24,
    marginBottom: 24,
  },
  downloadStepsTitle: {
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
  },
  downloadStepsSubtitle: {
    fontSize: 14,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    marginBottom: 24,
    lineHeight: 20,
  },
  downloadStepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#F0E8E0',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  downloadStepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  downloadStepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0E8E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  downloadStepNumberCompleted: {
    backgroundColor: '#C9A89A',
  },
  downloadStepNumberText: {
    fontSize: 18,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
  },
  downloadStepInfo: {
    flex: 1,
  },
  downloadStepTitle: {
    fontSize: 18,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
    marginBottom: 4,
  },
  downloadStepDescription: {
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
  downloadStepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C9A89A',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  downloadStepButtonDisabled: {
    backgroundColor: '#D4C4B5',
    opacity: 0.6,
  },
  downloadStepButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
  },
});

