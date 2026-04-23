import { getAlbumTemplateById } from '@/albums';
import CoverViewer from '@/components/cover-viewer';
import ImageViewer from '@/components/image-viewer';
import { Annotation, AVAILABLE_FONTS, PdfAnnotationsRef } from '@/components/pdf-annotations';
import PdfSkeletonLoader from '@/components/pdf-skeleton-loader';
import { ensureSyncReady, getSupabaseNotConfiguredAlertMessageOnce, isSupabaseNotConfiguredError, pushAccountDataToCloud, scheduleSyncToCloud } from '@/utils/account-sync';
import { deleteProjectInSupabase, isSupabaseConfigured } from '@/utils/supabase-account';
import { getAlbumImages, getAlbumImageUris, getAlbumPageCount } from '@/utils/albumImages';
import { getDiaryCoverById, getDiaryInteriorById, getDiaryInteriorImageUris } from '@/utils/diaryAlbumsLoader';
import { FAMILY_COVER_DESIGNS } from '@/utils/familyCoverDesigns';
import { HOLIDAY_COVER_DESIGNS } from '@/utils/holidayCoverDesigns';
import { getCoverForExport } from '@/utils/coverMapping';
import { createId, ensureUniqueIds } from '@/utils/id';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';
import { useFonts } from 'expo-font';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function EditAlbumScreen() {
  const { id, celebration, coverType, interiorType, eventDate } = useLocalSearchParams<{ 
    id?: string;
    celebration?: string;
    coverType?: string;
    interiorType?: string;
    eventDate?: string;
  }>();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(60);
  const [images, setImages] = useState<string[]>([]);
  const [albumName, setAlbumName] = useState<string>('');
  const [albumId, setAlbumId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTool, setCurrentTool] = useState<'text' | 'image' | 'drawing' | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [viewMode, setViewMode] = useState<'pages' | 'cover'>('pages');
  const [coverAnnotations, setCoverAnnotations] = useState<Annotation[]>([]);
  const [pagesViewport, setPagesViewport] = useState<{ width: number; height: number } | null>(null);
  const [coverViewport, setCoverViewport] = useState<{ width: number; height: number } | null>(null);
  const [isAddingText, setIsAddingText] = useState(false);
  const [editingTextAnnotationId, setEditingTextAnnotationId] = useState<string | null>(null);
  const [currentTextAnnotation, setCurrentTextAnnotation] = useState<Annotation | null>(null);
  const [lastTextStyle, setLastTextStyle] = useState<{
    color: string;
    fontSize: number;
    fontFamily?: string;
  }>({ color: '#000000', fontSize: 16 });
  const [templatePages, setTemplatePages] = useState<string[]>([]);
  const [showPageSelectModal, setShowPageSelectModal] = useState(false);
  const [targetPageIndexForDuplicate, setTargetPageIndexForDuplicate] = useState<number | null>(null);
  const [showAddPageModal, setShowAddPageModal] = useState(false);
  const [effectiveProjectId, setEffectiveProjectId] = useState<string | null>(null);
  const annotationsRef = React.useRef<PdfAnnotationsRef>(null!);
  const lastFontFamilyRef = React.useRef<string | null>(null);
  const exportInProgressRef = React.useRef(false);
  const containerOpacity = useSharedValue(0);

  // Предзагрузка шрифтов до первого показа страниц — чтобы кастомные шрифты аннотаций отображались с первого входа в проект
  const [fontsLoaded] = useFonts(
    AVAILABLE_FONTS.reduce((acc, font) => {
      if (font.file && font.id !== 'default') {
        acc[font.name] = font.file;
      }
      return acc;
    }, {} as Record<string, any>)
  );

  // ID для сохранения: из URL или созданный при открытии без id (чтобы текст/фото не терялись до router.replace)
  const storageId = id || effectiveProjectId;
  
  // Отслеживание последнего сохраненного состояния для проверки изменений
  const lastSavedStateRef = React.useRef<{
    images: string[];
    annotations: Annotation[];
    coverAnnotations: Annotation[];
    projectMetaJson?: string | null;
  } | null>(null);

  // Флаг "пользователь явно сохранял этот проект".
  // Нужен, чтобы пустые/черновые проекты можно было удалять целиком при выходе "Не сохранять",
  // а для сохранённых — откатывать только последние изменения.
  const userCommittedRef = React.useRef(false);
  const committedKey = storageId ? `@project_user_committed_${storageId}` : null;

  const getFontDisplayName = (fontId?: string) => {
    if (!fontId || fontId === 'default') return 'Системный';
    const match = AVAILABLE_FONTS.find(f => f.id === fontId);
    return match?.displayName || fontId;
  };

  useEffect(() => {
    console.log('[DEBUG] useEffect triggered:', { id, celebration, coverType, interiorType });
    containerOpacity.value = withTiming(1, { duration: 400 });
    loadImagesData();
  }, [id, coverType, interiorType]);

  // Сохраняем начальное состояние после загрузки данных
  useEffect(() => {
    if (!isLoading && images.length > 0 && !lastSavedStateRef.current) {
      lastSavedStateRef.current = {
        images: [...images],
        annotations: JSON.parse(JSON.stringify(annotations)),
        coverAnnotations: JSON.parse(JSON.stringify(coverAnnotations)),
        projectMetaJson: null,
      };
    }
  }, [isLoading, images, annotations, coverAnnotations]);

  // Подхватываем флаг "проект уже сохраняли" из AsyncStorage
  useEffect(() => {
    if (!committedKey) return;
    AsyncStorage.getItem(committedKey)
      .then((v) => {
        userCommittedRef.current = v === 'true';
      })
      .catch(() => {});
  }, [committedKey]);

  // Загружаем последний стиль текста: сначала из проекта, потом из глобального
  // Шрифт всегда дополнительно читаем из @last_text_font_family — его часто перезаписывают без fontFamily
  useEffect(() => {
    const loadLastTextStyle = async () => {
      try {
        const [projectStyle, globalStyle, fontRaw] = await Promise.all([
          id ? AsyncStorage.getItem(`@project_last_text_style_${id}`) : null,
          AsyncStorage.getItem('@last_text_style'),
          AsyncStorage.getItem('@last_text_font_family'),
        ]);
        const savedFont = typeof fontRaw === 'string' && fontRaw ? fontRaw : undefined;
        const mergeFont = (parsed: any) => typeof parsed?.fontFamily === 'string' ? parsed.fontFamily : savedFont;
        if (savedFont) lastFontFamilyRef.current = savedFont;
        // Сначала пробуем загрузить из проекта
        if (projectStyle) {
          const parsed = JSON.parse(projectStyle) as any;
          const nextFontFamily = mergeFont(parsed);
          if (nextFontFamily) lastFontFamilyRef.current = nextFontFamily;
          setLastTextStyle({
            color: typeof parsed?.color === 'string' && parsed.color ? parsed.color : '#000000',
            fontSize: typeof parsed?.fontSize === 'number' && parsed.fontSize > 0 ? parsed.fontSize : 16,
            fontFamily: nextFontFamily,
          });
          return;
        }
        if (globalStyle) {
          const parsed = JSON.parse(globalStyle) as any;
          const nextFontFamily = mergeFont(parsed);
          if (nextFontFamily) lastFontFamilyRef.current = nextFontFamily;
          setLastTextStyle({
            color: typeof parsed?.color === 'string' && parsed.color ? parsed.color : '#000000',
            fontSize: typeof parsed?.fontSize === 'number' && parsed.fontSize > 0 ? parsed.fontSize : 16,
            fontFamily: nextFontFamily,
          });
          if (id) AsyncStorage.setItem(`@project_last_text_style_${id}`, globalStyle).catch(() => {});
        }
      } catch {
        // Игнорируем ошибки
      }
    };
    loadLastTextStyle();
    const interval = setInterval(() => {
      Promise.all([
        AsyncStorage.getItem('@last_text_style'),
        AsyncStorage.getItem('@last_text_font_family'),
      ]).then(([globalStyle, fontRaw]) => {
        if (!globalStyle) return;
        try {
          const parsed = JSON.parse(globalStyle) as any;
          const savedFont = typeof fontRaw === 'string' && fontRaw ? fontRaw : undefined;
          const nextFontFamily = typeof parsed?.fontFamily === 'string' ? parsed.fontFamily : savedFont;
          if (nextFontFamily) lastFontFamilyRef.current = nextFontFamily;
          const nextColor = typeof parsed?.color === 'string' && parsed.color ? parsed.color : '#000000';
          const nextFontSize = typeof parsed?.fontSize === 'number' && parsed.fontSize > 0 ? parsed.fontSize : 16;
          setLastTextStyle((prev) => {
            if (prev?.color !== nextColor || prev?.fontSize !== nextFontSize || prev?.fontFamily !== nextFontFamily) {
              if (id) AsyncStorage.setItem(`@project_last_text_style_${id}`, globalStyle).catch(() => {});
              return { color: nextColor, fontSize: nextFontSize, fontFamily: nextFontFamily };
            }
            return prev;
          });
        } catch {
          // Игнорируем ошибки парсинга
        }
      }).catch(() => {});
    }, 500);
    return () => clearInterval(interval);
  }, [id]);

  // Синхронизируем текущую редактируемую аннотацию для верхней панели (цвет/размер/шрифт),
  // чтобы она обновлялась сразу после изменения через модалки.
  useEffect(() => {
    if (!editingTextAnnotationId) {
      setCurrentTextAnnotation(null);
      return;
    }

    const nextAnnotation =
      viewMode === 'cover'
        ? coverAnnotations.find(ann => ann.id === editingTextAnnotationId) || null
        : annotations.find(ann => ann.id === editingTextAnnotationId) || null;

    setCurrentTextAnnotation(nextAnnotation);
    
    // Синхронизируем стиль из глобального ключа (шрифт — из @last_text_font_family)
    Promise.all([
      AsyncStorage.getItem('@last_text_style'),
      AsyncStorage.getItem('@last_text_font_family'),
    ]).then(([globalStyle, fontRaw]) => {
      if (!globalStyle || !nextAnnotation || nextAnnotation.type !== 'text') return;
      try {
        const parsed = JSON.parse(globalStyle) as any;
        const savedFont = typeof fontRaw === 'string' && fontRaw ? fontRaw : undefined;
        const nextFontFamily = typeof parsed?.fontFamily === 'string' ? parsed.fontFamily : savedFont;
        if (nextFontFamily) lastFontFamilyRef.current = nextFontFamily;
        const nextColor = typeof parsed?.color === 'string' && parsed.color ? parsed.color : '#000000';
        const nextFontSize = typeof parsed?.fontSize === 'number' && parsed.fontSize > 0 ? parsed.fontSize : 16;
        setLastTextStyle((prev) => {
          if (prev?.color !== nextColor || prev?.fontSize !== nextFontSize || prev?.fontFamily !== nextFontFamily) {
            if (id) AsyncStorage.setItem(`@project_last_text_style_${id}`, globalStyle).catch(() => {});
            return { color: nextColor, fontSize: nextFontSize, fontFamily: nextFontFamily };
          }
          return prev;
        });
      } catch {
        // Игнорируем ошибки парсинга
      }
    }).catch(() => {});
  }, [editingTextAnnotationId, viewMode, annotations, coverAnnotations, id]);

  // Сохраняем viewport размеров редактора — это нужно, чтобы экспорт маппил координаты 1:1
  useEffect(() => {
    if (!id || !pagesViewport) return;
    AsyncStorage.setItem(`@project_viewport_${id}`, JSON.stringify(pagesViewport)).catch(() => {});
  }, [id, pagesViewport]);

  useEffect(() => {
    if (!id || !coverViewport) return;
    AsyncStorage.setItem(`@project_cover_viewport_${id}`, JSON.stringify(coverViewport)).catch(() => {});
  }, [id, coverViewport]);

  const loadImagesData = async () => {
    try {
      setIsLoading(true);
      let foundAlbumId: string | null = null;
      let foundAlbumName = '';
      
      console.log('[DEBUG] loadImagesData called:', { id, celebration, coverType, interiorType });
      
      if (id) {
        // Загружаем данные проекта из AsyncStorage
        const projectData = await AsyncStorage.getItem(`@project_${id}`);
        
        if (projectData) {
          const project = JSON.parse(projectData);
          foundAlbumName = project.title || 'Альбом';
          
          // Получаем ID альбома
          if (project.isReadyMadeAlbum) {
            const originalAlbumId = project.albumId || id;
            // Для детских альбомов используем единый ID для загрузки изображений
            if (project.category === 'kids') {
              foundAlbumId = 'kids_48';
            } else {
              foundAlbumId = originalAlbumId;
            }
          } else {
            foundAlbumId = project.albumId || null;
          }
        }
      } else if (interiorType) {
        // Если передан interiorType, используем соответствующий альбом
        foundAlbumId = interiorType;
        
        // Для дневников получаем название из обложки
        if (celebration === 'diary' && coverType) {
          const diaryCover = getDiaryCoverById(coverType);
          if (diaryCover) {
            foundAlbumName = diaryCover.name;
          }
        } else if (celebration === 'holidays' && coverType) {
          const hCover = HOLIDAY_COVER_DESIGNS.find(d => d.id === coverType);
          if (hCover) {
            foundAlbumName = hCover.title;
          }
        } else if (celebration === 'family' && coverType) {
          const fCover = FAMILY_COVER_DESIGNS.find(d => d.id === coverType);
          if (fCover) {
            foundAlbumName = fCover.title;
          }
        } else if (coverType) {
          const albumTemplate = getAlbumTemplateById(coverType);
          if (albumTemplate) {
            foundAlbumName = albumTemplate.name;
          }
        }
      } else if (coverType) {
        // Если передан coverType, ищем альбом в шаблонах
        const albumTemplate = getAlbumTemplateById(coverType);
        if (albumTemplate) {
          foundAlbumName = albumTemplate.name;
          // Для детских альбомов используем единый ID для загрузки изображений
          if (albumTemplate.category === 'kids') {
            foundAlbumId = 'kids_48';
          } else {
            foundAlbumId = coverType;
          }
        }
      }
      
      // Если альбом не найден, используем дефолтный
      console.log('[DEBUG] Album not found, using default:', { foundAlbumId, celebration });
      if (!foundAlbumId) {
        if (celebration === 'kids') {
          foundAlbumId = 'kids_48';
        } else if (celebration === 'holidays') {
          foundAlbumId = 'holidays_blank';
        } else if (celebration === 'family') {
          foundAlbumId = 'family_blank';
        } else if (celebration === 'diary') {
          foundAlbumId = 'diary_interior_brown';
        } else {
          foundAlbumId = 'pregnancy_60';
        }
      }
      
      setAlbumId(foundAlbumId);
      setAlbumName(foundAlbumName);
      
      console.log('[DEBUG] Album setup complete:', { foundAlbumId, foundAlbumName, celebration });
      
      // Загружаем изображения для альбома
      let imageUris: string[] = [];
      let pageCount = 0;
      
      console.log('[DEBUG] Before loading images:', { celebration, foundAlbumId, startsWith: foundAlbumId?.startsWith('diary_interior_') });
      
      // Для дневников используем специальную логику загрузки
      console.log('[DEBUG] Checking diary condition:', { celebration, foundAlbumId, startsWith: foundAlbumId.startsWith('diary_interior_') });
      if (celebration === 'diary' && foundAlbumId.startsWith('diary_interior_')) {
        console.log('[DEBUG] Using diary logic with interior:', foundAlbumId);
        const interior = getDiaryInteriorById(foundAlbumId);
        console.log('[DEBUG] Interior found:', interior?.id, 'pages:', interior?.pages);
        if (interior) {
          pageCount = interior.pages;
          setTotalPages(pageCount);
          
          // ВАЖНО: Сначала проверяем сохраненные изображения для существующего проекта
          if (id) {
            const savedImages = await AsyncStorage.getItem(`@project_images_${id}`);
            if (savedImages) {
              try {
                const parsed = JSON.parse(savedImages);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  // Используем сохраненные изображения (могут содержать пользовательские фото)
                  imageUris = parsed;
                  setImages(imageUris);
                  setTotalPages(imageUris.length);
                  setIsLoading(false);
                  
                  // Загружаем сохраненные аннотации
                  const savedAnnotations = await AsyncStorage.getItem(`@project_annotations_${id}`);
                  if (savedAnnotations) {
                    const parsed = JSON.parse(savedAnnotations) as Annotation[];
                    const { items, changed } = ensureUniqueIds(parsed, 'ann');
                    setAnnotations(items);
                    if (changed) {
                      await AsyncStorage.setItem(`@project_annotations_${id}`, JSON.stringify(items));
                    }
                  }
                  
                  // Загружаем аннотации обложки
                  const savedCoverAnnotations = await AsyncStorage.getItem(`@project_cover_annotations_${id}`);
                  if (savedCoverAnnotations) {
                    const parsed = JSON.parse(savedCoverAnnotations) as Annotation[];
                    const { items, changed } = ensureUniqueIds(parsed, 'ann');
                    setCoverAnnotations(items);
                    if (changed) {
                      await AsyncStorage.setItem(`@project_cover_annotations_${id}`, JSON.stringify(items));
                    }
                  }
                  
                  return; // Выходим - используем сохраненные данные
                }
              } catch {
                // Если ошибка парсинга, продолжаем загрузку оригинальных изображений
              }
            }
          }
          
          // Если сохраненных изображений нет, загружаем оригинальные
          console.log('[DEBUG] Checking saved images for project:', id);
          const interiorUris = await getDiaryInteriorImageUris(foundAlbumId);
          console.log('[DEBUG] Interior URIs loaded:', interiorUris?.length || 0);
          if (interiorUris && interiorUris.length > 0) {
            imageUris = interiorUris;
            console.log('[DEBUG] Setting images:', imageUris.length, 'pages');
            setImages(imageUris);
            console.log('[DEBUG] totalPages will be set to:', pageCount);
            setIsLoading(false);
            
            // Сохраняем изображения в кеш только если это новый проект
            if (id) {
              await AsyncStorage.setItem(`@project_images_${id}`, JSON.stringify(imageUris));
            }
            
            // Загружаем сохраненные аннотации
            let diaryAnnotations: Annotation[] = [];
            let diaryCoverAnnotations: Annotation[] = [];
            if (id) {
              const savedAnnotations = await AsyncStorage.getItem(`@project_annotations_${id}`);
              if (savedAnnotations) {
                const parsed = JSON.parse(savedAnnotations) as Annotation[];
                const { items, changed } = ensureUniqueIds(parsed, 'ann');
                diaryAnnotations = items;
                setAnnotations(items);
                if (changed) {
                  await AsyncStorage.setItem(`@project_annotations_${id}`, JSON.stringify(items));
                }
              }
              
              // Загружаем аннотации обложки
              const savedCoverAnnotations = await AsyncStorage.getItem(`@project_cover_annotations_${id}`);
              if (savedCoverAnnotations) {
                const parsed = JSON.parse(savedCoverAnnotations) as Annotation[];
                const { items, changed } = ensureUniqueIds(parsed, 'ann');
                diaryCoverAnnotations = items;
                setCoverAnnotations(items);
                if (changed) {
                  await AsyncStorage.setItem(`@project_cover_annotations_${id}`, JSON.stringify(items));
                }
              }
              
              // Сохраняем начальное состояние для отслеживания изменений
              lastSavedStateRef.current = {
                images: [...imageUris],
                annotations: JSON.parse(JSON.stringify(diaryAnnotations)),
                coverAnnotations: JSON.parse(JSON.stringify(diaryCoverAnnotations)),
              };
            }
            
            // Если проекта нет, создаём его сразу — чтобы сохранение текста/фото работало до обновления URL
            if (!id && (coverType || interiorType) && celebration) {
              const newProjectId = Date.now().toString();
              setEffectiveProjectId(newProjectId);
              const diaryCover = coverType ? getDiaryCoverById(coverType) : null;
              
              const projectData: any = {
                id: newProjectId,
                title: diaryCover?.name || foundAlbumName || getCelebrationTitle(celebration),
                category: celebration,
                albumId: foundAlbumId,
                coverType: coverType || null,
                createdAt: new Date().toISOString(),
                isReadyMadeAlbum: true,
                hasPdfTemplate: true,
                pagesCount: imageUris.length,
              };
              
              if (celebration === 'diary' && diaryCover) {
                projectData.thumbnailPath = diaryCover.image;
              }
              if (eventDate) {
                projectData.reminderDate = eventDate;
              }
              
              await AsyncStorage.setItem(`@project_${newProjectId}`, JSON.stringify(projectData));
              await AsyncStorage.setItem(`@project_images_${newProjectId}`, JSON.stringify(imageUris));
              await AsyncStorage.setItem(`@project_annotations_${newProjectId}`, JSON.stringify(diaryAnnotations));
              await AsyncStorage.setItem(`@project_cover_annotations_${newProjectId}`, JSON.stringify(diaryCoverAnnotations));
              const existingProjects = await AsyncStorage.getItem('@user_projects');
              const projects = existingProjects ? JSON.parse(existingProjects) : [];
              projects.push(projectData);
              await AsyncStorage.setItem('@user_projects', JSON.stringify(projects));
              const pushResultDiary = await pushAccountDataToCloud({ forceIncludeProjectIds: [newProjectId] });
              scheduleSyncToCloud();
              if (!pushResultDiary.ok && __DEV__) {
                console.warn('[EditAlbum] Синхронизация при создании дневника не удалась:', pushResultDiary.error);
              }
              router.replace({
                pathname: '/edit-album',
                params: {
                  id: newProjectId,
                  celebration,
                  coverType,
                  interiorType,
                  eventDate,
                }
              });
            }
            
            return; // Выходим, так как загрузка завершена
          }
        }
      }
      
      // Для остальных категорий используем стандартную логику
      console.log('[DEBUG] Using standard (non-diary) logic:', { foundAlbumId, celebration });
      pageCount = getAlbumPageCount(foundAlbumId);
      // Устанавливаем totalPages сразу, чтобы пагинация работала правильно
      setTotalPages(pageCount);

      if (id) {
        // СУПЕР БЫСТРАЯ проверка сохраненных изображений - используем их МГНОВЕННО
        // Используем Promise.race для максимальной скорости
        const savedImagesPromise = AsyncStorage.getItem(`@project_images_${id}`);
        const savedImages = await savedImagesPromise;
        
        if (savedImages) {
          try {
            const parsed = JSON.parse(savedImages);
            if (Array.isArray(parsed) && parsed.length > 0) {
              imageUris = parsed;
              // Устанавливаем данные СРАЗУ, не ждем ничего
              setImages(imageUris);
              setTotalPages(imageUris.length);
              setIsLoading(false);
              
              // Загружаем сохраненные аннотации ПЕРЕД выходом
              let loadedAnnotations: Annotation[] = [];
              const savedAnnotations = await AsyncStorage.getItem(`@project_annotations_${id}`);
              if (savedAnnotations) {
                const parsed = JSON.parse(savedAnnotations) as Annotation[];
                const { items, changed } = ensureUniqueIds(parsed, 'ann');
                loadedAnnotations = items;
                setAnnotations(items);
                if (changed) {
                  await AsyncStorage.setItem(`@project_annotations_${id}`, JSON.stringify(items));
                }
              }
              
              // Загружаем аннотации обложки
              let loadedCoverAnnotations: Annotation[] = [];
              const savedCoverAnnotations = await AsyncStorage.getItem(`@project_cover_annotations_${id}`);
              if (savedCoverAnnotations) {
                const parsed = JSON.parse(savedCoverAnnotations) as Annotation[];
                const { items, changed } = ensureUniqueIds(parsed, 'ann');
                loadedCoverAnnotations = items;
                setCoverAnnotations(items);
                if (changed) {
                  await AsyncStorage.setItem(`@project_cover_annotations_${id}`, JSON.stringify(items));
                }
              }
              
              // Сохраняем начальное состояние для отслеживания изменений
              lastSavedStateRef.current = {
                images: [...imageUris],
                annotations: JSON.parse(JSON.stringify(loadedAnnotations)),
                coverAnnotations: JSON.parse(JSON.stringify(loadedCoverAnnotations)),
              };
              
              // Параллельно загружаем остальные страницы в фоне (не блокируем)
              // ВАЖНО: Догружаем только если сохраненных страниц меньше оригинальных
              // Но не перезаписываем, если пользователь специально удалил страницы
              if (parsed.length < pageCount) {
                // Используем requestIdleCallback для фоновой загрузки
                Promise.resolve().then(async () => {
                  try {
                    const full = await getAlbumImageUris(foundAlbumId);
                    // Догружаем только недостающие страницы, не перезаписывая существующие
                    if (full.length > parsed.length) {
                      // Объединяем сохраненные и недостающие страницы
                      const missingPages = full.slice(parsed.length);
                      const combined = [...parsed, ...missingPages];
                      await AsyncStorage.setItem(`@project_images_${id}`, JSON.stringify(combined));
                      setImages(combined);
                      setTotalPages(combined.length);
                    }
                  } catch (err) {
                    // Игнорируем ошибки
                  }
                });
              }
              return; // Выходим сразу - данные уже установлены
            }
          } catch {
            // Если ошибка парсинга, продолжаем обычную загрузку
          }
        }
      }

      // МАКСИМАЛЬНО БЫСТРАЯ загрузка первых страниц
      // ВАЖНО: Для существующих проектов не загружаем оригинальные изображения,
      // если сохраненные данные уже загружены или загружаются
      const imageModules = getAlbumImages(foundAlbumId);
      if (imageModules.length > 0) {
        // Для существующих проектов проверяем, не загружаются ли уже сохраненные данные
        if (id) {
          // Дополнительная проверка: возможно сохраненные данные загружаются асинхронно
          const doubleCheckSaved = await AsyncStorage.getItem(`@project_images_${id}`);
          if (doubleCheckSaved) {
            try {
              const parsed = JSON.parse(doubleCheckSaved);
              if (Array.isArray(parsed) && parsed.length > 0) {
                // Используем сохраненные данные
                setImages(parsed);
                setTotalPages(parsed.length);
                setIsLoading(false);
                
                // Загружаем аннотации
                let loadedAnnotations2: Annotation[] = [];
                const savedAnnotations = await AsyncStorage.getItem(`@project_annotations_${id}`);
                if (savedAnnotations) {
                  const parsed = JSON.parse(savedAnnotations) as Annotation[];
                  const { items, changed } = ensureUniqueIds(parsed, 'ann');
                  loadedAnnotations2 = items;
                  setAnnotations(items);
                  if (changed) {
                    await AsyncStorage.setItem(`@project_annotations_${id}`, JSON.stringify(items));
                  }
                }
                
                // Загружаем аннотации обложки
                let loadedCoverAnnotations2: Annotation[] = [];
                const savedCoverAnnotations = await AsyncStorage.getItem(`@project_cover_annotations_${id}`);
                if (savedCoverAnnotations) {
                  const parsed = JSON.parse(savedCoverAnnotations) as Annotation[];
                  const { items, changed } = ensureUniqueIds(parsed, 'ann');
                  loadedCoverAnnotations2 = items;
                  setCoverAnnotations(items);
                  if (changed) {
                    await AsyncStorage.setItem(`@project_cover_annotations_${id}`, JSON.stringify(items));
                  }
                }
                
                // Сохраняем начальное состояние для отслеживания изменений
                lastSavedStateRef.current = {
                  images: [...parsed],
                  annotations: JSON.parse(JSON.stringify(loadedAnnotations2)),
                  coverAnnotations: JSON.parse(JSON.stringify(loadedCoverAnnotations2)),
                };
                
                return; // Выходим - используем сохраненные данные
              }
            } catch {
              // Если ошибка парсинга, продолжаем загрузку оригинальных
            }
          }
        }
        
        // Показываем экран МГНОВЕННО - не ждем ничего
        setIsLoading(false);
        
        // Загружаем первую страницу СУПЕР БЫСТРО (только для новых проектов или если нет сохраненных)
        const firstImage = imageModules[0];
        if (firstImage) {
          try {
            const asset = Asset.fromModule(firstImage);
            // Используем URI сразу если доступен
            const immediateUri = asset.localUri || asset.uri;
            if (immediateUri) {
              // Не перезаписываем, если уже есть сохраненные изображения
              setImages((prev) => {
                if (prev.length === 0) {
                  return [immediateUri];
                }
                return prev;
              });
            }
            
            // Параллельно догружаем и обновляем
            asset.downloadAsync().then(() => {
              const finalUri = asset.localUri || asset.uri;
              if (finalUri && finalUri !== immediateUri) {
                // Не перезаписываем, если уже есть сохраненные изображения
                setImages((prev) => {
                  if (prev.length === 0 || (prev.length === 1 && prev[0] === immediateUri)) {
                    return [finalUri];
                  }
                  return prev;
                });
              }
            }).catch(() => {});
          } catch {
            // Игнорируем ошибки
          }
        }

        // Параллельно загружаем следующие 9 страниц (первые 10 всего) для быстрого скролла
        // Только если это новый проект (нет id) или нет сохраненных данных
        if (!id) {
          const nextImages = imageModules.slice(1, 10);
          Promise.all(
            nextImages.map(async (image) => {
              try {
                const asset = Asset.fromModule(image);
                await asset.downloadAsync();
                return asset.localUri || asset.uri;
              } catch {
                return null;
              }
            })
          ).then((nextUris) => {
            const filtered = nextUris.filter((uri): uri is string => uri !== null);
            setImages((prev) => {
              // Не дедуплицируем по URI: у разных страниц один и тот же файл (шаблон) — законно.
              return [...prev, ...filtered];
            });
          }).catch(() => {});
        }

        // Фоновая предзагрузка ВСЕХ остальных страниц (не блокирует UI)
        // ВАЖНО: Не перезаписываем сохраненные изображения для существующих проектов
        Promise.resolve().then(async () => {
          try {
            // Для существующих проектов не перезаписываем, если уже есть непустой массив
            if (id) {
              const savedImages = await AsyncStorage.getItem(`@project_images_${id}`);
              if (savedImages) {
                try {
                  const parsed = JSON.parse(savedImages);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    return;
                  }
                } catch {}
              }
            }
            
            const full = await getAlbumImageUris(foundAlbumId);
            if (full.length > 0) {
              const storageKey = id ? `@project_images_${id}` : `@project_images_${foundAlbumId}`;
              await AsyncStorage.setItem(storageKey, JSON.stringify(full));
              // Обновляем только если это новый проект или если текущих изображений меньше
              setImages((prev) => {
                if (prev.length < full.length) {
                  return full;
                }
                return prev;
              });
              setTotalPages(full.length);
            }
          } catch (err) {
            // Игнорируем ошибки фоновой загрузки
          }
        });
      } else {
        setIsLoading(false);
      }
      
      // Загружаем сохраненные аннотации
      let finalAnnotations: Annotation[] = [];
      let finalCoverAnnotations: Annotation[] = [];
      if (id) {
        const savedAnnotations = await AsyncStorage.getItem(`@project_annotations_${id}`);
        if (savedAnnotations) {
          const parsed = JSON.parse(savedAnnotations) as Annotation[];
          const { items, changed } = ensureUniqueIds(parsed, 'ann');
          finalAnnotations = items;
          setAnnotations(items);
          if (changed) {
            await AsyncStorage.setItem(`@project_annotations_${id}`, JSON.stringify(items));
          }
        }
        
        // Загружаем аннотации обложки
        const savedCoverAnnotations = await AsyncStorage.getItem(`@project_cover_annotations_${id}`);
        if (savedCoverAnnotations) {
          const parsed = JSON.parse(savedCoverAnnotations) as Annotation[];
          const { items, changed } = ensureUniqueIds(parsed, 'ann');
          finalCoverAnnotations = items;
          setCoverAnnotations(items);
          if (changed) {
            await AsyncStorage.setItem(`@project_cover_annotations_${id}`, JSON.stringify(items));
          }
        }
      }
      
      // Начальное состояние будет сохранено через useEffect после загрузки
      
      // Если проекта нет, создаем его при первом открытии
      if (!id && (coverType || interiorType) && celebration) {
        const newProjectId = Date.now().toString();
        setEffectiveProjectId(newProjectId);
        const albumTemplate = coverType ? getAlbumTemplateById(coverType) : null;
        
        const projectData: any = {
          id: newProjectId,
          title: albumTemplate?.name || foundAlbumName || getCelebrationTitle(celebration),
          category: celebration,
          albumId: foundAlbumId,
          coverType: coverType || null,
          createdAt: new Date().toISOString(),
          isReadyMadeAlbum: true,
          hasPdfTemplate: true,
          pagesCount: imageUris.length || pageCount,
        };
        
        // Сохраняем дату события, если она передана
        if (eventDate) {
          projectData.reminderDate = eventDate;
        }
        
        // Сохраняем информацию о проекте и пустые аннотации (чтобы проект сразу попал в БД при синхронизации).
        // НЕ сохраняем пустой @project_images_ — иначе фоновая загрузка страниц не сработает после router.replace.
        await AsyncStorage.setItem(`@project_${newProjectId}`, JSON.stringify(projectData));
        await AsyncStorage.setItem(`@project_annotations_${newProjectId}`, JSON.stringify([]));
        await AsyncStorage.setItem(`@project_cover_annotations_${newProjectId}`, JSON.stringify([]));
        const existingProjects = await AsyncStorage.getItem('@user_projects');
        const projects = existingProjects ? JSON.parse(existingProjects) : [];
        projects.push(projectData);
        await AsyncStorage.setItem('@user_projects', JSON.stringify(projects));
        const pushResult = await pushAccountDataToCloud({ forceIncludeProjectIds: [newProjectId] });
        scheduleSyncToCloud();
        if (!pushResult.ok && __DEV__) {
          console.warn('[EditAlbum] Синхронизация при создании проекта не удалась:', pushResult.error);
        }
        // Обновляем URL с новым ID проекта
        router.replace({
          pathname: '/edit-album',
          params: {
            id: newProjectId,
            celebration,
            coverType,
            interiorType,
            eventDate,
          }
        });
      } else if (id && eventDate) {
        // Если проект существует и передана новая дата, обновляем её
        const projectData = await AsyncStorage.getItem(`@project_${id}`);
        if (projectData) {
          const project = JSON.parse(projectData);
          project.reminderDate = eventDate;
          await AsyncStorage.setItem(`@project_${id}`, JSON.stringify(project));
          
          // Обновляем в списке проектов
          const existingProjects = await AsyncStorage.getItem('@user_projects');
          if (existingProjects) {
            const projects = JSON.parse(existingProjects);
            const projectIndex = projects.findIndex((p: any) => p.id === id);
            if (projectIndex !== -1) {
              projects[projectIndex].reminderDate = eventDate;
              await AsyncStorage.setItem('@user_projects', JSON.stringify(projects));
            }
          }
        }
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading images data:', error);
      setImages([]);
      setIsLoading(false);
    }
  };

  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: containerOpacity.value,
    };
  });

  const getCelebrationTitle = (celebrationId: string) => {
    const celebrationMap: { [key: string]: string } = {
      pregnancy: 'Беременность',
      kids: 'Детство',
      family: 'Семья',
      wedding: 'Свадьба',
      travel: 'Путешествия',
      holidays: 'Праздники и события',
      diary: 'Дневники',
    };
    return celebrationMap[celebrationId] || 'Праздник';
  };

  const handleExport = async () => {
    if (exportInProgressRef.current || isExporting) return;
    exportInProgressRef.current = true;
    setIsExporting(true);
    try {
      console.log('[Export] Начало экспорта');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Закрываем редактирование текста, если оно активно
      if (isAddingText && annotationsRef.current) {
        annotationsRef.current?.closeEditing?.();
        setIsAddingText(false);
        setEditingTextAnnotationId(null);
        setCurrentTextAnnotation(null);
      }
      
      // Определяем правильный albumId для экспорта
      const exportAlbumId = albumId || interiorType || coverType || (celebration === 'kids' ? 'kids_48' : 'pregnancy_60');
      console.log('[Export] albumId:', exportAlbumId, 'celebration:', celebration);
      
      // Убеждаемся, что проект сохранен перед экспортом (storageId = id из URL или effectiveProjectId)
      if (!storageId) {
        const tempProjectId = Date.now().toString();
        const projectData = {
          id: tempProjectId,
          title: albumName || getCelebrationTitle(celebration || ''),
          albumId: exportAlbumId,
          coverType: coverType || null,
          category: celebration || null,
          createdAt: new Date().toISOString(),
          isReadyMadeAlbum: true,
        };
        
        console.log('[Export] Создание временного проекта:', tempProjectId);
        await AsyncStorage.setItem(`@project_${tempProjectId}`, JSON.stringify(projectData));
        
        // Сохраняем текущие изображения и аннотации
        await AsyncStorage.setItem(`@project_images_${tempProjectId}`, JSON.stringify(images));
        await AsyncStorage.setItem(`@project_annotations_${tempProjectId}`, JSON.stringify(annotations));
        await AsyncStorage.setItem(`@project_cover_annotations_${tempProjectId}`, JSON.stringify(coverAnnotations));
        
        console.log('[Export] Переход на страницу экспорта');
        exportInProgressRef.current = false;
        router.push({
          pathname: '/export-pdf',
          params: {
            id: tempProjectId,
            coverType: coverType || undefined,
            celebration: celebration || undefined,
          },
        });
      } else {
        if (!storageId) return;
        const projectData = await AsyncStorage.getItem(`@project_${storageId}`);
        if (projectData) {
          const project = JSON.parse(projectData);
          const updatedProject = {
            ...project,
            albumId: exportAlbumId,
            coverType: coverType || project.coverType || null,
            category: celebration || project.category || null,
            title: albumName || project.title || getCelebrationTitle(celebration || ''),
          };
          await AsyncStorage.setItem(`@project_${storageId}`, JSON.stringify(updatedProject));
        } else {
          const newProjectData = {
            id: storageId,
            title: albumName || getCelebrationTitle(celebration || ''),
            albumId: exportAlbumId,
            coverType: coverType || null,
            category: celebration || null,
            createdAt: new Date().toISOString(),
            isReadyMadeAlbum: true,
          };
          await AsyncStorage.setItem(`@project_${storageId}`, JSON.stringify(newProjectData));
        }
        await AsyncStorage.setItem(`@project_images_${storageId}`, JSON.stringify(images));
        await AsyncStorage.setItem(`@project_annotations_${storageId}`, JSON.stringify(annotations));
        await AsyncStorage.setItem(`@project_cover_annotations_${storageId}`, JSON.stringify(coverAnnotations));
        // Сразу переходим на экран экспорта; пуш в облако — в фоне, чтобы не было перехода на главную
        console.log('[Export] Переход на страницу экспорта для проекта:', storageId);
        exportInProgressRef.current = false;
        router.push({
          pathname: '/export-pdf',
          params: {
            id: storageId,
            coverType: coverType || undefined,
            celebration: celebration || undefined,
          },
        });
        pushAccountDataToCloud({ forceIncludeProjectIds: [storageId] }).then(() => scheduleSyncToCloud()).catch(() => {});
      }
    } catch (error) {
      console.error('[Export] Ошибка при экспорте:', error);
      Alert.alert('Ошибка', 'Не удалось начать экспорт. Попробуйте снова.');
      exportInProgressRef.current = false;
      setIsExporting(false);
    }
  };

  const handlePageChange = (page: number, total: number) => {
    setCurrentPage(page);
    setTotalPages(total);
  };

  const handleError = (error: any) => {
    console.error('Images Error:', error);
    Alert.alert(
      'Ошибка загрузки',
      'Не удалось загрузить изображения. Попробуйте позже.',
      [{ text: 'OK' }]
    );
  };

  const handleAnnotationAdd = (annotation: Annotation) => {
    setAnnotations(prev => {
      const existingIds = new Set(prev.map(a => a.id));
      const safeId = existingIds.has(annotation.id) ? createId('ann') : annotation.id;
      const newAnnotation = { ...annotation, id: safeId, page: currentPage };
      const next = [...prev, newAnnotation];
      if (storageId) {
        AsyncStorage.setItem(`@project_annotations_${storageId}`, JSON.stringify(next)).catch(() => {});
      }
      return next;
    });
  };

  const handleAnnotationUpdate = (annotationId: string, updates: Partial<Annotation>) => {
    setAnnotations(prev => {
      const next = prev.map(ann => (ann.id === annotationId ? { ...ann, ...updates } : ann));
      if (storageId) {
        AsyncStorage.setItem(`@project_annotations_${storageId}`, JSON.stringify(next)).catch(() => {});
      }
      return next;
    });

    if (updates.color || updates.fontSize || updates.fontFamily) {
      if (updates.fontFamily) lastFontFamilyRef.current = updates.fontFamily;
      setLastTextStyle((prev) => {
        const nextStyle = {
          color: updates.color ?? prev.color,
          fontSize: updates.fontSize ?? prev.fontSize,
          fontFamily: updates.fontFamily ?? prev.fontFamily,
        };
        if (nextStyle.fontFamily) AsyncStorage.setItem('@last_text_font_family', nextStyle.fontFamily).catch(() => {});
        Promise.all([
          AsyncStorage.getItem('@last_text_style'),
          AsyncStorage.getItem('@last_text_font_family'),
        ]).then(([raw, fontRaw]) => {
          let mergedFont = nextStyle.fontFamily;
          if (mergedFont == null && raw) {
            try { mergedFont = (JSON.parse(raw) as { fontFamily?: string }).fontFamily; } catch (_) {}
          }
          if (mergedFont == null && fontRaw) mergedFont = fontRaw;
          const toSave = { ...nextStyle, fontFamily: mergedFont ?? nextStyle.fontFamily };
          if (toSave.fontFamily) AsyncStorage.setItem('@last_text_font_family', toSave.fontFamily).catch(() => {});
          const styleJson = JSON.stringify(toSave);
          if (storageId) AsyncStorage.setItem(`@project_last_text_style_${storageId}`, styleJson).catch(() => {});
          AsyncStorage.setItem('@last_text_style', styleJson).catch(() => {});
        }).catch(() => {});
        return nextStyle;
      });
    }
  };

  const handleAnnotationDelete = (annotationId: string) => {
    setAnnotations(prev => {
      const next = prev.filter(ann => ann.id !== annotationId);
      if (storageId) {
        AsyncStorage.setItem(`@project_annotations_${storageId}`, JSON.stringify(next)).catch(() => {});
      }
      return next;
    });
  };

  // Подсчёт фото в аннотациях для метаданных проекта
  const countPhotoAnnotations = (items: Annotation[]): number => {
    return items.filter((ann) => ann?.type === 'image' && typeof (ann as any)?.imageUri === 'string').length;
  };

  // Гарантирует, что текущий альбом есть в «Мои проекты» и синхронизирован с облаком
  const ensureProjectInUserProjects = async () => {
    if (!storageId) return;
    const existing = await AsyncStorage.getItem(`@project_${storageId}`);
    let projectData: any = null;
    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) projectData = parsed;
      } catch {}
    }
    const pagesCount = images.length;
    const photosCount = countPhotoAnnotations(annotations) + countPhotoAnnotations(coverAnnotations);
    if (!projectData) {
      projectData = {
        id: storageId,
        title: albumName || getCelebrationTitle(celebration || ''),
        category: celebration || '',
        albumId: albumId || interiorType || coverType || '',
        coverType: coverType || null,
        createdAt: new Date().toISOString(),
        isReadyMadeAlbum: true,
        hasPdfTemplate: true,
        pagesCount,
        photosCount,
      };
      if (eventDate) projectData.reminderDate = eventDate;
    } else {
      projectData.pagesCount = pagesCount;
      projectData.photosCount = photosCount;
      projectData.hasPdfTemplate = true;
      projectData.isReadyMadeAlbum = true;
      if (albumName) projectData.title = albumName;
      if (coverType) projectData.coverType = coverType;
    }
    await AsyncStorage.setItem(`@project_${storageId}`, JSON.stringify(projectData));
    const rawList = await AsyncStorage.getItem('@user_projects');
    const list: any[] = rawList ? JSON.parse(rawList) : [];
    const idx = list.findIndex((p: any) => String(p.id) === String(storageId));
    if (idx === -1) {
      list.push(projectData);
    } else {
      list[idx] = { ...list[idx], ...projectData };
    }
    await AsyncStorage.setItem('@user_projects', JSON.stringify(list));
    if (__DEV__) console.log('[EditAlbum] ensureProjectInUserProjects: saved', storageId, 'list length', list.length);
  };

  // Функция для сохранения всех данных проекта (локально и в облако). silent: не показывать алерт при ошибке синхронизации (для автосохранения). Возвращает результат синхронизации с БД.
  const saveAllData = async (opts?: { silent?: boolean; markCommitted?: boolean }): Promise<{ pushOk: boolean; pushError?: string }> => {
    const silent = opts?.silent ?? false;
    const out = { pushOk: false, pushError: undefined as string | undefined };

    // Гарантируем, что код доступа и запись accounts существуют в Supabase ДО пуша проекта
    try { await ensureSyncReady(); } catch (_) { /* не блокируем сохранение */ }

    let effectiveId = storageId;
    const hasContent = images.length > 0 || annotations.length > 0 || coverAnnotations.length > 0;
    if (!effectiveId && hasContent) {
      effectiveId = Date.now().toString();
      setEffectiveProjectId(effectiveId);
      const projectData: any = {
        id: effectiveId,
        title: albumName || getCelebrationTitle(celebration || ''),
        category: celebration || '',
        albumId: albumId || interiorType || coverType || '',
        coverType: coverType || null,
        createdAt: new Date().toISOString(),
        isReadyMadeAlbum: true,
        hasPdfTemplate: true,
        pagesCount: images.length,
        photosCount: countPhotoAnnotations(annotations) + countPhotoAnnotations(coverAnnotations),
      };
      if (eventDate) projectData.reminderDate = eventDate;
      await AsyncStorage.setItem(`@project_${effectiveId}`, JSON.stringify(projectData));
      const rawList = await AsyncStorage.getItem('@user_projects');
      const list: any[] = rawList ? JSON.parse(rawList) : [];
      if (list.every((p: any) => String(p?.id) !== String(effectiveId))) {
        list.push(projectData);
        await AsyncStorage.setItem('@user_projects', JSON.stringify(list));
      }
      if (__DEV__) console.log('[EditAlbum] saveAllData: created new project', effectiveId);
    }
    if (!effectiveId) {
      if (__DEV__) console.warn('[EditAlbum] saveAllData: no effectiveId, aborting');
      return out;
    }
    try {
      // 1. Локальное сохранение — изображения, аннотации
      await Promise.all([
        AsyncStorage.setItem(`@project_images_${effectiveId}`, JSON.stringify(images)),
        AsyncStorage.setItem(`@project_annotations_${effectiveId}`, JSON.stringify(annotations)),
        AsyncStorage.setItem(`@project_cover_annotations_${effectiveId}`, JSON.stringify(coverAnnotations)),
      ]);
      if (__DEV__) console.log('[EditAlbum] saveAllData: local save OK for', effectiveId, '| images:', images.length, '| annotations:', annotations.length, '| coverAnnotations:', coverAnnotations.length);

      lastSavedStateRef.current = {
        images: [...images],
        annotations: JSON.parse(JSON.stringify(annotations)),
        coverAnnotations: JSON.parse(JSON.stringify(coverAnnotations)),
        projectMetaJson: await AsyncStorage.getItem(`@project_${effectiveId}`),
      };

      if (opts?.markCommitted && effectiveId) {
        userCommittedRef.current = true;
        await AsyncStorage.setItem(`@project_user_committed_${effectiveId}`, 'true');
      }

      // 2. Обновляем @user_projects — гарантируем, что проект есть в списке
      if (effectiveId === storageId) {
        await ensureProjectInUserProjects();
      } else {
        const projectData: any = {
          id: effectiveId,
          title: albumName || getCelebrationTitle(celebration || ''),
          category: celebration || '',
          albumId: albumId || interiorType || coverType || '',
          coverType: coverType || null,
          createdAt: new Date().toISOString(),
          isReadyMadeAlbum: true,
          hasPdfTemplate: true,
          pagesCount: images.length,
          photosCount: countPhotoAnnotations(annotations) + countPhotoAnnotations(coverAnnotations),
        };
        if (eventDate) projectData.reminderDate = eventDate;
        await AsyncStorage.setItem(`@project_${effectiveId}`, JSON.stringify(projectData));
        const rawList2 = await AsyncStorage.getItem('@user_projects');
        const list2: any[] = rawList2 ? JSON.parse(rawList2) : [];
        const idx = list2.findIndex((p: any) => String(p?.id) === String(effectiveId));
        if (idx >= 0) list2[idx] = { ...list2[idx], ...projectData };
        else list2.push(projectData);
        await AsyncStorage.setItem('@user_projects', JSON.stringify(list2));
      }

      // 3. Верификация: перечитываем @user_projects и проверяем что проект в списке
      const verifyRaw = await AsyncStorage.getItem('@user_projects');
      const verifyList: any[] = verifyRaw ? JSON.parse(verifyRaw) : [];
      const inList = verifyList.some((p: any) => String(p?.id) === String(effectiveId));
      if (!inList) {
        // Если проекта нет — добавляем принудительно
        if (__DEV__) console.warn('[EditAlbum] saveAllData: project NOT in @user_projects after save, force-adding');
        const fallbackData: any = {
          id: effectiveId,
          title: albumName || getCelebrationTitle(celebration || ''),
          category: celebration || '',
          albumId: albumId || interiorType || coverType || '',
          coverType: coverType || null,
          createdAt: new Date().toISOString(),
          isReadyMadeAlbum: true,
          hasPdfTemplate: true,
          pagesCount: images.length,
          photosCount: countPhotoAnnotations(annotations) + countPhotoAnnotations(coverAnnotations),
        };
        if (eventDate) fallbackData.reminderDate = eventDate;
        verifyList.push(fallbackData);
        await AsyncStorage.setItem('@user_projects', JSON.stringify(verifyList));
      }
      if (__DEV__) console.log('[EditAlbum] saveAllData: @user_projects verified, count=', verifyList.length, 'projectInList=', true);

      // 4. Отправка в облако (Supabase)
      await new Promise((r) => setTimeout(r, 200));
      let pushResult = await pushAccountDataToCloud({ forceIncludeProjectIds: [effectiveId] });
      if (!pushResult.ok) {
        if (__DEV__) console.warn('[EditAlbum] saveAllData: first push failed:', pushResult.error, '- retrying...');
        await new Promise((r) => setTimeout(r, 500));
        pushResult = await pushAccountDataToCloud({ forceIncludeProjectIds: [effectiveId] });
      }
      scheduleSyncToCloud();
      out.pushOk = pushResult.ok;
      out.pushError = pushResult.error;
      if (__DEV__) console.log('[EditAlbum] saveAllData: push result ok=', pushResult.ok, 'error=', pushResult.error ?? 'none');
      if (!pushResult.ok && !silent) {
        if (isSupabaseNotConfiguredError(pushResult.error)) {
          const msg = getSupabaseNotConfiguredAlertMessageOnce();
          if (msg) Alert.alert('Сохранено на устройстве', msg, [{ text: 'OK' }]);
        } else {
          const msg = pushResult.error ?? 'Неизвестная ошибка';
          Alert.alert(
            'Сохранено на устройстве',
            `Проект сохранён локально. Синхронизация с облаком не удалась.\n\nПричина: ${msg}\n\nПроверьте интернет и настройки Supabase (см. docs/SUPABASE_SETUP.md).`,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('[EditAlbum] saveAllData error:', error);
      out.pushError = (error as Error).message;
      if (!silent) {
        Alert.alert('Ошибка', 'Не удалось сохранить проект. Попробуйте снова.', [{ text: 'OK' }]);
      }
    }
    return out;
  };

  // Периодическое автосохранение в облако каждые 60 сек (текст, фото, аннотации), чтобы данные не терялись
  const saveAllDataRef = React.useRef(saveAllData);
  saveAllDataRef.current = saveAllData;
  useEffect(() => {
    if (!storageId) return;
    const interval = setInterval(() => {
      saveAllDataRef.current?.({ silent: true });
    }, 60000);
    return () => clearInterval(interval);
  }, [storageId]);

  // Проверка наличия несохраненных изменений
  const hasUnsavedChanges = (): boolean => {
    // Если начальное состояние еще не сохранено, считаем что изменений нет
    if (!lastSavedStateRef.current) return false;
    
    const saved = lastSavedStateRef.current;
    
    // Проверяем изменения в изображениях
    if (saved.images.length !== images.length) return true;
    for (let i = 0; i < images.length; i++) {
      if (saved.images[i] !== images[i]) return true;
    }
    
    // Проверяем изменения в аннотациях страниц
    if (saved.annotations.length !== annotations.length) return true;
    const savedAnnotationsStr = JSON.stringify(saved.annotations);
    const currentAnnotationsStr = JSON.stringify(annotations);
    if (savedAnnotationsStr !== currentAnnotationsStr) return true;
    
    // Проверяем изменения в аннотациях обложки
    if (saved.coverAnnotations.length !== coverAnnotations.length) return true;
    const savedCoverAnnotationsStr = JSON.stringify(saved.coverAnnotations);
    const currentCoverAnnotationsStr = JSON.stringify(coverAnnotations);
    if (savedCoverAnnotationsStr !== currentCoverAnnotationsStr) return true;
    
    return false;
  };

  const hasUserContent = (): boolean => {
    // "Пустой проект" для пользователя: нет добавленных фото/текста/рисунков.
    // Шаблонные страницы (images) не считаем контентом пользователя.
    const photoCount = countPhotoAnnotations(annotations) + countPhotoAnnotations(coverAnnotations);
    if (photoCount > 0) return true;
    const hasText = [...annotations, ...coverAnnotations].some(
      (a: any) => a?.type === 'text' && typeof a?.text === 'string' && a.text.trim().length > 0
    );
    if (hasText) return true;
    const hasDrawing = [...annotations, ...coverAnnotations].some((a: any) => a?.type === 'drawing');
    return hasDrawing;
  };

  const deleteProjectEverywhere = async (projectId: string) => {
    const pid = String(projectId);
    const keysToRemove = [
      `@project_${pid}`,
      `@project_images_${pid}`,
      `@project_annotations_${pid}`,
      `@project_cover_annotations_${pid}`,
      `@project_viewport_${pid}`,
      `@project_cover_viewport_${pid}`,
      `@project_pdf_${pid}`,
      `@project_last_text_style_${pid}`,
      `@project_sections_${pid}`,
      `@tutorial_shown_${pid}`,
      `@project_user_committed_${pid}`,
    ];
    await AsyncStorage.multiRemove(keysToRemove);

    const raw = await AsyncStorage.getItem('@user_projects');
    const list: any[] = (() => {
      try {
        const p = raw ? JSON.parse(raw) : [];
        return Array.isArray(p) ? p : [];
      } catch {
        return [];
      }
    })();
    const updated = list.filter((p: any) => String(p?.id) !== pid);
    const updatedJson = JSON.stringify(updated);
    await AsyncStorage.setItem('@user_projects', updatedJson);

    try {
      const accessCode = await AsyncStorage.getItem('@access_code');
      if (accessCode && isSupabaseConfigured()) {
        await deleteProjectInSupabase({
          accessCode,
          projectId: pid,
          updatedUserProjectsJson: updatedJson,
        });
      }
    } catch {
      // не блокируем локальное удаление
    }
  };

  const discardToLastSaved = async (projectId: string) => {
    const saved = lastSavedStateRef.current;
    if (!saved) return;
    const pid = String(projectId);

    setImages([...saved.images]);
    setAnnotations(JSON.parse(JSON.stringify(saved.annotations)));
    setCoverAnnotations(JSON.parse(JSON.stringify(saved.coverAnnotations)));

    await Promise.all([
      AsyncStorage.setItem(`@project_images_${pid}`, JSON.stringify(saved.images)),
      AsyncStorage.setItem(`@project_annotations_${pid}`, JSON.stringify(saved.annotations)),
      AsyncStorage.setItem(`@project_cover_annotations_${pid}`, JSON.stringify(saved.coverAnnotations)),
      saved.projectMetaJson != null
        ? AsyncStorage.setItem(`@project_${pid}`, saved.projectMetaJson)
        : Promise.resolve(),
    ]);
  };

  const handleBack = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Если проект ещё не был "сохранён пользователем" и он пустой — при выходе удаляем его целиком.
    // Это покрывает кейс: "создал новый, ничего не заполнил, вышел — не должен оставаться в списке".
    const canHardDeleteEmpty =
      !!storageId && userCommittedRef.current === false && hasUserContent() === false;

    // Проверяем наличие несохраненных изменений
    if (hasUnsavedChanges()) {
      Alert.alert(
        'Несохраненные изменения',
        'У вас есть несохраненные изменения. Хотите сохранить их перед выходом?',
        [
          {
            text: 'Отмена',
            style: 'cancel',
          },
          {
            text: 'Не сохранять',
            style: 'destructive',
            onPress: async () => {
              try {
                if (canHardDeleteEmpty && storageId) {
                  await deleteProjectEverywhere(storageId);
                } else if (storageId && userCommittedRef.current) {
                  // Было сохранение раньше — откатываем только последние правки
                  await discardToLastSaved(storageId);
                }
              } finally {
                router.replace('/(tabs)');
              }
            },
          },
          {
            text: 'Сохранить',
            onPress: async () => {
              try {
                await ensureSyncReady();
                const result = await saveAllData({ silent: true, markCommitted: true });
                if (result.pushOk) {
                  router.replace('/(tabs)');
                } else {
                  if (isSupabaseNotConfiguredError(result.pushError)) {
                    const msg = getSupabaseNotConfiguredAlertMessageOnce();
                    if (msg) Alert.alert('Сохранено на устройстве', msg, [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]);
                    else router.replace('/(tabs)');
                  } else {
                    Alert.alert(
                      'Сохранено на устройстве',
                      result.pushError ? `В облако не отправлено: ${result.pushError}` : 'В облако не отправлено. Проверьте интернет.',
                      [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
                    );
                  }
                }
              } catch (e) {
                Alert.alert(
                  'Ошибка сохранения',
                  (e as Error).message || 'Попробуйте снова.',
                  [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
                );
              }
            },
          },
        ]
      );
    } else {
      // Если изменений нет:
      // - пустой новый проект удаляем
      // - иначе просто выходим
      if (canHardDeleteEmpty && storageId) {
        try {
          await deleteProjectEverywhere(storageId);
        } finally {
          router.replace('/(tabs)');
        }
      } else {
        router.replace('/(tabs)');
      }
    }
  };

  const handleZoomIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleToolSelect = (tool: 'text' | 'image' | 'drawing' | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentTool(tool);
    setIsEditing(true);
  };

  const handleToolToggle = (tool: 'text' | 'image' | 'drawing') => {
    // Если инструмент уже выбран — выключаем его (выход из режима добавления)
    if (currentTool === tool) {
      handleToolReset();
      return;
    }
    handleToolSelect(tool);
  };

  const handleToolReset = () => {
    setCurrentTool(null);
    setIsAddingText(false);
    setEditingTextAnnotationId(null);
    setCurrentTextAnnotation(null);
  };

  const handleToolDeactivate = () => {
    // Мягкий сброс: просто выключаем выбранный инструмент (например "Текст"),
    // не трогая состояние активного редактирования.
    setCurrentTool(null);
  };

  const handleTextEditingStateChange = (isEditing: boolean, annotationId: string | null) => {
    setIsAddingText(isEditing);
    setEditingTextAnnotationId(annotationId);
    
    if (annotationId) {
      // Находим текущую аннотацию для отображения в верхней панели
      const annotation = viewMode === 'cover' 
        ? coverAnnotations.find(ann => ann.id === annotationId)
        : annotations.find(ann => ann.id === annotationId);
      setCurrentTextAnnotation(annotation || null);

      if (annotation && annotation.type === 'text') {
        const nextStyle = {
          color: annotation.color || '#000000',
          fontSize: annotation.fontSize || 16,
          fontFamily: annotation.fontFamily,
        };
        if (nextStyle.fontFamily) lastFontFamilyRef.current = nextStyle.fontFamily;
        setLastTextStyle(nextStyle);
        const fontToSave = nextStyle.fontFamily;
        if (fontToSave) AsyncStorage.setItem('@last_text_font_family', fontToSave).catch(() => {});
        Promise.all([
          AsyncStorage.getItem('@last_text_style'),
          AsyncStorage.getItem('@last_text_font_family'),
        ]).then(([raw, savedFontRaw]) => {
          let mergedFont = nextStyle.fontFamily;
          if (mergedFont == null && raw) {
            try { mergedFont = (JSON.parse(raw) as { fontFamily?: string }).fontFamily; } catch (_) {}
          }
          if (mergedFont == null && savedFontRaw) mergedFont = savedFontRaw;
          const toSave = { ...nextStyle, fontFamily: mergedFont ?? nextStyle.fontFamily };
          if (toSave.fontFamily) AsyncStorage.setItem('@last_text_font_family', toSave.fontFamily).catch(() => {});
          const styleJson = JSON.stringify(toSave);
          if (id) AsyncStorage.setItem(`@project_last_text_style_${id}`, styleJson).catch(() => {});
          AsyncStorage.setItem('@last_text_style', styleJson).catch(() => {});
        }).catch(() => {});
      }
    } else {
      setCurrentTextAnnotation(null);
    }
  };

  const handleColorButtonPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    annotationsRef.current?.openColorPicker?.();
  };

  const handleFontSizeButtonPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    annotationsRef.current?.openFontSizePicker?.();
  };

  const handleFontButtonPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    annotationsRef.current?.openFontPicker?.();
  };

  const handleToggleEdit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsEditing(prev => !prev);
    if (isEditing) {
      setCurrentTool(null);
      // При выходе из режима редактирования сохраняем все данные
      await saveAllData();
    }
  };

  const handleViewModeToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (viewMode === 'pages') {
      if (storageId) {
        AsyncStorage.setItem(`@project_annotations_${storageId}`, JSON.stringify(annotations));
        scheduleSyncToCloud();
      }
      setViewMode('cover');
    } else {
      if (storageId) {
        AsyncStorage.setItem(`@project_cover_annotations_${storageId}`, JSON.stringify(coverAnnotations));
        scheduleSyncToCloud();
      }
      setViewMode('pages');
    }
    setCurrentTool(null);
  };

  const handleCoverButtonPress = async () => {
    const warned = await AsyncStorage.getItem('@cover_warning_shown');
    if (!warned) {
      Alert.alert(
        'Обложка',
        'Текст на обложке отображается только в мягком переплёте и электронной версии. В твёрдом переплёте текст не будет виден.',
        [{ text: 'Понятно', onPress: async () => {
          await AsyncStorage.setItem('@cover_warning_shown', 'true');
          handleViewModeToggle();
        }}]
      );
    } else {
      handleViewModeToggle();
    }
  };

  const handleCoverAnnotationAdd = (annotation: Annotation) => {
    setCoverAnnotations(prev => {
      const existingIds = new Set(prev.map(a => a.id));
      const safeId = existingIds.has(annotation.id) ? createId('ann') : annotation.id;
      const newAnnotation = { ...annotation, id: safeId, page: 'cover' };
      const next = [...prev, newAnnotation];
      if (storageId) {
        AsyncStorage.setItem(`@project_cover_annotations_${storageId}`, JSON.stringify(next)).catch(() => {});
      }
      return next;
    });
  };

  const handleCoverAnnotationUpdate = (annotationId: string, updates: Partial<Annotation>) => {
    setCoverAnnotations(prev => {
      const next = prev.map(ann => (ann.id === annotationId ? { ...ann, ...updates } : ann));
      if (storageId) {
        AsyncStorage.setItem(`@project_cover_annotations_${storageId}`, JSON.stringify(next)).catch(() => {});
      }
      return next;
    });

    if (updates.color || updates.fontSize || updates.fontFamily) {
      if (updates.fontFamily) lastFontFamilyRef.current = updates.fontFamily;
      setLastTextStyle((prev) => {
        const nextStyle = {
          color: updates.color ?? prev.color,
          fontSize: updates.fontSize ?? prev.fontSize,
          fontFamily: updates.fontFamily ?? prev.fontFamily,
        };
        if (nextStyle.fontFamily) AsyncStorage.setItem('@last_text_font_family', nextStyle.fontFamily).catch(() => {});
        Promise.all([
          AsyncStorage.getItem('@last_text_style'),
          AsyncStorage.getItem('@last_text_font_family'),
        ]).then(([raw, fontRaw]) => {
          let mergedFont = nextStyle.fontFamily;
          if (mergedFont == null && raw) {
            try { mergedFont = (JSON.parse(raw) as { fontFamily?: string }).fontFamily; } catch (_) {}
          }
          if (mergedFont == null && fontRaw) mergedFont = fontRaw;
          const toSave = { ...nextStyle, fontFamily: mergedFont ?? nextStyle.fontFamily };
          if (toSave.fontFamily) AsyncStorage.setItem('@last_text_font_family', toSave.fontFamily).catch(() => {});
          const styleJson = JSON.stringify(toSave);
          if (storageId) AsyncStorage.setItem(`@project_last_text_style_${storageId}`, styleJson).catch(() => {});
          AsyncStorage.setItem('@last_text_style', styleJson).catch(() => {});
        }).catch(() => {});
        return nextStyle;
      });
    }
  };

  const handleCoverAnnotationDelete = (annotationId: string) => {
    setCoverAnnotations(prev => {
      const next = prev.filter(ann => ann.id !== annotationId);
      if (storageId) {
        AsyncStorage.setItem(`@project_cover_annotations_${storageId}`, JSON.stringify(next)).catch(() => {});
      }
      return next;
    });
  };

  // Загружаем все страницы из шаблона альбома
  useEffect(() => {
    const loadTemplatePages = async () => {
      if (!albumId) return;
      
      try {
        // Для дневников используем специальную логику
        if (celebration === 'diary' && albumId.startsWith('diary_interior_')) {
          const interiorUris = await getDiaryInteriorImageUris(albumId);
          if (interiorUris && interiorUris.length > 0) {
            setTemplatePages(interiorUris);
          }
        } else {
          // Для остальных альбомов используем getAlbumImageUris
          const uris = await getAlbumImageUris(albumId);
          if (uris && uris.length > 0) {
            setTemplatePages(uris);
          }
        }
      } catch (error) {
        console.error('Error loading template pages:', error);
      }
    };
    
    loadTemplatePages();
  }, [albumId, celebration]);

  // Открываем модальное окно выбора страницы для дублирования
  const handleOpenPageSelectModal = (targetPageIndex: number) => {
    setTargetPageIndexForDuplicate(targetPageIndex);
    setShowPageSelectModal(true);
  };

  // Добавляем новую страницу в конец альбома
  const handleAddPage = async (sourcePageIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (sourcePageIndex < 0 || sourcePageIndex >= templatePages.length) {
      Alert.alert('Ошибка', 'Выбранная страница не найдена в шаблоне');
      return;
    }
    
    // Получаем изображение страницы из шаблона
    const newPageUri = templatePages[sourcePageIndex];
    const newImages = [...images, newPageUri];
    
    setImages(newImages);
    setTotalPages(newImages.length);
    
    if (id) {
      await AsyncStorage.setItem(`@project_images_${id}`, JSON.stringify(newImages));
    }
    
    setShowAddPageModal(false);
    
    // Переходим на новую страницу
    setTimeout(() => {
      setCurrentPage(newImages.length);
    }, 100);
  };

  // Дублируем страницу из шаблона
  const handlePageDuplicate = async (sourcePageIndex: number, targetPageIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (sourcePageIndex < 0 || sourcePageIndex >= templatePages.length) {
      Alert.alert('Ошибка', 'Выбранная страница не найдена в шаблоне');
      return;
    }
    
    if (targetPageIndex < 0 || targetPageIndex >= images.length) return;
    
    // Получаем изображение страницы из шаблона
    const sourceImageUri = templatePages[sourcePageIndex];
    if (!sourceImageUri) {
      Alert.alert('Ошибка', 'Не удалось загрузить страницу из шаблона');
      return;
    }
    
    const newImages = [...images];
    newImages.splice(targetPageIndex + 1, 0, sourceImageUri);
    
    setImages(newImages);
    setTotalPages(newImages.length);
    
    // Сдвигаем номера страниц для аннотаций после вставленной страницы (новая страница чистая)
    const updatedAnnotations = annotations.map(ann => {
      const annPage = typeof ann.page === 'number' ? ann.page : Number(ann.page || 1);
      if (annPage > targetPageIndex + 1) {
        return { ...ann, page: annPage + 1 };
      }
      return ann;
    });
    
    setAnnotations(updatedAnnotations);
    if (storageId) {
      AsyncStorage.setItem(`@project_images_${storageId}`, JSON.stringify(newImages));
      AsyncStorage.setItem(`@project_annotations_${storageId}`, JSON.stringify(updatedAnnotations));
    }
    setShowPageSelectModal(false);
    setTargetPageIndexForDuplicate(null);
    
    // Прокручиваем к новой странице
    setTimeout(() => {
      setCurrentPage(targetPageIndex + 2);
    }, 100);
  };

  const handlePageDelete = (pageIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (images.length <= 1) {
      Alert.alert('Невозможно удалить', 'Нельзя удалить последнюю страницу альбома');
      return;
    }
    
    if (pageIndex < 0 || pageIndex >= images.length) return;
    
    const newImages = images.filter((_, index) => index !== pageIndex);
    setImages(newImages);
    setTotalPages(newImages.length);
    
    // Удаляем аннотации для удаленной страницы и обновляем номера страниц
    const updatedAnnotations = annotations
      .filter(ann => {
        const annPage = typeof ann.page === 'number' ? ann.page : Number(ann.page || 1);
        return annPage !== pageIndex + 1;
      })
      .map(ann => {
        const annPage = typeof ann.page === 'number' ? ann.page : Number(ann.page || 1);
        if (annPage > pageIndex + 1) {
          return { ...ann, page: annPage - 1 };
        }
        return ann;
      });
    
    setAnnotations(updatedAnnotations);
    if (storageId) {
      AsyncStorage.setItem(`@project_images_${storageId}`, JSON.stringify(newImages));
      AsyncStorage.setItem(`@project_annotations_${storageId}`, JSON.stringify(updatedAnnotations));
    }
    // Обновляем текущую страницу
    if (currentPage > newImages.length) {
      setCurrentPage(newImages.length);
    } else if (currentPage > pageIndex + 1) {
      setCurrentPage(currentPage - 1);
    }
  };


  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View style={[styles.content, containerAnimatedStyle]}>
        {/* Верхняя панель с градиентом */}
        <View style={styles.topBar} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Назад"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.backButtonInner}>
              <Ionicons name="chevron-back" size={22} color="#8B6F5F" />
            </View>
          </TouchableOpacity>
          
          <View style={styles.titleContainer} pointerEvents="none">
            <Text style={styles.albumTitle} numberOfLines={1}>
              {viewMode === 'cover' ? 'Развертка обложки' : (albumName || getCelebrationTitle(celebration || ''))}
            </Text>
            {!isLoading && images.length > 0 && viewMode === 'pages' && (
              <Text style={styles.pageInfo}>
                Страница {currentPage} из {totalPages}
              </Text>
            )}
            {viewMode === 'cover' && (
              <Text style={styles.pageInfo}>
                Редактирование развертки
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.exportButton, (isLoading || isExporting) && styles.exportButtonDisabled]}
            onPress={handleExport}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Экспорт PDF"
            disabled={isLoading || isExporting}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="book-outline" size={20} color="#FFFFFF" />
            <Text style={styles.exportButtonText}>{isExporting ? 'Подготовка…' : 'Получить книгу'}</Text>
          </TouchableOpacity>
        </View>

        {/* Панель масштабирования - показывается только когда не добавляется текст */}
        {!isLoading && images.length > 0 && viewMode === 'pages' && !isAddingText && (
          <View style={styles.zoomControls}>
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={handleZoomOut}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Уменьшить"
            >
              <Ionicons name="remove" size={20} color="#8B6F5F" />
            </TouchableOpacity>
            
            <View style={styles.zoomLevel}>
              <Text style={styles.zoomLevelText}>{Math.round(zoomLevel * 100)}%</Text>
            </View>
            
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={handleZoomIn}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Увеличить"
            >
              <Ionicons name="add" size={20} color="#8B6F5F" />
            </TouchableOpacity>
            
            {/* Счетчик страниц */}
            <View style={styles.pageCounter}>
              <Text style={styles.pageCounterText}>
                {currentPage} / {totalPages}
              </Text>
            </View>
          </View>
        )}

        {/* Панель редактирования текста - показывается только когда добавляется текст */}
        {!isLoading && ((viewMode === 'pages' && images.length > 0) || viewMode === 'cover') && isAddingText && currentTextAnnotation && (
          <View style={styles.textEditControlsPanel}>
            {/* Кнопка цвета */}
            <TouchableOpacity
              style={[styles.textEditControlButton, styles.textEditControlButtonFixed]}
              onPress={handleColorButtonPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Изменить цвет текста"
            >
              <View style={[styles.textColorPreview, { backgroundColor: currentTextAnnotation.color || '#000000' }]} />
              <Text style={styles.textEditControlButtonText}>Цвет</Text>
            </TouchableOpacity>
            
            {/* Кнопка размера */}
            <TouchableOpacity
              style={[styles.textEditControlButton, styles.textEditControlButtonFixed]}
              onPress={handleFontSizeButtonPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Изменить размер шрифта"
            >
              <Ionicons name="text-outline" size={18} color="#8B6F5F" />
              <Text style={styles.textEditControlButtonText}>{currentTextAnnotation.fontSize || 16}px</Text>
            </TouchableOpacity>
            
            {/* Кнопка шрифта */}
            <TouchableOpacity
              style={[styles.textEditControlButton, styles.textEditControlButtonFlex]}
              onPress={handleFontButtonPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Изменить шрифт"
            >
              <Ionicons name="brush-outline" size={18} color="#8B6F5F" />
              {/* Если название длинное — оно скроллится внутри, не сдвигая "Цвет" и "Размер" */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.fontNameScroll}
                contentContainerStyle={styles.fontNameScrollContent}
                keyboardShouldPersistTaps="always"
              >
                <Text style={styles.textEditControlButtonText} numberOfLines={1}>
                  {getFontDisplayName(currentTextAnnotation.fontFamily)}
                </Text>
              </ScrollView>
            </TouchableOpacity>
          </View>
        )}

        {/* Image Viewer или Cover Viewer */}
        <View style={styles.pdfContainer}>
          {viewMode === 'cover' ? (
            fontsLoaded ? (
              <CoverViewer
                albumId={coverType || albumId}
                category={celebration}
                coverType={coverType}
                annotations={coverAnnotations}
                onAnnotationAdd={handleCoverAnnotationAdd}
                onAnnotationUpdate={handleCoverAnnotationUpdate}
                onAnnotationDelete={handleCoverAnnotationDelete}
                isEditing={isEditing}
                currentTool={currentTool}
                onToolReset={handleToolReset}
                onToolDeactivate={handleToolDeactivate}
                onTextEditingStateChange={handleTextEditingStateChange}
                annotationsRef={annotationsRef}
                onViewportChange={setCoverViewport}
                defaultTextStyle={lastTextStyle}
                getLastFontFamily={() => lastFontFamilyRef.current ?? lastTextStyle?.fontFamily ?? undefined}
                firstPageImage={
                  (celebration === 'family' || celebration === 'holidays')
                    ? (() => {
                        const coverSource = getCoverForExport(coverType || albumId, celebration);
                        return coverSource ? Asset.fromModule(coverSource as number | string).uri : undefined;
                      })()
                    : (celebration === 'pregnancy' || celebration === 'kids' || celebration === 'diary') && images[0]
                      ? images[0]
                      : undefined
                }
              />
            ) : (
              <PdfSkeletonLoader />
            )
          ) : isLoading || (images.length > 0 && !fontsLoaded) ? (
            <PdfSkeletonLoader />
          ) : images.length > 0 ? (
            <ImageViewer
              images={images}
              albumName={albumName || getCelebrationTitle(celebration || '')}
              lineGuideId={albumId || undefined}
              onPageChange={handlePageChange}
              onError={handleError}
              annotations={annotations}
              onAnnotationAdd={handleAnnotationAdd}
              onAnnotationUpdate={handleAnnotationUpdate}
              onAnnotationDelete={handleAnnotationDelete}
              isEditing={isEditing}
              currentTool={currentTool}
              onPageDuplicate={handleOpenPageSelectModal}
              onPageDelete={handlePageDelete}
              onToolReset={handleToolReset}
              onToolDeactivate={handleToolDeactivate}
              onTextEditingStateChange={handleTextEditingStateChange}
              annotationsRef={annotationsRef}
              zoomLevel={zoomLevel}
              onViewportChange={setPagesViewport}
              defaultTextStyle={lastTextStyle}
              getLastFontFamily={() => lastFontFamilyRef.current ?? lastTextStyle?.fontFamily ?? undefined}
            />
          ) : (
            <View style={styles.errorContainer}>
              <View style={styles.errorIconContainer}>
                <Ionicons name="image-outline" size={64} color="#D4C4B5" />
              </View>
              <Text style={styles.errorTitle}>Изображения не найдены</Text>
              <Text style={styles.errorText}>
                Не удалось загрузить изображения. Проверьте подключение и попробуйте снова.
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={loadImagesData}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={18} color="#FFFFFF" />
                <Text style={styles.retryButtonText}>Попробовать снова</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Нижняя панель инструментов */}
        <View style={styles.bottomPanel}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.toolsContainer}
            style={styles.toolsScrollView}
          >
            <TouchableOpacity
              style={[
                styles.toolButton,
                isEditing && styles.toolButtonActive,
                !isEditing && styles.toolButtonPrimary
              ]}
              onPress={handleToggleEdit}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={isEditing ? "Завершить редактирование" : "Начать редактирование"}
            >
              <View style={styles.toolIconContainer}>
                <Ionicons 
                  name={isEditing ? "checkmark-circle" : "create-outline"} 
                  size={22} 
                  color={isEditing ? '#FFFFFF' : '#C9A89A'} 
                />
              </View>
              <Text 
                style={[styles.toolButtonText, isEditing && styles.toolButtonTextActive]}
                numberOfLines={1}
              >
                {isEditing ? 'Готово' : 'Редактировать'}
              </Text>
            </TouchableOpacity>

            {/* Кнопка "Обложка" / "Страницы" — всегда видна */}
            <TouchableOpacity
              style={[
                styles.toolButton,
                viewMode === 'cover' ? styles.toolButtonPrimary : undefined
              ]}
              onPress={viewMode === 'cover' ? handleViewModeToggle : handleCoverButtonPress}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={viewMode === 'cover' ? 'Вернуться к страницам' : 'Редактировать обложку'}
            >
              <View style={styles.toolIconContainer}>
                <Ionicons 
                  name={viewMode === 'cover' ? 'documents-outline' : 'book-outline'} 
                  size={22} 
                  color={viewMode === 'cover' ? '#C9A89A' : '#8B6F5F'} 
                />
              </View>
              <Text 
                style={[styles.toolButtonText, viewMode === 'cover' && { color: '#C9A89A', fontWeight: '600' }]}
                numberOfLines={1}
              >
                {viewMode === 'cover' ? 'Страницы' : 'Обложка'}
              </Text>
            </TouchableOpacity>

            {isEditing && viewMode === 'pages' && (
              <>
                <TouchableOpacity
                  style={[
                    styles.toolButton,
                    currentTool === 'text' && styles.toolButtonActive
                  ]}
                  onPress={() => handleToolToggle('text')}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Добавить текст"
                >
                  <View style={styles.toolIconContainer}>
                    <Ionicons 
                      name="text-outline" 
                      size={22} 
                      color={currentTool === 'text' ? '#FFFFFF' : '#8B6F5F'} 
                    />
                  </View>
                  <Text 
                    style={[styles.toolButtonText, currentTool === 'text' && styles.toolButtonTextActive]}
                    numberOfLines={1}
                  >
                    Текст
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.toolButton,
                    currentTool === 'image' && styles.toolButtonActive
                  ]}
                  onPress={() => handleToolToggle('image')}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Добавить фото"
                >
                  <View style={styles.toolIconContainer}>
                    <Ionicons 
                      name="image-outline" 
                      size={22} 
                      color={currentTool === 'image' ? '#FFFFFF' : '#8B6F5F'} 
                    />
                  </View>
                  <Text 
                    style={[styles.toolButtonText, currentTool === 'image' && styles.toolButtonTextActive]}
                    numberOfLines={1}
                  >
                    Фото
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.toolButton}
                  onPress={() => setShowAddPageModal(true)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Добавить страницу"
                >
                  <View style={styles.toolIconContainer}>
                    <Ionicons 
                      name="add-circle-outline" 
                      size={22} 
                      color="#8B6F5F" 
                    />
                  </View>
                  <Text 
                    style={styles.toolButtonText}
                    numberOfLines={1}
                  >
                    Страница
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {isEditing && viewMode === 'cover' && (
              <>
                <TouchableOpacity
                  style={[
                    styles.toolButton,
                    currentTool === 'text' && styles.toolButtonActive
                  ]}
                  onPress={() => handleToolToggle('text')}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Добавить текст"
                >
                  <View style={styles.toolIconContainer}>
                    <Ionicons 
                      name="text-outline" 
                      size={22} 
                      color={currentTool === 'text' ? '#FFFFFF' : '#8B6F5F'} 
                    />
                  </View>
                  <Text 
                    style={[styles.toolButtonText, currentTool === 'text' && styles.toolButtonTextActive]}
                    numberOfLines={1}
                  >
                    Текст
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.toolButton,
                    currentTool === 'image' && styles.toolButtonActive
                  ]}
                  onPress={() => handleToolToggle('image')}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Добавить фото"
                >
                  <View style={styles.toolIconContainer}>
                    <Ionicons 
                      name="image-outline" 
                      size={22} 
                      color={currentTool === 'image' ? '#FFFFFF' : '#8B6F5F'} 
                    />
                  </View>
                  <Text 
                    style={[styles.toolButtonText, currentTool === 'image' && styles.toolButtonTextActive]}
                    numberOfLines={1}
                  >
                    Фото
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Animated.View>

      {/* Модальное окно выбора страницы для дублирования */}
      <Modal
        visible={showPageSelectModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowPageSelectModal(false);
          setTargetPageIndexForDuplicate(null);
        }}
      >
        <View style={styles.pageSelectModalOverlay}>
          <View style={styles.pageSelectModalContent}>
            <View style={styles.pageSelectModalHeader}>
              <Text style={styles.pageSelectModalTitle}>Выберите страницу для дублирования</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPageSelectModal(false);
                  setTargetPageIndexForDuplicate(null);
                }}
                style={styles.pageSelectModalCloseButton}
              >
                <Ionicons name="close" size={24} color="#8B6F5F" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.pageSelectModalScroll}
              contentContainerStyle={styles.pageSelectModalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {templatePages.length === 0 ? (
                <View style={styles.pageSelectEmptyState}>
                  <Ionicons name="document-outline" size={48} color="#D4C4B5" />
                  <Text style={styles.pageSelectEmptyText}>
                    Загрузка страниц шаблона...
                  </Text>
                </View>
              ) : (
                <View style={styles.pageSelectGrid}>
                  {templatePages.map((pageUri, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.pageSelectItem}
                      onPress={() => {
                        if (targetPageIndexForDuplicate !== null) {
                          handlePageDuplicate(index, targetPageIndexForDuplicate);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.pageSelectThumbnail}>
                        <Image
                          source={{ uri: pageUri }}
                          style={styles.pageSelectThumbnailImage}
                          contentFit="cover"
                        />
                      </View>
                      <Text style={styles.pageSelectItemNumber}>
                        Страница {index + 1}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Модальное окно выбора страницы для добавления */}
      <Modal
        visible={showAddPageModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowAddPageModal(false);
        }}
      >
        <View style={styles.pageSelectModalOverlay}>
          <View style={styles.pageSelectModalContent}>
            <View style={styles.pageSelectModalHeader}>
              <Text style={styles.pageSelectModalTitle}>Выберите страницу для добавления</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddPageModal(false);
                }}
                style={styles.pageSelectModalCloseButton}
              >
                <Ionicons name="close" size={24} color="#8B6F5F" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.pageSelectModalScroll}
              contentContainerStyle={styles.pageSelectModalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {templatePages.length === 0 ? (
                <View style={styles.pageSelectEmptyState}>
                  <Ionicons name="document-outline" size={48} color="#D4C4B5" />
                  <Text style={styles.pageSelectEmptyText}>
                    Загрузка страниц шаблона...
                  </Text>
                </View>
              ) : (
                <View style={styles.pageSelectGrid}>
                  {templatePages.map((pageUri, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.pageSelectItem}
                      onPress={() => {
                        handleAddPage(index);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.pageSelectThumbnail}>
                        <Image
                          source={{ uri: pageUri }}
                          style={styles.pageSelectThumbnailImage}
                          contentFit="cover"
                        />
                      </View>
                      <Text style={styles.pageSelectItemNumber}>
                        Страница {index + 1}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F0EB',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 1000,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0E8E0',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  albumTitle: {
    fontSize: 20,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
    textAlign: 'center',
  },
  pageInfo: {
    fontSize: 12,
    color: '#9B8E7F',
    marginTop: 4,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '400',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C9A89A',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 1000,
  },
  exportButtonDisabled: {
    opacity: 0.7,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F0EB',
    gap: 20,
  },
  pageCounter: {
    marginLeft: 'auto',
    backgroundColor: '#C9A89A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  pageCounterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  zoomButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF8F5',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#E8D5C7',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  zoomLevel: {
    backgroundColor: '#C9A89A',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  zoomLevelText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  textEditControlsPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    // Важно: фиксируем начало строки слева, чтобы "Цвет" не сдвигался
    // при длинном названии шрифта.
    justifyContent: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F0EB',
    gap: 20,
  },
  textEditControlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#E8D5C7',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
    minWidth: 80,
  },
  textEditControlButtonFixed: {
    flexShrink: 0,
    minWidth: 96,
  },
  textEditControlButtonFlex: {
    flex: 1,
    minWidth: 0,
  },
  fontNameScroll: {
    flex: 1,
    minWidth: 0,
  },
  fontNameScrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingRight: 8,
  },
  textColorPreview: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8D5C7',
  },
  textEditControlButtonText: {
    fontSize: 14,
    color: '#8B6F5F',
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  textEditControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    flex: 1,
  },
  textControlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: '#F0E8E0',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  colorPreviewButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8D5C7',
  },
  textControlButtonText: {
    fontSize: 12,
    color: '#8B6F5F',
    fontWeight: '500',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  pdfContainer: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 40,
    margin: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F5F0EB',
  },
  errorIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F0E8E0',
  },
  errorTitle: {
    fontSize: 22,
    color: '#8B6F5F',
    marginBottom: 12,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 15,
    color: '#9B8E7F',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '400',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: '#C9A89A',
    borderRadius: 20,
    gap: 8,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
    fontWeight: '600',
  },
  bottomPanel: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F5F0EB',
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    paddingHorizontal: 20,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  toolsScrollView: {
    flexGrow: 0,
  },
  toolsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    gap: 12,
  },
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FAF8F5',
    borderRadius: 16,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#E8D5C7',
    minHeight: 52,
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  toolButtonPrimary: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C9A89A',
    borderWidth: 2,
  },
  toolButtonActive: {
    backgroundColor: '#C9A89A',
    borderColor: '#C9A89A',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  toolIconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolButtonText: {
    fontSize: 14,
    color: '#8B6F5F',
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'sans-serif',
    }),
  },
  toolButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  pageSelectModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pageSelectModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#8B6F5F',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  pageSelectModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E8E0',
  },
  pageSelectModalTitle: {
    fontSize: 22,
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
  pageSelectModalCloseButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageSelectModalScroll: {
    maxHeight: 500,
  },
  pageSelectModalScrollContent: {
    padding: 24,
  },
  pageSelectEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  pageSelectEmptyText: {
    fontSize: 16,
    color: '#9B8E7F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
    fontWeight: '300',
    marginTop: 16,
    textAlign: 'center',
  },
  pageSelectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'flex-start',
  },
  pageSelectItem: {
    width: (SCREEN_WIDTH - 24 * 2 - 16 * 2) / 3,
    alignItems: 'center',
    marginBottom: 8,
  },
  pageSelectThumbnail: {
    width: '100%',
    height: 140,
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#F0E8E0',
    marginBottom: 8,
  },
  pageSelectThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  pageSelectItemNumber: {
    fontSize: 14,
    color: '#8B6F5F',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    fontWeight: '500',
    textAlign: 'center',
  },
});