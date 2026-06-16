import { getSupabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';

const BUCKET = 'account-images';

const MAX_UPLOAD_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

function isRetryableError(message: string): boolean {
  const m = (message || '').toLowerCase();
  return (
    m.includes('502') ||
    m.includes('503') ||
    m.includes('504') ||
    m.includes('network request failed') ||
    m.includes('fetch failed') ||
    m.includes('timeout')
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Загружает локальный файл изображения в Supabase Storage.
 * Возвращает публичный URL или null при ошибке.
 * При 502 / Network request failed выполняет до 3 повторных попыток с задержкой.
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
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= MAX_UPLOAD_RETRIES; attempt++) {
      try {
        const { data, error } = await supabase.storage
          .from(BUCKET)
          .upload(path, bytes, {
            contentType,
            upsert: true,
          });

        if (error) {
          lastError = error;
          if (attempt < MAX_UPLOAD_RETRIES && isRetryableError(error.message)) {
            await delay(RETRY_DELAY_MS * attempt);
            continue;
          }
          console.warn('[SupabaseStorage] Upload error:', error.message);
          return null;
        }

        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
        return urlData?.publicUrl ?? null;
      } catch (e) {
        lastError = e;
        const msg = e instanceof Error ? e.message : String(e);
        if (attempt < MAX_UPLOAD_RETRIES && isRetryableError(msg)) {
          await delay(RETRY_DELAY_MS * attempt);
          continue;
        }
        console.warn('[SupabaseStorage] Upload failed:', e);
        return null;
      }
    }
    if (lastError) console.warn('[SupabaseStorage] Upload failed after retries:', lastError);
    return null;
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
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= MAX_UPLOAD_RETRIES; attempt++) {
      try {
        const { data, error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
          contentType: 'application/pdf',
          upsert: true,
        });

        if (error) {
          lastError = error;
          if (attempt < MAX_UPLOAD_RETRIES && isRetryableError(error.message)) {
            await delay(RETRY_DELAY_MS * attempt);
            continue;
          }
          console.warn('[SupabaseStorage] PDF upload error:', error.message);
          return null;
        }

        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
        return urlData?.publicUrl ?? null;
      } catch (e) {
        lastError = e;
        const msg = e instanceof Error ? e.message : String(e);
        if (attempt < MAX_UPLOAD_RETRIES && isRetryableError(msg)) {
          await delay(RETRY_DELAY_MS * attempt);
          continue;
        }
        console.warn('[SupabaseStorage] PDF upload failed:', e);
        return null;
      }
    }
    if (lastError) console.warn('[SupabaseStorage] PDF upload failed after retries:', lastError);
    return null;
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

/** Индексы шаблонных страниц альбома обычно 0..N; пользовательские фото — с 10000. */
const ALBUM_USER_PHOTO_INDEX_BASE = 10000;

function isLocalMediaUri(uri: string): boolean {
  return (
    uri.startsWith('file://') || uri.startsWith('/') || uri.startsWith('content://')
  );
}

type UriResolver = {
  resolve: (uri: string) => Promise<{ uri: string; changed: boolean }>;
};

function createUriResolver(accessCode: string, projectId: string): UriResolver {
  const uriCache = new Map<string, string>();
  let nextIndex = ALBUM_USER_PHOTO_INDEX_BASE;

  return {
    async resolve(uri: string): Promise<{ uri: string; changed: boolean }> {
      if (!uri || typeof uri !== 'string') return { uri, changed: false };
      if (uri.startsWith('https://')) return { uri, changed: false };
      if (!isLocalMediaUri(uri)) return { uri, changed: false };

      const cached = uriCache.get(uri);
      if (cached) return { uri: cached, changed: true };

      const url = await uploadImageToStorage(accessCode, projectId, uri, nextIndex++);
      if (url) {
        uriCache.set(uri, url);
        return { uri: url, changed: true };
      }
      return { uri, changed: false };
    },
  };
}

