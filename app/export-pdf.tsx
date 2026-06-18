import { colors, createShadow, radii, sansFont } from '@/constants/design-tokens';
import { PdfIcon } from '@/components/icons/pdf-icon';
import PageRenderer, { type PageRendererRef } from '@/components/page-renderer';
import PdfSkeletonLoader from '@/components/pdf-skeleton-loader';
import { Annotation } from '@/components/pdf-annotations';
import { SubscriptionPaywallModal } from '@/components/subscription-paywall-modal';
import { requiresPrintSubscription } from '@/constants/subscription';
import { useExportSubscription } from '@/contexts/export-subscription-context';
import { getAccountSyncId } from '@/utils/account-identity';
import { pushAccountDataToCloud, scheduleSyncToCloud } from '@/utils/account-sync';
import { getExportCoverPages, isSameExportImageUri } from '@/utils/albumFirstLastPages';
import {
  ensureAlbumPagesCachedForExport,
  ensurePageUrisCachedForExport,
  ensureRemoteAlbumPageCachedByIndex,
  ensureSinglePageUriCachedForExport,
  getAlbumImageUris,
  getBlankInteriorPageUri,
  resolveLineGuideId,
} from '@/utils/albumImages';
import { drawTemplateTextOnPdfPage } from '@/utils/exportTemplateText';
import { ensureProjectAnnotationsSynced } from '@/utils/ensureProjectAnnotationsSynced';
import {
  getExportFormatOptions,
  type ExportFormatType,
} from '@/utils/exportFormatOptions';
import { getSchemaForInstance } from '@/utils/albumProjectInit';
import {
  filterProjectDataForExport,
  getExportSelectionStorageKey,
  mergeStaticPagesIntoExportSelection,
} from '@/utils/exportPageSelection';
import { loadPageInstances } from '@/utils/pageStorage';
import {
  getContentRect,
  mapViewportAnnotationToPdf,
} from '@/utils/imageContentRect';
import { computeObjectFitCover } from '@/utils/imageCoverDraw';
import {
  getCachedPageSourceSize,
  resolvePageSourceSize,
} from '@/utils/pageSourceDimensions';
import { hasLineGuides } from '@/utils/textLineSlots';
import { getCoverExportPdfFileNameFromCoverType } from '@/utils/coverExportPdfMapping';
import { getCoverImageUris } from '@/utils/coverImagesLoader';
import { getCoverForExport } from '@/utils/coverMapping';
import { getCoverPdfForExport } from '@/utils/coverPdfMapping';
import { downloadExportCoverPdfToCache } from '@/utils/exportCoverPdfDownloader';
import {
  ELECTRONIC_CAPTURE_QUALITY,
  ELECTRONIC_CAPTURE_SCALE,
  getElectronicJpegQuality,
  getElectronicRasterMaxSide,
  getExportPageDimensions,
} from '@/utils/exportPageDimensions';
import { preloadFontsForPdf } from '@/utils/fontLoader';
import { Ionicons } from '@expo/vector-icons';
import fontkit from '@pdf-lib/fontkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';
import * as FileSystemModern from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { PDFDocument, cmyk, rgb, clip, endPath, popGraphicsState, pushGraphicsState, rectangle, type Color, type PDFPage, type PDFFont } from 'pdf-lib';

function hexToColor(hex: string, useCmyk: boolean) {
  const r = parseInt(hex.substring(1, 3), 16) / 255;
  const g = parseInt(hex.substring(3, 5), 16) / 255;
  const b = parseInt(hex.substring(5, 7), 16) / 255;
  if (!useCmyk) return rgb(r, g, b);
  const k = 1 - Math.max(r, g, b);
  if (k >= 1) return cmyk(0, 0, 0, 1);
  return cmyk((1 - r - k) / (1 - k), (1 - g - k) / (1 - k), (1 - b - k) / (1 - k), k);
}

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
    withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

