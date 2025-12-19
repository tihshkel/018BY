import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { PDFFont } from 'pdf-lib';
import { AVAILABLE_FONTS, type FontOption } from '@/components/pdf-annotations';

// Кэш для загруженных шрифтов
const fontCache = new Map<string, PDFFont>();

/**
 * Оптимизированная функция для конвертации base64 в Uint8Array
 * Поддерживает разные окружения (web, React Native)
 */
function base64ToUint8Array(base64: string): Uint8Array {
  try {
    // Проверяем доступность atob
    if (typeof atob !== 'undefined') {
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
    } else {
      // Fallback для окружений без atob (используем Buffer в Node.js или альтернативный метод)
      // Для React Native используем альтернативный метод
      if (Platform.OS === 'web' && typeof Buffer !== 'undefined') {
        return new Uint8Array(Buffer.from(base64, 'base64'));
      } else {
        // Альтернативный метод для React Native (если atob недоступен)
        // Используем полифилл для atob
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        let i = 0;
        const len = base64.length;
        const bytes: number[] = [];
        
        // Удаляем пробелы и переносы строк
        const cleanBase64 = base64.replace(/[\s\n\r]/g, '');
        
        while (i < cleanBase64.length) {
          const encoded1 = chars.indexOf(cleanBase64.charAt(i++));
          const encoded2 = chars.indexOf(cleanBase64.charAt(i++));
          const encoded3 = chars.indexOf(cleanBase64.charAt(i++));
          const encoded4 = chars.indexOf(cleanBase64.charAt(i++));
          
          if (encoded1 === -1 || encoded2 === -1) {
            break; // Некорректные данные
          }
          
          const bitmap = (encoded1 << 18) | (encoded2 << 12) | ((encoded3 === -1 ? 0 : encoded3) << 6) | (encoded4 === -1 ? 0 : encoded4);
          
          bytes.push((bitmap >> 16) & 255);
          if (encoded3 !== -1 && encoded3 !== 64) {
            bytes.push((bitmap >> 8) & 255);
          }
          if (encoded4 !== -1 && encoded4 !== 64) {
            bytes.push(bitmap & 255);
          }
        }
        
        return new Uint8Array(bytes);
      }
    }
  } catch (error) {
    console.error('[Font Loader] Ошибка конвертации base64 в Uint8Array:', error);
    throw error;
  }
}

/**
 * Загружает байты шрифта из файла
 * @param fontOption - Опция шрифта из AVAILABLE_FONTS
 * @returns Uint8Array с байтами шрифта или null
 */
export async function loadFontBytes(fontOption: FontOption): Promise<Uint8Array | null> {
  try {
    if (!fontOption.file) {
      return null; // Системный шрифт
    }

    if (typeof fontOption.file === 'number') {
      // Это require() модуль, используем Asset API
      const asset = Asset.fromModule(fontOption.file);
      await asset.downloadAsync();
      
      if (asset.localUri) {
        try {
          // Читаем файл как base64 и конвертируем в байты (оптимизированно)
          const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          if (!base64 || base64.length === 0) {
            console.warn(`[Font Loader] Пустой base64 для шрифта ${fontOption.id}`);
            return null;
          }
          
          return base64ToUint8Array(base64);
        } catch (readError) {
          console.error(`[Font Loader] Ошибка чтения файла шрифта ${fontOption.id} из ${asset.localUri}:`, readError);
          return null;
        }
      } else if (asset.uri) {
        // Если это веб URI, загружаем через fetch
        if (Platform.OS === 'web') {
          try {
            const response = await fetch(asset.uri);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            return new Uint8Array(arrayBuffer);
          } catch (fetchError) {
            console.error(`[Font Loader] Ошибка загрузки шрифта ${fontOption.id} через fetch:`, fetchError);
            return null;
          }
        } else {
          // Для мобильных устройств скачиваем и читаем
          try {
            const tempFileName = `temp_font_${Date.now()}_${fontOption.id.replace(/[^a-zA-Z0-9]/g, '_')}.${fontOption.id.includes('.otf') || fontOption.id.includes('otf') ? 'otf' : 'ttf'}`;
            const tempPath = FileSystem.cacheDirectory + tempFileName;
            const downloadResult = await FileSystem.downloadAsync(asset.uri, tempPath);
            
            if (downloadResult.uri) {
              const base64 = await FileSystem.readAsStringAsync(downloadResult.uri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              // Удаляем файл асинхронно в фоне
              FileSystem.deleteAsync(tempPath, { idempotent: true }).catch(() => {});
              
              if (!base64 || base64.length === 0) {
                console.warn(`[Font Loader] Пустой base64 для шрифта ${fontOption.id} после скачивания`);
                return null;
              }
              
              return base64ToUint8Array(base64);
            } else {
              console.warn(`[Font Loader] Не удалось скачать шрифт ${fontOption.id}, downloadResult.uri пуст`);
              return null;
            }
          } catch (downloadError) {
            console.error(`[Font Loader] Ошибка скачивания шрифта ${fontOption.id}:`, downloadError);
            return null;
          }
        }
      } else {
        console.warn(`[Font Loader] Нет localUri или uri для шрифта ${fontOption.id}`);
        return null;
      }
    }
    
    console.warn(`[Font Loader] Неподдерживаемый тип файла шрифта ${fontOption.id}: ${typeof fontOption.file}`);
    return null;
  } catch (error) {
    console.error(`[Font Loader] Ошибка загрузки байтов шрифта ${fontOption.id}:`, error);
    return null;
  }
}

/**
 * Предзагружает все шрифты для использования в PDF
 * @param pdfDoc - PDFDocument из pdf-lib
 * @returns Map с загруженными шрифтами (fontId -> PDFFont)
 */
export async function preloadFontsForPdf(pdfDoc: any): Promise<Map<string, any>> {
  const fontsMap = new Map<string, any>();
  
  try {
    // Загружаем все шрифты параллельно
    const fontPromises = AVAILABLE_FONTS.map(async (fontOption) => {
      if (fontOption.id === 'default' || !fontOption.file) {
        return; // Пропускаем системный шрифт
      }
      
      try {
        const fontBytes = await loadFontBytes(fontOption);
        if (fontBytes && fontBytes.length > 0) {
          try {
            // Встраиваем шрифт напрямую в PDFDocument
            const font = await pdfDoc.embedFont(fontBytes);
            fontsMap.set(fontOption.id, font);
            console.log(`[Font Loader] ✓ Загружен шрифт: ${fontOption.displayName}`);
          } catch (embedError) {
            console.warn(`[Font Loader] Не удалось встроить шрифт ${fontOption.id} в PDF:`, embedError);
            // Продолжаем загрузку остальных шрифтов
          }
        } else {
          console.warn(`[Font Loader] Шрифт ${fontOption.id} не загружен: байты пусты или null`);
        }
      } catch (error) {
        console.warn(`[Font Loader] Не удалось загрузить шрифт ${fontOption.id}:`, error);
        // Продолжаем загрузку остальных шрифтов
      }
    });
    
    await Promise.all(fontPromises);
    console.log(`[Font Loader] Загружено ${fontsMap.size} шрифтов для PDF`);
  } catch (error) {
    console.error('[Font Loader] Ошибка предзагрузки шрифтов:', error);
  }
  
  return fontsMap;
}

