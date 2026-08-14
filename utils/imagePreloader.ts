/**
 * Утилита для предзагрузки изображений при старте приложения
 * Использует expo-image для кеширования и оптимизации
 */

import { Image } from 'expo-image';
import { Platform } from 'react-native';
import { priorityImagesForPreload, allImagesForPreload } from '@/constants/images';

const PREFETCH_POLICY = { cachePolicy: 'disk' as const };

async function prefetchSource(imageSource: unknown): Promise<void> {
  if (typeof imageSource === 'number') return;
  if (typeof imageSource === 'string' || (imageSource && typeof imageSource === 'object' && 'uri' in imageSource)) {
    await Image.prefetch(imageSource as string, PREFETCH_POLICY);
  }
}

/**
 * Предзагружает изображения с высоким приоритетом
 * Вызывается при старте приложения для критически важных изображений
 */
export const preloadPriorityImages = async (): Promise<void> => {
  try {
    console.log('🖼️ Начинается предзагрузка приоритетных изображений...');
    
    const preloadPromises = priorityImagesForPreload.map(async (imageSource) => {
      // Для require() модулей (number) предзагрузка не требуется
      // Локальные ресурсы загружаются мгновенно и не нуждаются в предзагрузке
      try {
        if (typeof imageSource === 'number') {
          // Пропускаем локальные ресурсы - они загружаются быстро без предзагрузки
          return;
        }
        
        await prefetchSource(imageSource);
      } catch (error) {
        // Игнорируем ошибки предзагрузки отдельных изображений
        // Изображение все равно загрузится при необходимости
        console.warn('⚠️ Ошибка предзагрузки изображения:', error);
      }
    });

    await Promise.all(preloadPromises);
    console.log('✅ Приоритетные изображения предзагружены');
  } catch (error) {
    console.error('❌ Ошибка при предзагрузке приоритетных изображений:', error);
  }
};

/**
 * Предзагружает все изображения в фоновом режиме
 * Вызывается после загрузки приоритетных изображений
 */
export const preloadAllImages = async (): Promise<void> => {
  try {
    console.log('🖼️ Начинается предзагрузка всех изображений...');
    
    // Пропускаем приоритетные (уже загружены)
    const imagesToLoad = allImagesForPreload.filter((img) => 
      !priorityImagesForPreload.includes(img)
    );
    
    // Загружаем партиями для оптимизации памяти
    const batchSize = 10;
    for (let i = 0; i < imagesToLoad.length; i += batchSize) {
      const batch = imagesToLoad.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (imageSource) => {
          try {
            if (typeof imageSource === 'number') {
              // Пропускаем локальные ресурсы - они загружаются быстро без предзагрузки
              return;
            }
            
            await prefetchSource(imageSource);
          } catch (error) {
            console.warn('⚠️ Ошибка предзагрузки изображения:', error);
          }
        })
      );
      
      // Небольшая задержка между партиями для избежания перегрузки
      if (i + batchSize < imagesToLoad.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    
    console.log('✅ Все изображения предзагружены');
  } catch (error) {
    console.error('❌ Ошибка при предзагрузке всех изображений:', error);
  }
};

/**
 * Предзагружает изображения поэтапно
 * 1. Сначала приоритетные (синхронно)
 * 2. Затем все остальные (в фоне)
 */
export const preloadImagesStaged = async (): Promise<void> => {
  await preloadPriorityImages();

  // Android: не греть RAM каталогом обложек — это как раз сценарий «заполнил альбом и поехало».
  if (Platform.OS === 'android') return;

  preloadAllImages().catch((error) => {
    console.error('❌ Ошибка фоновой предзагрузки:', error);
  });
};

/**
 * Предзагружает изображения при старте приложения
 * Рекомендуется вызывать в _layout.tsx или index.tsx
 */
export const initializeImagePreload = (): void => {
  // Запускаем предзагрузку асинхронно, не блокируя старт приложения
  preloadImagesStaged().catch((error) => {
    console.error('❌ Ошибка инициализации предзагрузки изображений:', error);
  });
};