function drawTextAnnotationOnPdfPage(params: {
  page: PDFPage;
  ann: Annotation;
  lineGuideId: string | null;
  pageNumber: number;
  pagesViewport: { width: number; height: number };
  sourceWidth: number;
  sourceHeight: number;
  offsetX: number;
  offsetY: number;
  actualImageWidth: number;
  actualImageHeight: number;
  font?: PDFFont;
  color: Color;
}): void {
  const {
    page,
    ann,
    lineGuideId,
    pageNumber,
    pagesViewport,
    sourceWidth,
    sourceHeight,
    offsetX,
    offsetY,
    actualImageWidth,
    actualImageHeight,
    font,
    color,
  } = params;

  if (
    lineGuideId &&
    hasLineGuides(lineGuideId) &&
    typeof ann.templateLineStart === 'number' &&
    drawTemplateTextOnPdfPage({
      page,
      ann,
      lineGuideId,
      pageNumber:
        typeof ann.sourcePageNumber === 'number' ? ann.sourcePageNumber : pageNumber,
      pagesViewport,
      sourceWidth,
      sourceHeight,
      offsetX,
      offsetY,
      actualImageWidth,
      actualImageHeight,
      font,
      color,
    })
  ) {
    return;
  }

  const editorContentRect = getContentRect(
    pagesViewport.width,
    pagesViewport.height,
    sourceWidth,
    sourceHeight
  );

  const mapped = mapViewportAnnotationToPdf({
    x: ann.x,
    y: ann.y,
    width: ann.width,
    height: ann.height || 20,
    editorContentRect,
    pdfImageX: offsetX,
    pdfImageY: offsetY,
    pdfImageWidth: actualImageWidth,
    pdfImageHeight: actualImageHeight,
  });

  const scaledFontSize = (ann.fontSize || 16) * (mapped.height / (ann.height || 20));
  const text = ann.content ?? '';
  const textAlign = ann.textAlign ?? 'left';
  let drawX = mapped.x;

  if (font && textAlign !== 'left') {
    const textWidth = font.widthOfTextAtSize(text, scaledFontSize);
    if (textAlign === 'center') {
      drawX = mapped.x + (mapped.width - textWidth) / 2;
    } else if (textAlign === 'right') {
      drawX = mapped.x + mapped.width - textWidth;
    }
  }

  page.drawText(text, {
    x: drawX,
    y: mapped.y,
    size: scaledFontSize,
    color,
    font,
  });
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type ExportProgress = { current: number; total: number };

function formatExportProgressLabel(
  status: string | null,
  progress: ExportProgress
): string {
  if (progress.total > 0 && progress.current > 0) {
    return `${progress.current} из ${progress.total}`;
  }
  return status ?? 'Подготовка…';
}

function exportProgressPercent(progress: ExportProgress): number {
  if (progress.total <= 0) return 0;
  return Math.min(100, Math.max(0, (progress.current / progress.total) * 100));
}

async function drawImageAnnotationsOnPdfPage(params: {
  page: PDFPage;
  pdfDoc: PDFDocument;
  pageAnnotations: Annotation[];
  annotationImageMap: Map<string, Uint8Array | null>;
  embeddedImagesCache: Map<string, unknown>;
  pagesViewport: { width: number; height: number };
  sourceWidth: number;
  sourceHeight: number;
  pdfImageX: number;
  pdfImageY: number;
  pdfImageWidth: number;
  pdfImageHeight: number;
}): Promise<void> {
  const imageAnnotations = params.pageAnnotations
    .filter((ann: Annotation) => ann.type === 'image' && ann.imageUri)
    .sort((a: Annotation, b: Annotation) => (a.zIndex || 0) - (b.zIndex || 0));

  if (imageAnnotations.length === 0) return;

  const editorContentRect = getContentRect(
    params.pagesViewport.width,
    params.pagesViewport.height,
    params.sourceWidth,
    params.sourceHeight
  );

  for (const ann of imageAnnotations) {
    if (!ann.imageUri) continue;

    const annImageBytes = params.annotationImageMap.get(ann.imageUri);
    if (!annImageBytes) continue;

    try {
      let embeddedAnnImage = params.embeddedImagesCache.get(ann.imageUri);
      if (!embeddedAnnImage) {
        const isJpg = annImageBytes[0] === 0xff && annImageBytes[1] === 0xd8;
        embeddedAnnImage = isJpg
          ? await params.pdfDoc.embedJpg(annImageBytes)
          : await params.pdfDoc.embedPng(annImageBytes);
        params.embeddedImagesCache.set(ann.imageUri, embeddedAnnImage);
      }

      const mapped = mapViewportAnnotationToPdf({
        x: ann.x,
        y: ann.y,
        width: ann.width,
        height: ann.height,
        editorContentRect,
        pdfImageX: params.pdfImageX,
        pdfImageY: params.pdfImageY,
        pdfImageWidth: params.pdfImageWidth,
        pdfImageHeight: params.pdfImageHeight,
      });

      const embedded = embeddedAnnImage as Awaited<ReturnType<PDFDocument['embedJpg']>>;

      if (ann.imageContentFit === 'cover') {
        const cover = computeObjectFitCover(
          embedded.width,
          embedded.height,
          mapped.x,
          mapped.y,
          mapped.width,
          mapped.height,
        );
        params.page.pushOperators(
          pushGraphicsState(),
          rectangle(cover.clipX, cover.clipY, cover.clipWidth, cover.clipHeight),
          clip(),
          endPath(),
        );
        params.page.drawImage(embedded, {
          x: cover.drawX,
          y: cover.drawY,
          width: cover.drawWidth,
          height: cover.drawHeight,
        });
        params.page.pushOperators(popGraphicsState());
      } else {
        params.page.drawImage(embedded, {
          x: mapped.x,
          y: mapped.y,
          width: mapped.width,
          height: mapped.height,
        });
      }
    } catch {
      // ignore single annotation failures
    }
  }
}

async function savePdfToAndroidDirectory(params: {
  sourceUri: string;
  suggestedFileName: string;
  successMessage: string;
}): Promise<void> {
  const { sourceUri, suggestedFileName, successMessage } = params;

  // 1) SAF: пользователь выбирает папку (например, Downloads), файл пишется прямо туда.
  const saf: any = (FileSystemModern as any).StorageAccessFramework;
  if (saf?.requestDirectoryPermissionsAsync && saf?.createFileAsync) {
    const perms = await saf.requestDirectoryPermissionsAsync();
    if (perms?.granted && perms?.directoryUri) {
      const destUri: string = await saf.createFileAsync(
        perms.directoryUri,
        suggestedFileName,
        'application/pdf'
      );

      const base64 = await FileSystem.readAsStringAsync(sourceUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await FileSystem.writeAsStringAsync(destUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      Alert.alert('Успешно', successMessage);
      return;
    }
  }

  // 2) Fallback: sandbox + системное меню "Поделиться/Сохранить".
  const sandboxUri = `${FileSystem.documentDirectory}${suggestedFileName}`;
  await FileSystem.copyAsync({ from: sourceUri, to: sandboxUri });

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(sandboxUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Сохранить PDF',
      UTI: 'com.adobe.pdf',
    });
    return;
  }

  Alert.alert('Успешно', `Файл сохранён: ${suggestedFileName}`);
}

interface FormatOption {
  id: string;
  name: string;
  type: ExportFormatType;
  margins: string;
  size: string;
  orientation: string;
  description: string;
}

function getFormatOptions(category: string | null): FormatOption[] {
  return getExportFormatOptions(category);
}

type ExportPart = 'full' | 'interior' | 'first-last' | 'cover';

const CATEGORY_NAME_MAP: Record<string, string> = {
  pregnancy: 'беременность',
  kids: 'детство',
  family: 'семья',
  holidays: 'праздники',
  holiday: 'праздники',
};

const FORMAT_NAME_MAP: Record<FormatOption['type'], string> = {
  electronic: 'электронный',
  hard: 'твердый',
  soft: 'мягкий',
};

const EXPORT_PART_NAME_MAP: Record<ExportPart, string> = {
  full: 'альбом',
  interior: 'внутри',
  'first-last': 'первая_и_последняя',
  cover: 'обложка',
};

function sanitizeExportNameSegment(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^0-9A-Za-zА-Яа-яЁё_-]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
}