async function processAnnotationsJson(
  value: string,
  resolver: UriResolver
): Promise<{ json: string; changed: boolean }> {
  let annotations: unknown;
  try {
    annotations = JSON.parse(value);
  } catch {
    return { json: value, changed: false };
  }
  if (!Array.isArray(annotations)) return { json: value, changed: false };

  let changed = false;
  const next = [];
  for (const ann of annotations) {
    if (ann?.type === 'image' && typeof ann?.imageUri === 'string') {
      const { uri, changed: slotChanged } = await resolver.resolve(ann.imageUri);
      if (slotChanged) {
        changed = true;
        next.push({ ...ann, imageUri: uri });
        continue;
      }
    }
    next.push(ann);
  }

  return { json: changed ? JSON.stringify(next) : value, changed };
}

async function processPageValuesJson(
  value: string,
  resolver: UriResolver
): Promise<{ json: string; changed: boolean }> {
  let map: Record<string, unknown>;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { json: value, changed: false };
    }
    map = parsed as Record<string, unknown>;
  } catch {
    return { json: value, changed: false };
  }

  let changed = false;
  const nextMap: Record<string, unknown> = { ...map };

  for (const instanceId of Object.keys(nextMap)) {
    const pv = nextMap[instanceId];
    if (!pv || typeof pv !== 'object' || Array.isArray(pv)) continue;
    const pageValues = pv as {
      photoBlocks?: Record<string, { slots?: (string | null)[] }>;
    };
    if (!pageValues.photoBlocks) continue;

    const blocks = { ...pageValues.photoBlocks };
    let instanceChanged = false;

    for (const blockId of Object.keys(blocks)) {
      const block = blocks[blockId];
      if (!block?.slots || !Array.isArray(block.slots)) continue;

      const newSlots: (string | null)[] = [...block.slots];
      let blockChanged = false;
      for (let i = 0; i < newSlots.length; i++) {
        const slot = newSlots[i];
        if (typeof slot !== 'string') continue;
        const { uri, changed: slotChanged } = await resolver.resolve(slot);
        if (slotChanged) {
          newSlots[i] = uri;
          blockChanged = true;
        }
      }
      if (blockChanged) {
        blocks[blockId] = { ...block, slots: newSlots };
        instanceChanged = true;
      }
    }

    if (instanceChanged) {
      nextMap[instanceId] = { ...pageValues, photoBlocks: blocks };
      changed = true;
    }
  }

  return { json: changed ? JSON.stringify(nextMap) : value, changed };
}

/**
 * Преобразует все локальные URI изображений в данных в Storage URL.
 * Обрабатывает по одному ключу за раз с уступкой потоку, чтобы не мешать работе приложения.
 */
export async function uploadProjectImagesBeforeSync(
  accessCode: string,
  data: Record<string, string>
): Promise<Record<string, string>> {
  const result = { ...data };
  const resolversByProject = new Map<string, UriResolver>();
  const getResolver = (projectId: string): UriResolver => {
    let resolver = resolversByProject.get(projectId);
    if (!resolver) {
      resolver = createUriResolver(accessCode, projectId);
      resolversByProject.set(projectId, resolver);
    }
    return resolver;
  };

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

  const annotationKeys = Object.keys(result).filter(
    (k) => k.startsWith('@project_annotations_') || k.startsWith('@project_cover_annotations_')
  );
  for (const key of annotationKeys) {
    try {
      const projectId = key.startsWith('@project_cover_annotations_')
        ? key.replace('@project_cover_annotations_', '')
        : key.replace('@project_annotations_', '');
      const { json, changed } = await processAnnotationsJson(
        result[key],
        getResolver(projectId)
      );
      if (changed) result[key] = json;
    } catch (e) {
      console.warn('[SupabaseStorage] Failed to process annotations', key, e);
    }
    await yieldToUI();
  }

  const pageValuesKeys = Object.keys(result).filter((k) =>
    k.startsWith('@project_page_values_')
  );
  for (const key of pageValuesKeys) {
    try {
      const projectId = key.replace('@project_page_values_', '');
      const { json, changed } = await processPageValuesJson(
        result[key],
        getResolver(projectId)
      );
      if (changed) result[key] = json;
    } catch (e) {
      console.warn('[SupabaseStorage] Failed to process page values', key, e);
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
