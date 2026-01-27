import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ImageViewer from '@/components/image-viewer';
import CoverViewer from '@/components/cover-viewer';
import PdfSkeletonLoader from '@/components/pdf-skeleton-loader';
import { Asset } from 'expo-asset';
import { getAlbumTemplateById } from '@/albums';
import { getAlbumImageUris, getAlbumPageCount, getAlbumImages } from '@/utils/albumImages';
import { getDiaryInteriorById, getDiaryInteriorImageUris, getDiaryCoverById } from '@/utils/diaryAlbumsLoader';
import { Annotation, PdfAnnotationsRef, AVAILABLE_FONTS } from '@/components/pdf-annotations';
import { createId, ensureUniqueIds } from '@/utils/id';

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
  const annotationsRef = React.useRef<PdfAnnotationsRef | null>(null);
  const containerOpacity = useSharedValue(0);
  
  // Отслеживание последнего сохраненного состояния для проверки изменений
  const lastSavedStateRef = React.useRef<{
    images: string[];
    annotations: Annotation[];
    coverAnnotations: Annotation[];
  } | null>(null);

  const getFontDisplayName = (fontId?: string) => {
    if (!fontId || fontId === 'default') return 'Системный';
    const match = AVAILABLE_FONTS.find(f => f.id === fontId);
    return match?.displayName || fontId;
  };

  useEffect(() => {
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
      };
    }
  }, [isLoading, images, annotations, coverAnnotations]);

  // Загружаем последний стиль текста: сначала из проекта, потом из глобального
  useEffect(() => {
    const loadLastTextStyle = async () => {
      try {
        // Сначала пробуем загрузить из проекта
        if (id) {
          const projectStyle = await AsyncStorage.getItem(`@project_last_text_style_${id}`);
          if (projectStyle) {
            const parsed = JSON.parse(projectStyle) as any;
            const nextColor = typeof parsed?.color === 'string' && parsed.color ? parsed.color : '#000000';
            const nextFontSize = typeof parsed?.fontSize === 'number' && parsed.fontSize > 0 ? parsed.fontSize : 16;
            const nextFontFamily = typeof parsed?.fontFamily === 'string' ? parsed.fontFamily : undefined;
            setLastTextStyle({ color: nextColor, fontSize: nextFontSize, fontFamily: nextFontFamily });
            return;
          }
        }
        
        // Если нет в проекте, загружаем из глобального ключа
        const globalStyle = await AsyncStorage.getItem('@last_text_style');
        if (globalStyle) {
          const parsed = JSON.parse(globalStyle) as any;
          const nextColor = typeof parsed?.color === 'string' && parsed.color ? parsed.color : '#000000';
          const nextFontSize = typeof parsed?.fontSize === 'number' && parsed.fontSize > 0 ? parsed.fontSize : 16;
          const nextFontFamily = typeof parsed?.fontFamily === 'string' ? parsed.fontFamily : undefined;
          setLastTextStyle({ color: nextColor, fontSize: nextFontSize, fontFamily: nextFontFamily });
          
          // Синхронизируем с проектом
          if (id) {
            AsyncStorage.setItem(`@project_last_text_style_${id}`, globalStyle).catch(() => {});
          }
        }
      } catch {
        // Игнорируем ошибки
      }
    };
    
    loadLastTextStyle();
    
    // Слушаем изменения глобального стиля (когда меняется через pdf-annotations)
    const interval = setInterval(() => {
      AsyncStorage.getItem('@last_text_style').then((globalStyle) => {
        if (globalStyle) {
          try {
            const parsed = JSON.parse(globalStyle) as any;
            const nextColor = typeof parsed?.color === 'string' && parsed.color ? parsed.color : '#000000';
            const nextFontSize = typeof parsed?.fontSize === 'number' && parsed.fontSize > 0 ? parsed.fontSize : 16;
            const nextFontFamily = typeof parsed?.fontFamily === 'string' ? parsed.fontFamily : undefined;
            
            setLastTextStyle((prev) => {
              // Обновляем только если изменилось
              if (prev.color !== nextColor || prev.fontSize !== nextFontSize || prev.fontFamily !== nextFontFamily) {
                const newStyle = { color: nextColor, fontSize: nextFontSize, fontFamily: nextFontFamily };
                // Синхронизируем с проектом
                if (id) {
                  AsyncStorage.setItem(`@project_last_text_style_${id}`, globalStyle).catch(() => {});
                }
                return newStyle;
              }
              return prev;
            });
          } catch {
            // Игнорируем ошибки парсинга
          }
        }
      }).catch(() => {});
    }, 500); // Проверяем каждые 500мс
    
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
    
    // Синхронизируем стиль из глобального ключа при изменении аннотации
    // (когда пользователь меняет стиль через модальные окна в pdf-annotations)
    AsyncStorage.getItem('@last_text_style').then((globalStyle) => {
      if (globalStyle && nextAnnotation && nextAnnotation.type === 'text') {
        try {
          const parsed = JSON.parse(globalStyle) as any;
          const nextColor = typeof parsed?.color === 'string' && parsed.color ? parsed.color : '#000000';
          const nextFontSize = typeof parsed?.fontSize === 'number' && parsed.fontSize > 0 ? parsed.fontSize : 16;
          const nextFontFamily = typeof parsed?.fontFamily === 'string' ? parsed.fontFamily : undefined;
          
          setLastTextStyle((prev) => {
            // Обновляем только если изменилось
            if (prev.color !== nextColor || prev.fontSize !== nextFontSize || prev.fontFamily !== nextFontFamily) {
              const newStyle = { color: nextColor, fontSize: nextFontSize, fontFamily: nextFontFamily };
              // Синхронизируем с проектом
              if (id) {
                AsyncStorage.setItem(`@project_last_text_style_${id}`, globalStyle).catch(() => {});
              }
              return newStyle;
            }
            return prev;
          });
        } catch {
          // Игнорируем ошибки парсинга
        }
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
      if (!foundAlbumId) {
        // Если это категория kids, используем kids_48
        if (celebration === 'kids') {
          foundAlbumId = 'kids_48';
        } else if (celebration === 'diary') {
          // Для дневников используем коричневый блок по умолчанию
          foundAlbumId = 'diary_interior_brown';
        } else {
          foundAlbumId = 'pregnancy_60';
        }
      }
      
      setAlbumId(foundAlbumId);
      setAlbumName(foundAlbumName);
      
      // Загружаем изображения для альбома
      let imageUris: string[] = [];
      let pageCount = 0;
      
      // Для дневников используем специальную логику загрузки
      if (celebration === 'diary' && foundAlbumId.startsWith('diary_interior_')) {
        const interior = getDiaryInteriorById(foundAlbumId);
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
          const interiorUris = await getDiaryInteriorImageUris(foundAlbumId);
          if (interiorUris && interiorUris.length > 0) {
            imageUris = interiorUris;
            setImages(imageUris);
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
            
            // Если проекта нет, создаем его
            if (!id && (coverType || interiorType) && celebration) {
              const newProjectId = Date.now().toString();
              const diaryCover = coverType ? getDiaryCoverById(coverType) : null;
              
              const projectData: any = {
                id: newProjectId,
                title: diaryCover?.name || foundAlbumName || getCelebrationTitle(celebration),
                category: celebration,
                albumId: foundAlbumId,
                createdAt: new Date().toISOString(),
                isReadyMadeAlbum: true,
              };
              
              // Сохраняем обложку дневника для отображения на главной странице
              if (celebration === 'diary' && diaryCover) {
                projectData.thumbnailPath = diaryCover.image;
              }
              
              if (eventDate) {
                projectData.reminderDate = eventDate;
              }
              
              await AsyncStorage.setItem(`@project_${newProjectId}`, JSON.stringify(projectData));
              
              const existingProjects = await AsyncStorage.getItem('@user_projects');
              const projects = existingProjects ? JSON.parse(existingProjects) : [];
              projects.push(projectData);
              await AsyncStorage.setItem('@user_projects', JSON.stringify(projects));
              
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
              const combined = [...prev, ...filtered];
              const unique = combined.filter((uri, idx) => combined.indexOf(uri) === idx);
              return unique;
            });
          }).catch(() => {});
        }

        // Фоновая предзагрузка ВСЕХ остальных страниц (не блокирует UI)
        // ВАЖНО: Не перезаписываем сохраненные изображения для существующих проектов
        Promise.resolve().then(async () => {
          try {
            // Для существующих проектов не перезаписываем сохраненные изображения
            if (id) {
              const savedImages = await AsyncStorage.getItem(`@project_images_${id}`);
              if (savedImages) {
                // Если есть сохраненные изображения, не перезаписываем их
                return;
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
        const albumTemplate = coverType ? getAlbumTemplateById(coverType) : null;
        
        const projectData: any = {
          id: newProjectId,
          title: albumTemplate?.name || foundAlbumName || getCelebrationTitle(celebration),
          category: celebration,
          albumId: foundAlbumId,
          createdAt: new Date().toISOString(),
          isReadyMadeAlbum: true,
        };
        
        // Сохраняем дату события, если она передана
        if (eventDate) {
          projectData.reminderDate = eventDate;
        }
        
        // Сохраняем информацию о проекте
        await AsyncStorage.setItem(`@project_${newProjectId}`, JSON.stringify(projectData));
        
        // Сохраняем в список проектов
        const existingProjects = await AsyncStorage.getItem('@user_projects');
        const projects = existingProjects ? JSON.parse(existingProjects) : [];
        projects.push(projectData);
        await AsyncStorage.setItem('@user_projects', JSON.stringify(projects));
        
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
      diary: 'Дневники',
    };
    return celebrationMap[celebrationId] || 'Праздник';
  };

  const handleExport = async () => {
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
      
      // Убеждаемся, что проект сохранен перед экспортом
      if (!id) {
        // Создаем временный проект для экспорта
        const tempProjectId = Date.now().toString();
        const projectData = {
          id: tempProjectId,
          title: albumName || getCelebrationTitle(celebration || ''),
          albumId: exportAlbumId,
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
        router.push(`/export-pdf?id=${tempProjectId}`);
      } else {
        // Обновляем данные проекта перед экспортом
        const projectData = await AsyncStorage.getItem(`@project_${id}`);
        if (projectData) {
          const project = JSON.parse(projectData);
          // Обновляем проект с актуальными данными
          const updatedProject = {
            ...project,
            albumId: exportAlbumId,
            category: celebration || project.category || null,
            title: albumName || project.title || getCelebrationTitle(celebration || ''),
          };
          await AsyncStorage.setItem(`@project_${id}`, JSON.stringify(updatedProject));
        } else {
          // Если проекта нет, создаем новый
          const newProjectData = {
            id,
            title: albumName || getCelebrationTitle(celebration || ''),
            albumId: exportAlbumId,
            category: celebration || null,
            createdAt: new Date().toISOString(),
            isReadyMadeAlbum: true,
          };
          await AsyncStorage.setItem(`@project_${id}`, JSON.stringify(newProjectData));
        }
        
        // Сохраняем текущие данные перед экспортом
        await AsyncStorage.setItem(`@project_images_${id}`, JSON.stringify(images));
        await AsyncStorage.setItem(`@project_annotations_${id}`, JSON.stringify(annotations));
        await AsyncStorage.setItem(`@project_cover_annotations_${id}`, JSON.stringify(coverAnnotations));
        
        console.log('[Export] Переход на страницу экспорта для проекта:', id);
        router.push(`/export-pdf?id=${id}`);
      }
    } catch (error) {
      console.error('[Export] Ошибка при экспорте:', error);
      Alert.alert('Ошибка', 'Не удалось начать экспорт. Попробуйте снова.');
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
      if (id) {
        AsyncStorage.setItem(`@project_annotations_${id}`, JSON.stringify(next)).catch(() => {});
      }
      return next;
    });
  };

  const handleAnnotationUpdate = (annotationId: string, updates: Partial<Annotation>) => {
    setAnnotations(prev => {
      const next = prev.map(ann => (ann.id === annotationId ? { ...ann, ...updates } : ann));
      if (id) {
        AsyncStorage.setItem(`@project_annotations_${id}`, JSON.stringify(next)).catch(() => {});
      }
      return next;
    });

    if (updates.color || updates.fontSize || updates.fontFamily) {
      setLastTextStyle((prev) => {
        const nextStyle = {
          color: updates.color ?? prev.color,
          fontSize: updates.fontSize ?? prev.fontSize,
          fontFamily: updates.fontFamily ?? prev.fontFamily,
        };
        // Сохраняем и в проект, и в глобальный ключ для синхронизации
        const styleJson = JSON.stringify(nextStyle);
        if (id) {
          AsyncStorage.setItem(`@project_last_text_style_${id}`, styleJson).catch(() => {});
        }
        AsyncStorage.setItem('@last_text_style', styleJson).catch(() => {});
        return nextStyle;
      });
    }
  };

  const handleAnnotationDelete = (annotationId: string) => {
    setAnnotations(prev => {
      const next = prev.filter(ann => ann.id !== annotationId);
      if (id) {
        AsyncStorage.setItem(`@project_annotations_${id}`, JSON.stringify(next)).catch(() => {});
      }
      return next;
    });
  };

  // Функция для сохранения всех данных проекта
  const saveAllData = async () => {
    if (!id) return;
    
    try {
      // Сохраняем все данные параллельно для максимальной скорости
      await Promise.all([
        // Сохраняем изображения
        AsyncStorage.setItem(`@project_images_${id}`, JSON.stringify(images)),
        // Сохраняем аннотации страниц
        AsyncStorage.setItem(`@project_annotations_${id}`, JSON.stringify(annotations)),
        // Сохраняем аннотации обложки
        AsyncStorage.setItem(`@project_cover_annotations_${id}`, JSON.stringify(coverAnnotations)),
      ]);
      
      // Обновляем последнее сохраненное состояние
      lastSavedStateRef.current = {
        images: [...images],
        annotations: JSON.parse(JSON.stringify(annotations)),
        coverAnnotations: JSON.parse(JSON.stringify(coverAnnotations)),
      };
    } catch (error) {
      console.error('Ошибка при сохранении данных проекта:', error);
      // Не блокируем выход, даже если сохранение не удалось
    }
  };

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

  const handleBack = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
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
            onPress: () => {
              // Переходим на главную страницу без сохранения
              router.replace('/(tabs)');
            },
          },
          {
            text: 'Сохранить',
            onPress: async () => {
              // Сохраняем все данные перед выходом
              await saveAllData();
              // Переходим на главную страницу
              router.replace('/(tabs)');
            },
          },
        ]
      );
    } else {
      // Если изменений нет, просто переходим на главную страницу
      router.replace('/(tabs)');
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

      // Запоминаем стиль, чтобы новые тексты создавались сразу с ним
      if (annotation && annotation.type === 'text') {
        const nextStyle = {
          color: annotation.color || '#000000',
          fontSize: annotation.fontSize || 16,
          fontFamily: annotation.fontFamily,
        };
        setLastTextStyle(nextStyle);
        // Сохраняем и в проект, и в глобальный ключ для синхронизации
        const styleJson = JSON.stringify(nextStyle);
        if (id) {
          AsyncStorage.setItem(`@project_last_text_style_${id}`, styleJson).catch(() => {});
        }
        AsyncStorage.setItem('@last_text_style', styleJson).catch(() => {});
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
      // Переключаемся на обложку - сохраняем аннотации страниц
      if (id) {
        AsyncStorage.setItem(`@project_annotations_${id}`, JSON.stringify(annotations));
      }
      setViewMode('cover');
    } else {
      // Переключаемся на страницы - сохраняем аннотации обложки
      if (id) {
        AsyncStorage.setItem(`@project_cover_annotations_${id}`, JSON.stringify(coverAnnotations));
      }
      setViewMode('pages');
    }
    // Сбрасываем инструмент при переключении режимов
    setCurrentTool(null);
  };

  const handleCoverAnnotationAdd = (annotation: Annotation) => {
    setCoverAnnotations(prev => {
      const existingIds = new Set(prev.map(a => a.id));
      const safeId = existingIds.has(annotation.id) ? createId('ann') : annotation.id;
      const newAnnotation = { ...annotation, id: safeId, page: 'cover' };
      const next = [...prev, newAnnotation];
      if (id) {
        AsyncStorage.setItem(`@project_cover_annotations_${id}`, JSON.stringify(next)).catch(() => {});
      }
      return next;
    });
  };

  const handleCoverAnnotationUpdate = (annotationId: string, updates: Partial<Annotation>) => {
    setCoverAnnotations(prev => {
      const next = prev.map(ann => (ann.id === annotationId ? { ...ann, ...updates } : ann));
      if (id) {
        AsyncStorage.setItem(`@project_cover_annotations_${id}`, JSON.stringify(next)).catch(() => {});
      }
      return next;
    });

    if (updates.color || updates.fontSize || updates.fontFamily) {
      setLastTextStyle((prev) => {
        const nextStyle = {
          color: updates.color ?? prev.color,
          fontSize: updates.fontSize ?? prev.fontSize,
          fontFamily: updates.fontFamily ?? prev.fontFamily,
        };
        // Сохраняем и в проект, и в глобальный ключ для синхронизации
        const styleJson = JSON.stringify(nextStyle);
        if (id) {
          AsyncStorage.setItem(`@project_last_text_style_${id}`, styleJson).catch(() => {});
        }
        AsyncStorage.setItem('@last_text_style', styleJson).catch(() => {});
        return nextStyle;
      });
    }
  };

  const handleCoverAnnotationDelete = (annotationId: string) => {
    setCoverAnnotations(prev => {
      const next = prev.filter(ann => ann.id !== annotationId);
      if (id) {
        AsyncStorage.setItem(`@project_cover_annotations_${id}`, JSON.stringify(next)).catch(() => {});
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
    
    // Обновляем аннотации - копируем аннотации с исходной страницы, если они есть
    const sourcePageAnnotations = annotations.filter(ann => (ann.page || 1) === sourcePageIndex + 1);
    const newAnnotations = sourcePageAnnotations.map(ann => ({
      ...ann,
      id: createId('ann'),
      page: newImages.length, // Новая страница будет последней
    }));
    
    const finalAnnotations = [...annotations, ...newAnnotations];
    setAnnotations(finalAnnotations);
    
    if (id) {
      await AsyncStorage.setItem(`@project_images_${id}`, JSON.stringify(newImages));
      await AsyncStorage.setItem(`@project_annotations_${id}`, JSON.stringify(finalAnnotations));
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
    
    // Обновляем аннотации - копируем аннотации для дублированной страницы (если есть)
    const pageAnnotations = annotations.filter(ann => (ann.page || 1) === targetPageIndex + 1);
    const newAnnotations = pageAnnotations.map(ann => ({
      ...ann,
      id: createId('ann'),
      page: targetPageIndex + 2, // Новая страница будет следующей
    }));
    
    // Обновляем номера страниц для всех аннотаций после вставленной страницы
    const updatedAnnotations = annotations.map(ann => {
      const annPage = ann.page || 1;
      if (annPage > targetPageIndex + 1) {
        return { ...ann, page: annPage + 1 };
      }
      return ann;
    });
    
    const finalAnnotations = [...updatedAnnotations, ...newAnnotations];
    setAnnotations(finalAnnotations);
    
    // Сохраняем изменения
    if (id) {
      AsyncStorage.setItem(`@project_images_${id}`, JSON.stringify(newImages));
      AsyncStorage.setItem(`@project_annotations_${id}`, JSON.stringify(finalAnnotations));
    }
    
    // Закрываем модальное окно
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
        const annPage = ann.page || 1;
        return annPage !== pageIndex + 1;
      })
      .map(ann => {
        const annPage = ann.page || 1;
        if (annPage > pageIndex + 1) {
          return { ...ann, page: annPage - 1 };
        }
        return ann;
      });
    
    setAnnotations(updatedAnnotations);
    
    // Сохраняем изменения
    if (id) {
      AsyncStorage.setItem(`@project_images_${id}`, JSON.stringify(newImages));
      AsyncStorage.setItem(`@project_annotations_${id}`, JSON.stringify(updatedAnnotations));
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
            style={styles.exportButton}
            onPress={handleExport}
            onPressIn={() => {
              console.log('[Export] Кнопка нажата');
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Экспорт PDF"
            disabled={isLoading}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="download-outline" size={20} color="#FFFFFF" />
            <Text style={styles.exportButtonText}>Экспорт</Text>
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
              firstPageImage={
                (celebration === 'pregnancy' || celebration === 'kids' || celebration === 'diary') && images[0]
                  ? images[0]
                  : undefined
              }
            />
          ) : isLoading ? (
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

            {isEditing && (
              <>
                <TouchableOpacity
                  style={[
                    styles.toolButton,
                    viewMode === 'cover' && styles.toolButtonActive
                  ]}
                  onPress={handleViewModeToggle}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={viewMode === 'cover' ? "Переключить на страницы" : "Переключить на обложку"}
                >
                  <View style={styles.toolIconContainer}>
                    <Ionicons 
                      name={viewMode === 'cover' ? "book-outline" : "book"} 
                      size={22} 
                      color={viewMode === 'cover' ? '#FFFFFF' : '#8B6F5F'} 
                    />
                  </View>
                  <Text 
                    style={[styles.toolButtonText, viewMode === 'cover' && styles.toolButtonTextActive]}
                    numberOfLines={1}
                  >
                    Обложка
                  </Text>
                </TouchableOpacity>

                {viewMode === 'pages' && (
                  <>
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

                {viewMode === 'cover' && (
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
                )}
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