function getExportTimestamp(): string {
  const now = new Date();
  const YYYY = String(now.getFullYear());
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const DD = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${YYYY}${MM}${DD}_${hh}${mm}`;
}

function buildExportPdfFileName(params: {
  projectName?: string | null;
  projectId?: string | null;
  category?: string | null;
  formatType?: FormatOption['type'];
  part: ExportPart;
}): string {
  const { projectName, projectId, category, formatType, part } = params;
  const safeProjectName = sanitizeExportNameSegment(projectName || '');
  const baseProject = safeProjectName || `проект_${sanitizeExportNameSegment(projectId || 'export') || 'export'}`;
  const categoryLabel = category ? sanitizeExportNameSegment(CATEGORY_NAME_MAP[category] || category) : '';
  const formatLabel = formatType ? sanitizeExportNameSegment(FORMAT_NAME_MAP[formatType] || formatType) : '';
  const partLabel = sanitizeExportNameSegment(EXPORT_PART_NAME_MAP[part]);
  const timestamp = getExportTimestamp();
  const parts = [baseProject, categoryLabel, formatLabel, partLabel, timestamp].filter(Boolean);
  return `${parts.join('_')}.pdf`;
}

function resolveExportPdfFileName(
  params: Parameters<typeof buildExportPdfFileName>[0],
  override?: string | null
): string {
  const trimmed = override?.trim();
  if (trimmed) {
    return trimmed.toLowerCase().endsWith('.pdf') ? trimmed : `${trimmed}.pdf`;
  }
  return buildExportPdfFileName(params);
}

export default function ExportPdfScreen() {
  const params = useLocalSearchParams();
  const projectId = params.id as string;
  const formatParam = params.format as string | undefined;
  const coverTypeParam = params.coverType as string | undefined;
  const celebrationParam = params.celebration as string | undefined;
  const exportMode = params.mode as string | undefined;
  const electronicFileName = params.fileName as string | undefined;
  
  const [projectCat, setProjectCat] = useState<string | null>(null);
  const [projectTitleForExport, setProjectTitleForExport] = useState<string | null>(null);

  // Используем celebration из URL как fallback, пока категория не загружена из проекта
  const effectiveCategory = projectCat ?? (celebrationParam === 'holiday' ? 'holidays' : celebrationParam) ?? null;
  const formatOptions = React.useMemo(() => getFormatOptions(effectiveCategory), [effectiveCategory]);

  const [selectedFormat, setSelectedFormat] = useState<FormatOption | null>(null);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const pendingFormatRef = useRef<FormatOption | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const { isSubscribed, isIapEnabled, priceLabel } = useExportSubscription();

  const isFormatLocked = useCallback(
    (format: FormatOption) =>
      isIapEnabled && requiresPrintSubscription(format.type) && !isSubscribed,
    [isIapEnabled, isSubscribed]
  );

  const openPaywall = useCallback((format?: FormatOption) => {
    if (format) {
      pendingFormatRef.current = format;
    }
    setPaywallVisible(true);
  }, []);

  const handleFormatPress = useCallback(
    (format: FormatOption) => {
      if (isFormatLocked(format)) {
        openPaywall(format);
        return;
      }
      setSelectedFormat(format);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);
    },
    [isFormatLocked, openPaywall]
  );

  const handlePaywallSubscribed = useCallback(() => {
    const pending = pendingFormatRef.current;
    if (pending) {
      setSelectedFormat(pending);
      pendingFormatRef.current = null;
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, []);

  // При изменении категории (или при первом рендере) обновляем selectedFormat
  React.useEffect(() => {
    if (exportMode === 'electronic') {
      const electronic = formatOptions.find((f) => f.type === 'electronic');
      if (electronic) {
        setSelectedFormat(electronic);
      }
      return;
    }
    if (formatParam) {
      const found = formatOptions.find(f => f.id === formatParam) || null;
      setSelectedFormat(found);
    }
  }, [formatOptions, formatParam, exportMode]);

  const electronicExportStartedRef = useRef(false);
  const createPdfRef = useRef<(format?: FormatOption) => Promise<void>>(async () => {});
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
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
  
  // Для рендера страниц в фото (PageRenderer)
  const [renderingPage, setRenderingPage] = useState<{
    imageUri: string;
    annotations: Annotation[];
    pageNumber: number;
    viewport: { width: number; height: number };
    lineGuideId?: string;
    sourceWidth?: number;
    sourceHeight?: number;
  } | null>(null);
  const pageRendererRef = useRef<PageRendererRef>(null);
  const [pageRendererReady, setPageRendererReady] = useState(false);
  const pageSnapshotPromiseRef = useRef<{
    resolve: (uri: string | null) => void;
    reject: (error: Error) => void;
  } | null>(null);
  const captureSettingsRef = useRef<{ scale: number; quality: number }>({ scale: 1.35, quality: 0.92 });

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    // Загружаем категорию проекта для корректного отображения размеров
    if (projectId) {
      AsyncStorage.getItem(`@project_${projectId}`).then(data => {
        if (data) {
          try {
            const project = JSON.parse(data);
            if (project.title || project.name) {
              setProjectTitleForExport(project.title || project.name);
            }
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

  // Обработчик готовности PageRenderer
  useEffect(() => {
    if (pageRendererReady && pageRendererRef.current && pageSnapshotPromiseRef.current) {
      const captureSnapshot = async () => {
        try {
          // небольшая пауза на рендер аннотаций
          await new Promise(resolve => setTimeout(resolve, 250));
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

  const handleCreatePdfWithFormat = async (format?: FormatOption) => {
    const formatToUse = format || selectedFormat;
    if (!formatToUse) return;

    if (
      isIapEnabled &&
      requiresPrintSubscription(formatToUse.type) &&
      !isSubscribed
    ) {
      openPaywall(formatToUse);
      return;
    }

    setIsGenerating(true);
    setExportError(null);
    setShowPreview(false);
    setDownloadStep(null);
    setFirstLastPdfUri(null);
    setCoverDownloaded(false);
    setFirstLastDownloaded(false);
    setInteriorDownloaded(false);
    setGenerationStatus('Подготовка…');
    setGenerationProgress({ current: 0, total: 0 });

    try {
      let albumId: string | null = null;
      let projectCategory: string | null = null;
      let images: string[] = [];
      let annotations: Annotation[] = [];
      let coverImage: any = null;
      let coverPdf: any = null;
      let savedImages: string | null = null;
      let projectCoverType: string | null = null; // ID выбранной обложки (например, 'dfa_5', 'pregnancy_60')
      let projectInteriorType: string | null = null;

      // Если есть projectId, пытаемся загрузить данные проекта
      if (projectId) {
        const projectData = await AsyncStorage.getItem(`@project_${projectId}`);
        if (projectData) {
          const project = JSON.parse(projectData);
          albumId = project.albumId || projectId;
          projectInteriorType = project.interiorType ?? project.albumId ?? null;
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

          // Загружаем аннотации (синхронизируем из form-based page values)
          annotations = await ensureProjectAnnotationsSynced(projectId);

          const lineGuideId = resolveLineGuideId(
            projectInteriorType ?? albumId ?? '',
            projectCategory ?? undefined,
          );
          const blankPageUri = await getBlankInteriorPageUri(lineGuideId);
          const selectionRaw = await AsyncStorage.getItem(
            getExportSelectionStorageKey(projectId)
          );
          if (selectionRaw) {
            const storedIds = JSON.parse(selectionRaw) as string[];
            const instances = await loadPageInstances(
              (k) => AsyncStorage.getItem(k),
              projectId
            );
            const includedIds = mergeStaticPagesIntoExportSelection({
              instances,
              includedInstanceIds: storedIds,
              getSchema: (instance) => getSchemaForInstance(instance, lineGuideId),
            });
            const filtered = filterProjectDataForExport({
              instances,
              images,
              annotations,
              includedInstanceIds: includedIds,
              blankPageUri,
            });
            images = filtered.images;
            annotations = filtered.annotations;
            console.log(
              `[PDF Export] Selection filter: ${images.length} pages after export review`
            );
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
      if (!albumId && projectId) {
        albumId = projectId;
        console.warn(`[PDF Export] albumId не найден, используем projectId=${projectId}`);
      }

      if (!albumId) {
        console.error(`[PDF Export] Критическая ошибка: albumId не определен! projectId=${projectId}`);
        throw new Error('Не удалось определить альбом проекта. Пожалуйста, попробуйте пересоздать проект.');
      }
      
      console.log(`[PDF Export] Используем альбом: albumId=${albumId}, projectCategory=${projectCategory}, imagesCount=${images.length}`);

      const lineGuideAlbumId = projectInteriorType ?? albumId;
      const exportLineGuideId = resolveLineGuideId(
        lineGuideAlbumId ?? '',
        projectCategory ?? undefined,
      );

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

      if (images.length === 0 && albumId) {
        try {
          images = await ensureAlbumPagesCachedForExport(
            albumId,
            projectCategory,
            (done, total) => {
              setGenerationProgress({ current: done, total });
            }
          );
        } catch (error) {
          console.warn('[PDF Export] ensureAlbumPagesCachedForExport не удался:', error);
        }
      }

      if (images.length === 0) {
        const blankPageUri = await getBlankInteriorPageUri(exportLineGuideId);
        if (blankPageUri) {
          images = [blankPageUri];
          console.warn('[PDF Export] Используем пустой лист как запасную страницу экспорта');
        }
      }
      
      if (images.length === 0) {
        throw new Error('Изображения не найдены');
      }

      // Редактор хранит https:// ссылки — перед экспортом кэшируем только выбранные страницы
      if (images.length > 0) {
        setGenerationStatus('Загрузка страниц на устройство…');
        setGenerationProgress({ current: 0, total: images.length });
        images = await ensurePageUrisCachedForExport(images, (done, total) => {
          setGenerationProgress({ current: done, total });
        });
      }

      const hasRemotePageUris = images.some((uri) => uri?.startsWith('http'));
      if (hasRemotePageUris && lineGuideAlbumId) {
        try {
          setGenerationStatus('Догрузка шаблонов страниц…');
          const cachedAll = await ensureAlbumPagesCachedForExport(
            lineGuideAlbumId,
            projectCategory,
            (done, total) => {
              setGenerationProgress({ current: done, total });
            }
          );
          if (cachedAll.length > 0) {
            images = await Promise.all(
              images.map(async (uri, index) => {
                if (uri.startsWith('file://')) {
                  try {
                    const info = await FileSystem.getInfoAsync(uri);
                    if (info.exists) return uri;
                  } catch {
                    /* try fallback */
                  }
                }
                return (
                  cachedAll[index] ??
                  (await ensureRemoteAlbumPageCachedByIndex(
                    lineGuideAlbumId,
                    projectCategory,
                    index + 1
                  )) ??
                  uri
                );
              })
            );
          }
        } catch (cacheError) {
          console.warn('[PDF Export] Не удалось догрузить все страницы альбома:', cacheError);
        }
      }

      // Для двухшагового экспорта: первый шаг = первая+последняя (или развертка), второй шаг = внутрянка
      // ДЛЯ ТВЕРДОЙ: первая/последняя не добавляем (шаг 1 = развертка из export)
      // ДЛЯ МЯГКОЙ/ЭЛЕКТРОННОЙ: первая/последняя в отдельный PDF (шаг 1), внутрянка отдельно (шаг 2)
      const coverIdForFirstLast = projectCoverType || albumId;
      let exportFirstPageUri: string | null = null;
      let exportClosingPageUri: string | null = null;

      if (formatToUse.type === 'hard') {
        console.log(`[PDF Export] Для твердой обложки: внутрянка только, развертка скачивается отдельно`);
      } else {
        try {
          const { firstPage, closingPage } = await getExportCoverPages(
            coverIdForFirstLast,
            projectCategory,
            formatToUse.type
          );
          exportFirstPageUri = firstPage;
          if (closingPage && !isSameExportImageUri(closingPage, firstPage)) {
            const lastInteriorUri = images.length > 0 ? images[images.length - 1] : null;
            if (!isSameExportImageUri(closingPage, lastInteriorUri)) {
              exportClosingPageUri = closingPage;
            } else {
              console.log('[PDF Export] Финальная страница совпадает с последней внутренней — не дублируем');
            }
          }
          console.log(
            `[PDF Export] Обложка экспорта (${projectCategory ?? 'default'}): первая=${!!exportFirstPageUri}, финальная=${!!exportClosingPageUri}`
          );
        } catch (error) {
          console.warn(`[PDF Export] Ошибка загрузки страниц обложки:`, error);
        }
      }

      // Определяем размеры страницы (electronic = soft = A5)
      const {
        pageWidth,
        pageHeight,
        margin,
        contentWidth,
        contentHeight,
      } = getExportPageDimensions(formatToUse.type, projectCategory, exportLineGuideId);

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

      // Оптимизация изображений перед встраиванием в PDF.
      // electronic: A5 по размеру листа, ~72 DPI + низкое JPEG (экран, не печать).
      const optimizeImageForExport = async (uri: string, kind: 'page' | 'cover', isLargeDoc?: boolean) => {
        if (!uri) return uri;
        if (Platform.OS === 'web') return uri;

        let normalizedUri = uri.startsWith('/') ? `file://${uri}` : uri;

        if (normalizedUri.startsWith('http://') || normalizedUri.startsWith('https://')) {
          try {
            const cachePath = `${FileSystem.cacheDirectory}pdf_src_${hashStringToHex(normalizedUri)}.png`;
            const cached = await FileSystem.getInfoAsync(cachePath);
            if (!cached.exists) {
              await FileSystem.downloadAsync(normalizedUri, cachePath);
            }
            normalizedUri = cachePath.startsWith('file://') ? cachePath : `file://${cachePath}`;
          } catch {
            return uri;
          }
        }

        if (!normalizedUri.startsWith('file://')) return uri;

        const isElectronicExport = formatToUse.type === 'electronic';
        const maxSide = isElectronicExport
          ? getElectronicRasterMaxSide(kind, pageWidth, pageHeight, contentWidth, contentHeight)
          : kind === 'cover'
            ? 2400
            : isLargeDoc
              ? 1100
              : 2000;
        const quality = isElectronicExport
          ? getElectronicJpegQuality(kind)
          : kind === 'cover'
            ? 0.9
            : isLargeDoc
              ? 0.72
              : 0.9;

        const cacheKey = hashStringToHex(`${normalizedUri}|${kind}|${maxSide}|${quality}`);
        const outUri = `${FileSystem.cacheDirectory}pdf_fast_${kind}_${cacheKey}.jpg`;
        try {
          const existing = await FileSystem.getInfoAsync(outUri);
          if (existing.exists) return outUri;
        } catch {
          // ignore
        }

        try {
          const useLargeDocFallback = kind === 'page' && isLargeDoc && !isElectronicExport;
          const sidesToTry = useLargeDocFallback ? [1100, 800, 560] : [maxSide];

          for (const side of sidesToTry) {
            try {
              const result = await withTimeout({
                label: `ImageManipulator(${kind},${side})`,
                timeoutMs: isLargeDoc ? 45000 : 12000,
                task: async () =>
                  ImageManipulator.manipulateAsync(
                    normalizedUri,
                    [{ resize: { width: side } }],
                    { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
                  ),
              });
              if (result?.uri) {
                return result.uri.startsWith('file://') ? result.uri : `file://${result.uri}`;
              }
            } catch {
              // пробуем меньший размер
            }
          }
        } catch {
          // ignore
        }

        return normalizedUri;
      };

      const loadOptimizedPageBytes = async (uri: string): Promise<Uint8Array | null> => {
        const optimizedUri = await optimizeImageForExport(uri, 'page', isLargeDoc);
        let bytes = await loadImageAsBytes(optimizedUri);
        if (!bytes && optimizedUri !== uri) {
          bytes = await loadImageAsBytes(uri);
        }
        return bytes;
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

          // ph://, assets-library://, content:// — конвертируем через ImageManipulator в file://
          if (Platform.OS !== 'web') {
            try {
              const converted = await withTimeout({
                label: 'ImageManipulator(resolve uri)',
                timeoutMs: 20000,
                task: async () =>
                  ImageManipulator.manipulateAsync(uri, [], {
                    compress: 0.92,
                    format: ImageManipulator.SaveFormat.JPEG,
                  }),
              });
              if (converted?.uri) {
                return await loadImageAsBytes(converted.uri);
              }
            } catch (convertError) {
              console.warn(`[PDF Export] Не удалось конвертировать URI: ${uri}`, convertError);
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
      let interiorProcessedCount = 0;
      let interiorSkippedCount = 0;
      const totalImages = images.length;
      const hasCover = coverPdf !== null;
      const exportTargetPages = totalImages;
      
      setGenerationProgress({ current: 0, total: 0 });
      setGenerationStatus('Подготовка…');
      log(`[PDF Export] Начало обработки ${exportTargetPages} страниц (${totalImages} изображений + ${hasCover ? 'обложка отдельно' : '0 обложек'})...`);
      log(`[PDF Export] Параметры: albumId=${albumId}, projectCategory=${projectCategory}, hasCover=${hasCover}, coverPdf=${!!coverPdf}`);

      // Быстрый и стабильный пайплайн:
      // - оптимизируем страницы батчами (кэш в FileSystem.cacheDirectory)
      // - загружаем изображения-аннотации батчами (без оптимизации, чтобы не мылить)
      // - обложку (если есть) оптимизируем и грузим батчами
      setGenerationStatus('Подготовка страниц…');
      setGenerationProgress({ current: 0, total: images.length });

      const isLargeDoc = images.length >= (Platform.OS === 'android' ? 42 : 36);
      const isElectronicExport = formatToUse.type === 'electronic';
      captureSettingsRef.current = {
        scale: isElectronicExport ? ELECTRONIC_CAPTURE_SCALE : isLargeDoc ? 1.2 : 1.35,
        quality: isElectronicExport ? ELECTRONIC_CAPTURE_QUALITY : isLargeDoc ? 0.88 : 0.92,
      };

      // 1) Оптимизируем все страницы (для больших альбомов — по одной, чтобы не упираться в память)
      const optimizedPageUris: string[] = new Array(images.length);
      if (isLargeDoc) {
        for (let i = 0; i < images.length; i += 1) {
          try {
            optimizedPageUris[i] = await optimizeImageForExport(images[i], 'page', isLargeDoc);
          } catch {
            optimizedPageUris[i] = images[i];
          }
          setGenerationProgress({ current: i + 1, total: images.length });
          setGenerationStatus('Подготовка страниц…');
        }
      } else {
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
          setGenerationProgress({ current: done, total: images.length });
        }
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

      // 3) Изображения-аннотации (для electronic — тоже сжимаем)
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
                task: async () =>
                  isElectronicExport
                    ? loadOptimizedPageBytes(uri)
                    : loadImageAsBytes(uri),
              });
            } catch {
              return null;
            }
          })
        );
        for (let j = 0; j < batch.length; j++) annotationImageMap.set(batch[j], results[j] ?? null);
      }

      setGenerationProgress({ current: 0, total: images.length });
      setGenerationStatus(null);

      // NOTE: optimizedPageUris нужен ниже в цикле страниц
      
      // Предзагружаем шрифты для PDF
      console.log(`[PDF Export] Предзагрузка шрифтов...`);
      const fontsMap = await preloadFontsForPdf(pdfDoc);
      console.log(`[PDF Export] ✓ Загружено ${fontsMap.size} шрифтов`);

      const loadBytesWithRetry = async (
        uri: string,
        label: string,
        timeoutMs = isLargeDoc ? 60000 : 30000
      ): Promise<Uint8Array | null> => {
        const candidates = uri.startsWith('/') ? [`file://${uri}`, uri] : [uri];
        for (let attempt = 1; attempt <= 3; attempt += 1) {
          for (const candidate of candidates) {
            try {
              const bytes = await withTimeout({
                label: `${label} (${attempt}/3)`,
                timeoutMs,
                task: () => loadImageAsBytes(candidate),
              });
              if (bytes && bytes.length > 0) {
                return bytes;
              }
            } catch {
              // пробуем следующий URI / повтор
            }
          }
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        }
        console.warn(`[PDF Export] Не удалось подготовить ${label}, будет использована заглушка`);
        return null;
      };

      let blankPageBytesCache: Uint8Array | null = null;
      const loadBlankPageBytes = async (): Promise<Uint8Array | null> => {
        if (blankPageBytesCache) return blankPageBytesCache;
        const blankUri = await getBlankInteriorPageUri(exportLineGuideId);
        if (!blankUri) return null;
        blankPageBytesCache = await loadImageAsBytes(blankUri);
        return blankPageBytesCache;
      };

      const addBlankPdfPage = async (): Promise<boolean> => {
        const blankBytes = await loadBlankPageBytes();
        if (!blankBytes || blankBytes.length === 0) return false;

        const isJpg = blankBytes[0] === 0xff && blankBytes[1] === 0xd8;
        let embeddedBlank;
        try {
          embeddedBlank = isJpg
            ? await pdfDoc.embedJpg(blankBytes)
            : await pdfDoc.embedPng(blankBytes);
        } catch {
          return false;
        }

        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        const dims = embeddedBlank.scale(1);
        const ar = dims.width / dims.height;
        const pageAr = pageWidth / pageHeight;
        let w = pageWidth;
        let h = pageHeight;
        if (ar > pageAr) {
          h = pageWidth / ar;
        } else {
          w = pageHeight * ar;
        }
        page.drawImage(embeddedBlank, {
          x: (pageWidth - w) / 2,
          y: (pageHeight - h) / 2,
          width: w,
          height: h,
        });
        return true;
      };

      const resolvePageImageBytes = async (pageIndex: number): Promise<Uint8Array | null> => {
        const optimizedUri = optimizedPageUris[pageIndex];
        const originalUri = images[pageIndex];
        const uriCandidates = [optimizedUri, originalUri].filter(
          (uri, idx, arr): uri is string => Boolean(uri) && arr.indexOf(uri) === idx
        );

        for (const candidate of uriCandidates) {
          const bytes = await loadBytesWithRetry(candidate, `страницу ${pageIndex + 1}`);
          if (bytes && bytes.length > 0) {
            return bytes;
          }
        }

        for (const candidate of uriCandidates) {
          if (!candidate.startsWith('http')) continue;
          const cachedUri = await ensureSinglePageUriCachedForExport(candidate);
          if (!cachedUri) continue;
          const bytes = await loadBytesWithRetry(
            cachedUri,
            `страницу ${pageIndex + 1} (повторное кеширование)`
          );
          if (bytes && bytes.length > 0) {
            return bytes;
          }
        }

        const reoptimized = originalUri
          ? await loadOptimizedPageBytes(originalUri)
          : null;
        if (reoptimized) {
          const bytes = await loadBytesWithRetry(
            reoptimized,
            `страницу ${pageIndex + 1} (повторная оптимизация)`
          );
          if (bytes && bytes.length > 0) {
            return bytes;
          }
        }

        if (lineGuideAlbumId) {
          const fallbackUri = await ensureRemoteAlbumPageCachedByIndex(
            lineGuideAlbumId,
            projectCategory,
            pageIndex + 1
          );
          if (fallbackUri) {
            const bytes = await loadBytesWithRetry(
              fallbackUri,
              `страницу ${pageIndex + 1} (шаблон альбома)`
            );
            if (bytes && bytes.length > 0) {
              return bytes;
            }
          }
        }

        console.warn(
          `[PDF Export] Не удалось загрузить изображение страницы ${pageIndex + 1}, будет использована заглушка`
        );
        return null;
      };

      setGenerationStatus('Загрузка всех страниц…');
      setGenerationProgress({ current: 0, total: images.length });
      const prefetchedPageBytes: (Uint8Array | null)[] = [];
      for (let i = 0; i < images.length; i += 1) {
        prefetchedPageBytes.push(await resolvePageImageBytes(i));
        setGenerationProgress({ current: i + 1, total: images.length });
      }
      console.log(`[PDF Export] ✓ Все ${images.length} страниц подготовлены`);
      
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
          setGenerationProgress({ current: 0, total: 0 });
          
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
      if (isSoftOrElectronic && exportFirstPageUri) {
        try {
          setGenerationStatus('Добавление обложки…');
          setGenerationProgress({ current: 0, total: 0 });
          const firstCoverUri = exportFirstPageUri;
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

      const embeddedImagesCache = new Map<string, any>();
      
      for (let pageIndex = 0; pageIndex < images.length; pageIndex++) {
        const pageNumber = pageIndex + 1;
        const imageUri = images[pageIndex];
        const optimizedPageUri = optimizedPageUris[pageIndex] || imageUri;
        
        try {
          // Обновляем прогресс — считаем успешно добавленные страницы, не просто номер итерации
          setGenerationStatus(null);
          
          // Логируем реже для производительности (каждые 10 страниц)
          if (pageIndex % 10 === 0) {
            console.log(`[PDF Export] Обработка страницы ${pageNumber}/${totalImages}...`);
          }
          
          // Фильтруем аннотации для текущей страницы
          const pageAnnotations = annotations.filter(ann => (ann.page || 1) === pageNumber);
          const hasImageAnnotations = pageAnnotations.some(
            (ann) => ann.type === 'image' && ann.imageUri
          );
          // PageRenderer нужен только когда на странице есть фото-наклейки поверх шаблона.
          // Для текста используем прямой путь: фон + drawTextAnnotationOnPdfPage (надёжнее).
          const usePageRenderer = hasImageAnnotations;
          const pageRendererTimeoutMs = hasImageAnnotations
            ? isLargeDoc
              ? 45000
              : 25000
            : isLargeDoc
              ? 30000
              : 15000;

          // PageRenderer — только для страниц с аннотациями (фото/текст как в редакторе)
          let pageSnapshotUri: string | null = null;
          if (usePageRenderer) {
            try {
              pageSnapshotUri = await withTimeout({
                label: `PageRenderer capture ${pageNumber}`,
                timeoutMs: pageRendererTimeoutMs,
                task: async () =>
                  new Promise<string | null>((resolve, reject) => {
                    pageSnapshotPromiseRef.current = { resolve, reject };
                    setRenderingPage({
                      imageUri: optimizedPageUri,
                      annotations: pageAnnotations,
                      pageNumber,
                      viewport: pagesViewport,
                      lineGuideId: lineGuideAlbumId
                        ? resolveLineGuideId(lineGuideAlbumId, projectCategory)
                        : undefined,
                    });
                    setTimeout(() => {
                      if (pageSnapshotPromiseRef.current) {
                        pageSnapshotPromiseRef.current.resolve(null);
                        pageSnapshotPromiseRef.current = null;
                      }
                      setRenderingPage(null);
                      setPageRendererReady(false);
                    }, pageRendererTimeoutMs - 500);
                  }),
              });
            } catch {
              pageSnapshotUri = null;
              setRenderingPage(null);
              setPageRendererReady(false);
            }
          }

          if (pageSnapshotUri) {
            try {
              // снапшот уже jpeg (PageRenderer), но дополнительно прогоняем через оптимизацию+кэш
              const optimizedSnapshotUri = await optimizeImageForExport(pageSnapshotUri, 'page', isLargeDoc);
              const snapshotBytes = await loadImageAsBytes(optimizedSnapshotUri);
              if (snapshotBytes) {
                const page = pdfDoc.addPage([pageWidth, pageHeight]);
                const embeddedSnapshot = await withTimeout({
                  label: `embed snapshot ${pageNumber}`,
                  timeoutMs: isLargeDoc ? 45000 : 25000,
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
                interiorProcessedCount++;
                setGenerationProgress({ current: interiorProcessedCount, total: images.length });
                continue;
              }
            } catch {
              // fallback пойдет ниже
            }
          }
          
          // Прямой путь — фон страницы + аннотации через pdf-lib (fallback и страницы без снапшота)
          let pageImageBytes = prefetchedPageBytes[pageIndex];
          if (!pageImageBytes) {
            pageImageBytes = await resolvePageImageBytes(pageIndex);
          }
          if (!pageImageBytes) {
            pageImageBytes = await loadBlankPageBytes();
          }
          if (!pageImageBytes) {
            const addedBlank = await addBlankPdfPage();
            if (addedBlank) {
              processedCount++;
              interiorProcessedCount++;
              skippedCount++;
              setGenerationProgress({ current: interiorProcessedCount, total: images.length });
            } else {
              skippedCount++;
            }
            continue;
          }

          const isJpg = pageImageBytes[0] === 0xFF && pageImageBytes[1] === 0xD8;
          let embeddedImage;
          for (let embedAttempt = 1; embedAttempt <= 2; embedAttempt += 1) {
            try {
              embeddedImage = await withTimeout({
                label: `embed page ${pageNumber} (${embedAttempt}/2)`,
                timeoutMs: isLargeDoc ? 90000 : 30000,
                task: async () =>
                  isJpg
                    ? pdfDoc.embedJpg(pageImageBytes!)
                    : pdfDoc.embedPng(pageImageBytes!),
              });
              break;
            } catch {
              if (embedAttempt < 2) {
                await new Promise((resolve) => setTimeout(resolve, 400));
              }
            }
          }
          if (!embeddedImage) {
            const addedBlank = await addBlankPdfPage();
            if (addedBlank) {
              processedCount++;
              interiorProcessedCount++;
              skippedCount++;
              setGenerationProgress({ current: interiorProcessedCount, total: images.length });
            } else {
              skippedCount++;
            }
            continue;
          }

          const page = pdfDoc.addPage([pageWidth, pageHeight]);
          const imageDims = embeddedImage.scale(1);
          const imageAspectRatio = imageDims.width / imageDims.height;
          const contentAspectRatio = contentWidth / contentHeight;

          let sourceWidth = imageDims.width;
          let sourceHeight = imageDims.height;
          const cachedSource = getCachedPageSourceSize(imageUri) ?? getCachedPageSourceSize(optimizedPageUri);
          if (cachedSource) {
            sourceWidth = cachedSource.width;
            sourceHeight = cachedSource.height;
          } else {
            const resolvedSource = await resolvePageSourceSize(imageUri);
            if (resolvedSource) {
              sourceWidth = resolvedSource.width;
              sourceHeight = resolvedSource.height;
            }
          }
          
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
          
          for (const ann of sortedAnnotations) {
            try {
              if (ann.type === 'text' && ann.content) {
                const colorHex = ann.color || '#000000';
                const isPrint = formatToUse.type === 'hard' || formatToUse.type === 'soft';
                const fontId = ann.fontFamily || 'default';
                const font = fontId !== 'default' ? fontsMap.get(fontId) : undefined;
                const lineGuideId = lineGuideAlbumId
                  ? resolveLineGuideId(lineGuideAlbumId, projectCategory)
                  : null;

                drawTextAnnotationOnPdfPage({
                  page,
                  ann,
                  lineGuideId,
                  pageNumber,
                  pagesViewport,
                  sourceWidth,
                  sourceHeight,
                  offsetX,
                  offsetY,
                  actualImageWidth,
                  actualImageHeight,
                  font,
                  color: hexToColor(colorHex, isPrint),
                });
              }
            } catch (annError) {
              // ignore
            }
          }

          await drawImageAnnotationsOnPdfPage({
            page,
            pdfDoc,
            pageAnnotations: sortedAnnotations,
            annotationImageMap,
            embeddedImagesCache,
            pagesViewport,
            sourceWidth,
            sourceHeight,
            pdfImageX: offsetX,
            pdfImageY: offsetY,
            pdfImageWidth: actualImageWidth,
            pdfImageHeight: actualImageHeight,
          });
          
          processedCount++;
          interiorProcessedCount++;
          setGenerationProgress({ current: interiorProcessedCount, total: images.length });
          
        } catch (pageError) {
          console.error(`[PDF Export] Ошибка при обработке страницы ${pageNumber}:`, pageError);
          const addedBlank = await addBlankPdfPage();
          if (addedBlank) {
            processedCount++;
            interiorProcessedCount++;
            skippedCount++;
            setGenerationProgress({ current: interiorProcessedCount, total: images.length });
          } else {
            skippedCount++;
          }
        }
      }
      
      // Для soft/electronic: одна финальная страница ПОСЛЕ внутренних (своя для каждого альбома)
      if (isSoftOrElectronic && exportClosingPageUri) {
        try {
          setGenerationStatus('Добавление последней страницы…');
          const lastUri = exportClosingPageUri;
          const optLastUri = await optimizeImageForExport(lastUri, 'cover', isLargeDoc).catch(() => lastUri);
          const lastBytes = await loadImageAsBytes(optLastUri);
          if (lastBytes) {
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
            console.log('[PDF Export] ✓ Последняя страница обложки добавлена');
          }
        } catch (lastErr) {
          console.warn('[PDF Export] Ошибка добавления последней страницы обложки:', lastErr);
        }
      }

      console.log(`[PDF Export] Обработка завершена: ${processedCount} страниц обработано, ${skippedCount} пропущено`);
      
      if (processedCount === 0) {
        const addedBlank = await addBlankPdfPage();
        if (addedBlank) {
          processedCount = 1;
          console.warn('[PDF Export] Экспорт продолжен с одной запасной страницей');
        }
      }

      if (processedCount === 0) {
        throw new Error('Не удалось обработать ни одного изображения');
      }
      
      const savePhaseStart = Date.now();
      console.log(`[PDF Export] Сохранение PDF файла (сериализация + запись)...`);
      setGenerationStatus('Сохранение PDF…');
      setGenerationProgress({ current: 0, total: 0 });

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
            await yieldToUI();
          }
        }
        await yieldToUI();
        return btoa(chunks.join(''));
      };

      const fileName = resolveExportPdfFileName(
        {
          projectName: projectTitleForExport,
          projectId,
          category: projectCategory,
          formatType: formatToUse.type,
          part: 'full',
        },
        exportMode === 'electronic' ? electronicFileName : undefined
      );
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

      setGenerationStatus('Запись на диск…');
      setGenerationProgress({ current: 0, total: 0 });

      await withTimeout({
        label: 'write pdf file',
        timeoutMs: 90000,
        task: async () =>
          FileSystem.writeAsStringAsync(fileUri, base64!, {
            encoding: FileSystem.EncodingType.Base64,
          }),
      });
      console.log('[PDF Export] Запись на диск завершена');

      const savePhaseMs = Date.now() - savePhaseStart;
      console.log(`[PDF Export] PDF успешно создан: ${fileUri} (сохранение заняло ${Math.round(savePhaseMs / 1000)} с)`);

      // Сразу показываем результат пользователю, не дожидаясь истории и облака
      setPdfUri(fileUri);
      setShowPreview(true);

      // История и пуш в облако — в фоне, чтобы не блокировать показ PDF
      const historyPayload = { fileUri, fileName, projectId, formatToUse };
      Promise.resolve().then(async () => {
        try {
          const syncId = await getAccountSyncId();
          if (!syncId) return;
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
          const historyKey = `@export_history_${syncId}`;
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
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
      console.error('Error generating PDF:', error);
      setExportError(message);
      if (exportMode === 'electronic') {
        electronicExportStartedRef.current = false;
      }
      Alert.alert('Ошибка', 'Не удалось создать PDF файл. ' + message);
    } finally {
      setIsGenerating(false);
      setGenerationStatus(null);
      setGenerationProgress({ current: 0, total: 0 });
    }
  };

  createPdfRef.current = handleCreatePdfWithFormat;

  React.useEffect(() => {
    if (exportMode !== 'electronic' || electronicExportStartedRef.current) return;
    if (selectedFormat?.type !== 'electronic' || isGenerating) return;
    electronicExportStartedRef.current = true;
    void createPdfRef.current(selectedFormat);
  }, [exportMode, selectedFormat, isGenerating]);

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
      const sourceFileName = getCoverExportPdfFileNameFromCoverType(coverType, category, 'hard');
      console.log(`[PDF Export] Получено имя файла: ${sourceFileName}`);
      if (!sourceFileName) {
        Alert.alert('Ошибка', 'Не удалось определить имя файла обложки');
        setIsDownloadingCover(false);
        return;
      }

      const exportFileName = buildExportPdfFileName({
        projectName: projectTitleForExport,
        projectId,
        category,
        formatType: 'hard',
        part: 'cover',
      });
      const pdfUri = await downloadExportCoverPdfToCache(sourceFileName);

      if (!pdfUri) {
        Alert.alert('Ошибка', `Не удалось загрузить PDF файл обложки: ${sourceFileName}`);
        setIsDownloadingCover(false);
        return;
      }

      // Скачиваем файл
      if (Platform.OS === 'android') {
        await savePdfToAndroidDirectory({
          sourceUri: pdfUri,
          suggestedFileName: exportFileName,
          successMessage: `Обложка сохранена: ${exportFileName}`,
        });
        setCoverDownloaded(true);
        setDownloadStep(2);
      } else if (Platform.OS === 'ios') {
        const isAvailable = await Sharing.isAvailableAsync();
        const shareUri = `${FileSystem.cacheDirectory}${exportFileName}`;
        await FileSystem.copyAsync({
          from: pdfUri,
          to: shareUri,
        });
        if (isAvailable) {
          await Sharing.shareAsync(shareUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Сохранить обложку',
            UTI: 'com.adobe.pdf',
          });
          setCoverDownloaded(true);
          setDownloadStep(2);
        } else {
          const fileUri = `${FileSystem.documentDirectory}${exportFileName}`;
          await FileSystem.copyAsync({
            from: shareUri,
            to: fileUri,
          });
          Alert.alert('Успешно', `Обложка сохранена: ${exportFileName}`);
          setCoverDownloaded(true);
          setDownloadStep(2);
        }
      } else {
        const base64 = await FileSystem.readAsStringAsync(pdfUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${base64}`;
        link.download = exportFileName;
        link.click();
        Alert.alert('Успешно', `Обложка скачана: ${exportFileName}`);
        setCoverDownloaded(true);
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
      const fileName = buildExportPdfFileName({
        projectName: projectTitleForExport,
        projectId,
        category: projectCat,
        formatType: selectedFormat?.type,
        part: 'first-last',
      });
      if (Platform.OS === 'android') {
        await savePdfToAndroidDirectory({
          sourceUri: firstLastPdfUri,
          suggestedFileName: fileName,
          successMessage: `Файл сохранён: ${fileName}`,
        });
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
      const fileName = buildExportPdfFileName({
        projectName: projectTitleForExport,
        projectId,
        category: projectCat,
        formatType: selectedFormat?.type,
        part: 'interior',
      });
      
      if (Platform.OS === 'android') {
        await savePdfToAndroidDirectory({
          sourceUri: pdfUri,
          suggestedFileName: fileName,
          successMessage: `Внутренняя часть сохранена: ${fileName}`,
        });
        setInteriorDownloaded(true);
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
        setInteriorDownloaded(true);
      } else {
        const base64 = await FileSystem.readAsStringAsync(pdfUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${base64}`;
        link.download = fileName;
        link.click();
        Alert.alert('Успешно', `Внутренняя часть скачана: ${fileName}`);
        setInteriorDownloaded(true);
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
      const fileName = buildExportPdfFileName({
        projectName: projectTitleForExport,
        projectId,
        category: projectCat,
        formatType: selectedFormat?.type,
        part: 'full',
      });
      
      if (Platform.OS === 'android') {
        await savePdfToAndroidDirectory({
          sourceUri: pdfUri,
          suggestedFileName: fileName,
          successMessage: `Файл сохранён: ${fileName}`,
        });
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
        const file = new File(
          [blob],
          buildExportPdfFileName({
            projectName: projectTitleForExport,
            projectId,
            category: projectCat,
            formatType: selectedFormat?.type,
            part: 'full',
          }),
          { type: 'application/pdf' }
        );
        
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
            shareUri = await FileSystemModern.getContentUriAsync(shareUri);
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
            <View style={styles.exportSkeletonFrame}>
              <PdfSkeletonLoader />
            </View>
            <Text style={styles.exportOverlayTitle}>Создание PDF…</Text>
            <Text style={styles.exportOverlaySubtitle}>
              {formatExportProgressLabel(generationStatus, generationProgress)}
            </Text>
            {generationProgress.total > 0 ? (
              <View style={styles.exportProgressTrack}>
                <View
                  style={[
                    styles.exportProgressFill,
                    { width: `${exportProgressPercent(generationProgress)}%` },
                  ]}
                />
              </View>
            ) : null}
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
              lineGuideId={renderingPage.lineGuideId}
              sourceWidth={renderingPage.sourceWidth}
              sourceHeight={renderingPage.sourceHeight}
              captureFormat="jpg"
              captureScale={captureSettingsRef.current.scale}
              captureQuality={captureSettingsRef.current.quality}
              onReady={() => setPageRendererReady(true)}
            />
          </View>
        ) : null}

        <View style={styles.header}>
          <TouchableOpacity
            testID="export-done-home"
            onPress={() => router.replace('/(tabs)')}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="На главный экран"
          >
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>
              {exportMode === 'electronic' ? 'Электронная версия' : 'Получить книгу'}
            </Text>
            <Text style={styles.subtitle}>
              {exportMode === 'electronic'
                ? 'PDF для просмотра и отправки близким'
                : 'Выберите формат печати'}
            </Text>
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {!showPreview ? (
            <>
              {exportMode !== 'electronic'
                ? formatOptions.map((format) => {
                const showPremium = requiresPrintSubscription(format.type);
                const locked = isFormatLocked(format);
                const isSelected = selectedFormat?.id === format.id;
                const formatIconName =
                  format.type === 'hard'
                    ? 'book'
                    : format.type === 'electronic'
                      ? 'tablet-portrait-outline'
                      : 'book-outline';

                const isPremiumLocked = showPremium && locked;

                return (
                  <TouchableOpacity
                    key={format.id}
                    style={[styles.formatCard, isSelected && styles.formatCardSelected]}
                    onPress={() => handleFormatPress(format)}
                    activeOpacity={0.85}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={
                      isPremiumLocked
                        ? `${format.name}. Платный формат${priceLabel ? `, ${priceLabel}` : ''}`
                        : format.name
                    }
                  >
                    <View
                      style={[
                        styles.formatCardBody,
                        isSelected && styles.formatCardBodySelected,
                        isPremiumLocked && !isSelected && styles.formatCardBodyLocked,
                      ]}
                    >
                      <View
                        style={[
                          styles.formatIconWrap,
                          isSelected && styles.formatIconWrapSelected,
                          isPremiumLocked && !isSelected && styles.formatIconWrapLocked,
                        ]}
                      >
                        <Ionicons
                          name={formatIconName}
                          size={24}
                          color={isSelected ? '#FFFFFF' : colors.textPrimary}
                        />
                      </View>

                      <View style={styles.formatTextBlock}>
                        <View style={styles.formatTitleRow}>
                          <Text
                            style={[
                              styles.formatName,
                              isSelected && styles.formatNameSelected,
                            ]}
                            numberOfLines={2}
                          >
                            {format.name}
                          </Text>
                          {isPremiumLocked ? (
                            <View
                              style={[
                                styles.formatPremiumBadge,
                                isSelected && styles.formatPremiumBadgeSelected,
                              ]}
                            >
                              <Ionicons
                                name="star"
                                size={11}
                                color={isSelected ? colors.white : colors.primaryPressed}
                              />
                              <Text
                                style={[
                                  styles.formatPremiumBadgeText,
                                  isSelected && styles.formatPremiumBadgeTextSelected,
                                ]}
                              >
                                Премиум
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Text
                          style={[
                            styles.formatDescription,
                            isSelected && styles.formatDescriptionSelected,
                          ]}
                        >
                          {format.description}
                        </Text>
                        <Text
                          style={[
                            styles.formatMeta,
                            isSelected && styles.formatMetaSelected,
                          ]}
                        >
                          {format.size} · Поля {format.margins} · {format.orientation}
                        </Text>
                        {isPremiumLocked ? (
                          <View
                            style={[
                              styles.formatPurchaseChip,
                              isSelected && styles.formatPurchaseChipSelected,
                            ]}
                          >
                            <Ionicons
                              name="lock-closed"
                              size={14}
                              color={isSelected ? colors.white : colors.primaryPressed}
                            />
                            <Text
                              style={[
                                styles.formatPurchaseChipText,
                                isSelected && styles.formatPurchaseChipTextSelected,
                              ]}
                            >
                              {priceLabel
                                ? `Купить доступ · ${priceLabel}`
                                : 'Купить доступ'}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={26} color={colors.white} />
                      ) : isPremiumLocked ? (
                        <Ionicons name="chevron-forward" size={22} color={colors.primaryPressed} />
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })
                : null}

              {exportMode === 'electronic' && !showPreview && !isGenerating && exportError ? (
                <View style={styles.exportErrorCard}>
                  <Ionicons name="cloud-offline-outline" size={44} color={colors.primary} />
                  <Text style={styles.exportErrorTitle}>Не удалось создать PDF</Text>
                  <Text style={styles.exportErrorText}>{exportError}</Text>
                  <TouchableOpacity
                    style={styles.createButton}
                    onPress={() => {
                      setExportError(null);
                      if (selectedFormat) {
                        electronicExportStartedRef.current = true;
                        void handleCreatePdfWithFormat(selectedFormat);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="refresh-outline" size={22} color="#FFFFFF" />
                    <Text style={styles.createButtonText}>Повторить</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Кнопка создания PDF */}
              {exportMode !== 'electronic' ? (
              <TouchableOpacity
                style={[
                  styles.createButton,
                  (!selectedFormat || isGenerating) && styles.createButtonDisabled,
                ]}
                onPress={() => {
                  if (!selectedFormat) return;
                  if (isFormatLocked(selectedFormat)) {
                    openPaywall(selectedFormat);
                    return;
                  }
                  handleCreatePdfWithFormat(selectedFormat);
                }}
                disabled={!selectedFormat || isGenerating}
                activeOpacity={0.7}
              >
                <Ionicons name="document-text-outline" size={24} color="#FFFFFF" />
                <Text style={styles.createButtonText}>Создать PDF</Text>
              </TouchableOpacity>
              ) : null}
            </>
          ) : (
            <>
              {/* Превью готового PDF */}
              <View style={styles.previewContainer}>
                <View style={styles.previewIcon}>
                  <PdfIcon size={120} />
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
                          <Ionicons name="book" size={20} color={colors.textPrimary} />
                        )}
                      </View>
                      <View style={styles.downloadStepInfo}>
                        <Text style={styles.downloadStepTitle}>Открыть</Text>
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
                            <Ionicons name="open-outline" size={20} color="#FFFFFF" />
                            <Text style={styles.downloadStepButtonText}>Открыть</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ) : null}

              {/* Подсказка */}
              <View style={styles.hintContainer}>
                <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                <Text style={styles.hintText}>
                  Этот файл готов к печати в любом салоне. Просто передайте его оператору
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      </Animated.View>

      <SubscriptionPaywallModal
        visible={paywallVisible}
        onClose={() => {
          pendingFormatRef.current = null;
          setPaywallVisible(false);
        }}
        onSubscribed={handlePaywallSubscribed}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
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
    color: colors.textPrimary,
    fontFamily: sansFont('bold'),
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
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
    paddingBottom: 32,
  },
  formatCard: {
    marginBottom: 14,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  formatCardSelected: {
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  formatCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 20,
  },
  formatCardBodySelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  formatCardBodyLocked: {
    borderColor: 'rgba(241, 148, 162, 0.45)',
    backgroundColor: colors.primarySurface,
  },
  formatIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatIconWrapSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  formatIconWrapLocked: {
    backgroundColor: 'rgba(241, 148, 162, 0.14)',
  },
  formatTextBlock: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  formatTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
  },
  formatPremiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(241, 148, 162, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(241, 148, 162, 0.4)',
  },
  formatPremiumBadgeSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  formatPremiumBadgeText: {
    fontSize: 11,
    lineHeight: 14,
    color: colors.primaryPressed,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  formatPremiumBadgeTextSelected: {
    color: '#FFFFFF',
  },
  formatName: {
    flex: 1,
    flexShrink: 1,
    fontSize: 17,
    lineHeight: 22,
    color: colors.textPrimary,
    fontFamily: sansFont('bold'),
    fontWeight: '700',
  },
  formatNameSelected: {
    color: '#FFFFFF',
  },
  formatDescription: {
    fontSize: 14,
    lineHeight: 19,
    color: colors.textSecondary,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
  },
  formatDescriptionSelected: {
    color: 'rgba(255, 255, 255, 0.92)',
  },
  formatMeta: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '400',
  },
  formatMetaSelected: {
    color: 'rgba(255, 255, 255, 0.78)',
  },
  formatPurchaseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(241, 148, 162, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(241, 148, 162, 0.35)',
  },
  formatPurchaseChipSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  formatPurchaseChipText: {
    fontSize: 13,
    lineHeight: 17,
    color: colors.primaryPressed,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
  },
  formatPurchaseChipTextSelected: {
    color: '#FFFFFF',
  },
  exportOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 50,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  exportSkeletonFrame: {
    width: '100%',
    maxWidth: 320,
    height: 420,
    marginBottom: 20,
    borderRadius: radii.sm,
    overflow: 'hidden',
    ...createShadow('md'),
  },
  exportOverlayTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: sansFont('semibold'),
    marginBottom: 6,
  },
  exportOverlaySubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  exportProgressTrack: {
    width: '100%',
    maxWidth: 280,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 16,
  },
  exportProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  createButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginTop: 16,
    gap: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  createButtonDisabled: {
    opacity: 0.5,
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
  exportErrorCard: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  exportErrorTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    fontFamily: sansFont('semibold'),
  },
  exportErrorText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
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
    color: colors.textPrimary,
    fontFamily: sansFont('bold'),
    fontWeight: '700',
    marginBottom: 8,
  },
  previewSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
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
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  actionText: {
    fontSize: 14,
    color: colors.textPrimary,
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
    borderColor: colors.border,
  },
  hintText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
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
    color: colors.textPrimary,
    fontFamily: sansFont('bold'),
    fontWeight: '700',
    marginBottom: 8,
  },
  downloadStepsSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
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
    borderColor: colors.border,
    shadowColor: colors.textPrimary,
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
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  downloadStepNumberCompleted: {
    backgroundColor: colors.primary,
  },
  downloadStepNumberText: {
    fontSize: 18,
    color: colors.textPrimary,
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
    color: colors.textPrimary,
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
    color: colors.textSecondary,
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
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  downloadStepButtonDisabled: {
    backgroundColor: colors.tabInactive,
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

