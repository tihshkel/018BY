import { getSupabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';

const BUCKET = 'account-images';

/**
 * Загружает локальный файл изображения в Supabase Storage.
 * Возвращает публичный URL или null при ошибке.
 */
export async function uploadImageToStorage(
  accessCode: string,
  projectId: string,
  localUri: string,
  index: number
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  if (localUri.startsWith('https://')) return localUri;
  if (!localUri.startsWith('file://') && !localUri.startsWith('/') && !localUri.startsWith('content://')) {
    return null;
  }

  const uri = localUri.startsWith('/') ? `file://${localUri}` : localUri;

  try {
    // Кэш Expo (ExponentAsset-*) может быть уже очищен к моменту синхронизации — не читать несуществующий файл
    const fileInfo = await FileSystem.getInfoAsync(uri, { size: false });
    if (!fileInfo.exists) {
      return null; // файл удалён — пропускаем загрузку, URI в данных останется как есть
    }

    const ext = uri.toLowerCase().includes('.png') ? 'png' : 'jpg';
    const path =
      projectId === 'avatar'
        ? `avatar/${accessCode}/${index}.${ext}`
        : `${accessCode}/${projectId}/${index}.${ext}`;

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (!base64) return null;
    await yieldToUI();

    const byteChars = atob(base64);
    const bytes = new Uint8Array(byteChars.length);
    // Копируем порциями, чтобы не блокировать UI на больших картинках
    for (let i = 0; i < byteChars.length; i += BYTE_COPY_CHUNK) {
      const end = Math.min(i + BYTE_COPY_CHUNK, byteChars.length);
      for (let j = i; j < end; j++) {
        bytes[j] = byteChars.charCodeAt(j);
      }
      if (end < byteChars.length) await yieldToUI();
    }

    const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.warn('[SupabaseStorage] Upload error:', error.message);
      return null;
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
    return urlData?.publicUrl ?? null;
  } catch (e) {
    console.warn('[SupabaseStorage] Upload failed:', e);
    return null;
  }
}

/**
 * Загружает локальный PDF в Supabase Storage.
 * Возвращает публичный URL или null при ошибке.
 */
async function uploadPdfToStorage(
  accessCode: string,
  projectId: string,
  localUri: string
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  if (localUri.startsWith('https://')) return localUri;
  if (!localUri.startsWith('file://') && !localUri.startsWith('/') && !localUri.startsWith('content://')) {
    return null;
  }

  const uri = localUri.startsWith('/') ? `file://${localUri}` : localUri;

  try {
    const fileInfo = await FileSystem.getInfoAsync(uri, { size: false });
    if (!fileInfo.exists) {
      return null;
    }

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (!base64) return null;
    await yieldToUI();

    const byteChars = atob(base64);
    const bytes = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i += BYTE_COPY_CHUNK) {
      const end = Math.min(i + BYTE_COPY_CHUNK, byteChars.length);
      for (let j = i; j < end; j++) {
        bytes[j] = byteChars.charCodeAt(j);
      }
      if (end < byteChars.length) await yieldToUI();
    }

    const path = `pdf/${accessCode}/${projectId}.pdf`;
    const { data, error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType: 'application/pdf',
      upsert: true,
    });

    if (error) {
      console.warn('[SupabaseStorage] PDF upload error:', error.message);
      return null;
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
    return urlData?.publicUrl ?? null;
  } catch (e) {
    console.warn('[SupabaseStorage] PDF upload failed:', e);
    return null;
  }
}

/** Уступка главному потоку — не блокировать UI при долгой загрузке */
function yieldToUI(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

const BYTE_COPY_CHUNK = 65536; // 64KB — копируем порциями, между ними уступаем потоку

/**
 * Преобразует все локальные URI изображений в данных в Storage URL.
 * Обрабатывает по одному ключу за раз с уступкой потоку, чтобы не мешать работе приложения.
 */
export async function uploadProjectImagesBeforeSync(
  accessCode: string,
  data: Record<string, string>
): Promise<Record<string, string>> {
  const result = { ...data };
  const keys = Object.keys(result).filter((k) => k.startsWith('@project_images_'));

  for (const key of keys) {
    try {
      const value = result[key];
      const uris: string[] = JSON.parse(value || '[]');
      if (!Array.isArray(uris)) continue;

      const projectId = key.replace('@project_images_', '');
      let changed = false;
      const newUris: string[] = [];

      for (let i = 0; i < uris.length; i++) {
        const uri = uris[i];
        if (typeof uri !== 'string') {
          newUris.push(uri);
          continue;
        }
        if (uri.startsWith('https://')) {
          newUris.push(uri);
          continue;
        }
        if (!uri.startsWith('file://') && !uri.startsWith('/') && !uri.startsWith('content://')) {
          newUris.push(uri);
          continue;
        }
        const url = await uploadImageToStorage(accessCode, projectId, uri, i);
        if (url) {
          changed = true;
          newUris.push(url);
        } else {
          newUris.push(uri);
        }
        await yieldToUI();
      }

      if (changed) {
        result[key] = JSON.stringify(newUris);
      }
    } catch (e) {
      console.warn('[SupabaseStorage] Failed to process', key, e);
    }
    await yieldToUI();
  }

  const pdfKeys = Object.keys(result).filter((k) => k.startsWith('@project_pdf_'));
  for (const key of pdfKeys) {
    try {
      const uri = result[key];
      if (typeof uri !== 'string' || !uri) continue;
      if (uri.startsWith('https://')) continue;
      if (!uri.startsWith('file://') && !uri.startsWith('/') && !uri.startsWith('content://')) {
        continue;
      }
      const projectId = key.replace('@project_pdf_', '');
      const url = await uploadPdfToStorage(accessCode, projectId, uri);
      if (url) {
        result[key] = url;
      }
    } catch (e) {
      console.warn('[SupabaseStorage] Failed to process PDF', key, e);
    }
    await yieldToUI();
  }

  if (result['@user_avatar']?.startsWith('file://')) {
    await yieldToUI();
    try {
      const url = await uploadImageToStorage(
        accessCode,
        'avatar',
        result['@user_avatar'],
        0
      );
      if (url) result['@user_avatar'] = url;
    } catch (e) {
      console.warn('[SupabaseStorage] Avatar upload failed:', e);
    }
  }

  return result;
}
