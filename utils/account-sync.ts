import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { ensureDeviceRegistered, exportAccountData, getDevicesByAccessCode } from './account-transfer';
import {
  deleteProjectDataNotInList,
  getAccountDataFromSupabase,
  getAccountFromSupabase,
  getCoreDataFromSupabase,
  isAccountInSupabase,
  pushCoreDataToSupabase,
  pushProjectDataToSupabase,
} from './supabase-account';
import { uploadProjectImagesBeforeSync } from './supabase-storage';

const PROJECT_PREFIX = '@project_';

/** Ключ AsyncStorage для напоминаний конкретного профиля (по коду доступа). */
export function getRemindersStorageKey(accessCode: string): string {
  return `@reminders_${accessCode}`;
}

/**
 * Префиксы данных, которые синхронизируются между устройствами через Supabase.
 * Всё, что совпадает или начинается с одного из префиксов, попадает в облако.
 */
export const SYNC_DATA_PREFIXES = [
  '@user_name',
  '@user_projects',
  '@project_', // покрывает @project_*, @project_images_*, @project_annotations_*, @project_cover_annotations_*, @project_pdf_*, @project_viewport_*, @project_cover_viewport_*, @project_last_text_style_*
  '@reminders',
  '@pregnancy_info',
  '@kids_info',
  '@paper_albums',
  '@export_history_',
  '@user_avatar',
  '@access_code',
  '@has_seen_access_code',
  '@has_seen_onboarding',
];

/** Префиксы типа данных после @project_ (перед самим project_id в ключе) */
const PROJECT_KEY_SUBPREFIXES = [
  'images_',
  'annotations_',
  'cover_annotations_',
  'pdf_',
  'viewport_',
  'cover_viewport_',
  'last_text_style_',
];

/**
 * Извлекает полный project_id из ключа.
 * Например: @project_images_pregnancy_60 → pregnancy_60, @project_1769735093936 → 1769735093936.
 */
function getProjectIdFromKey(key: string): string {
  let rest = key.slice(PROJECT_PREFIX.length);
  for (const sub of PROJECT_KEY_SUBPREFIXES) {
    if (rest.startsWith(sub)) {
      rest = rest.slice(sub.length);
      break;
    }
  }
  return rest;
}

/**
 * Разбивает полный экспорт на ядро (без проектов) и данные по проектам.
 */
function splitCoreAndProjects(
  data: Record<string, string>
): { core: Record<string, string>; projects: Record<string, Record<string, string>> } {
  const core: Record<string, string> = {};
  const projects: Record<string, Record<string, string>> = {};
  for (const [k, v] of Object.entries(data)) {
    if (k.startsWith(PROJECT_PREFIX)) {
      const projectId = getProjectIdFromKey(k);
      if (!projects[projectId]) projects[projectId] = {};
      projects[projectId][k] = v;
    } else {
      core[k] = v;
    }
  }
  return { core, projects };
}

/**
 * Проверяет, существует ли код доступа (валидация)
 * Код считается валидным, если для него зарегистрировано хотя бы одно устройство
 * или если код был зарегистрирован в логах регистраций
 */
export async function validateAccessCode(accessCode: string): Promise<boolean> {
  if (!accessCode || accessCode.length !== 8) {
    return false;
  }

  try {
    const devices = await getDevicesByAccessCode(accessCode);
    if (devices.length > 0) {
      return true;
    }

    try {
      const { getRegistrationLogPath } = await import('./registration-logger');
      const logPath = getRegistrationLogPath();
      const fileInfo = await FileSystem.getInfoAsync(logPath);
      if (fileInfo.exists) {
        const logContent = await FileSystem.readAsStringAsync(logPath, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        if (logContent.includes(`Код доступа: ${accessCode}`)) {
          return true;
        }
      }
    } catch (logError) {
      console.warn('Could not check registration logs:', logError);
    }

    const inSupabase = await isAccountInSupabase(accessCode);
    if (inSupabase) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error validating access code:', error);
    return false;
  }
}

const LOGIN_VALIDATE_TIMEOUT_MS = 10000;

/**
 * Быстрый вход: только проверка кода и регистрация устройства, затем сразу можно переходить в приложение.
 * Загрузка имени, аватара и данных из облака выполняется в фоне.
 */
export async function loginAndEnterFast(accessCode: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const isValid = await Promise.race([
      validateAccessCode(accessCode),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), LOGIN_VALIDATE_TIMEOUT_MS)),
    ]);
    if (!isValid) {
      return { success: false, error: 'INVALID_CODE' };
    }

    const deviceResult = await ensureDeviceRegistered({
      accessCode,
      maxDevices: 4,
      validityMonths: 100 * 12,
    });

    if (!deviceResult.ok) {
      if (deviceResult.error === 'DEVICE_LIMIT') {
        return { success: false, error: 'DEVICE_LIMIT' };
      }
      return { success: false, error: 'DEVICE_REGISTRATION_FAILED' };
    }

    await AsyncStorage.setItem('@access_code', accessCode);
    await AsyncStorage.setItem('@is_activated', 'true');
    await AsyncStorage.setItem('@has_seen_access_code', 'true'); // вошли по коду — модалку «Ваш код доступа» не показываем
    await AsyncStorage.setItem('@show_access_code_modal', 'false');

    // Сразу подгружаем имя и аватар, чтобы на главной сразу отображалось «Привет, Влад!»
    try {
      const account = await Promise.race([
        getAccountFromSupabase(accessCode),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
      ]);
      if (account?.userName) {
        await AsyncStorage.setItem('@user_name', account.userName);
      }
      if (account?.avatarUrl) {
        await AsyncStorage.setItem('@user_avatar', account.avatarUrl);
      }
    } catch (_) {
      // не блокируем вход — имя подтянет фоновая синхронизация
    }

    syncAccountDataInBackground(accessCode).catch((e) =>
      console.warn('[AccountSync] Background sync after fast login failed:', e)
    );

    return { success: true };
  } catch (error) {
    console.error('Error during fast login:', error);
    return { success: false, error: 'SYNC_FAILED' };
  }
}

/**
 * Синхронизация данных аккаунта в фоне (имя, аватар, проекты, напоминания из Supabase).
 * Вызывается после быстрого входа, не блокирует переход в приложение.
 */
async function syncAccountDataInBackground(accessCode: string): Promise<void> {
  const account = await getAccountFromSupabase(accessCode);
  if (account?.userName) {
    await AsyncStorage.setItem('@user_name', account.userName);
  }
  if (account?.avatarUrl) {
    await AsyncStorage.setItem('@user_avatar', account.avatarUrl);
  }

  const remindersKey = getRemindersStorageKey(accessCode);
  const localReminders = await AsyncStorage.getItem(remindersKey);
  const localPregnancyInfo = await AsyncStorage.getItem('@pregnancy_info');

  const cloudData = await getAccountDataFromSupabase(accessCode);
  if (cloudData && Object.keys(cloudData).length > 0) {
    await importAccountData(cloudData, accessCode);
    const cloudReminders = cloudData['@reminders'];
    const mergedReminders = mergeReminders(localReminders, cloudReminders);
    await AsyncStorage.setItem(remindersKey, mergedReminders);
    const cloudPregnancy = cloudData['@pregnancy_info'];
    const hasLocalPregnancy =
      localPregnancyInfo &&
      localPregnancyInfo !== '{}' &&
      localPregnancyInfo !== 'null' &&
      localPregnancyInfo.length > 2;
    if (hasLocalPregnancy && (!cloudPregnancy || cloudPregnancy === '{}')) {
      await AsyncStorage.setItem('@pregnancy_info', localPregnancyInfo);
    }
  }

  const pushResult = await pushAccountDataToCloud();
  if (!pushResult.ok) {
    console.warn('[AccountSync] pushAccountDataToCloud after background sync failed:', pushResult.error);
  }
}

/**
 * Синхронизирует данные аккаунта при входе по коду доступа
 * Загружает все данные пользователя (имя, аватар, напоминания, проекты, альбомы) из Supabase.
 */
export async function syncAccountDataOnLogin(accessCode: string): Promise<{
  success: boolean;
  error?: string;
  syncedData?: Record<string, string>;
}> {
  try {
    const isValid = await validateAccessCode(accessCode);
    if (!isValid) {
      return { success: false, error: 'INVALID_CODE' };
    }

    const deviceResult = await ensureDeviceRegistered({
      accessCode,
      maxDevices: 4,
      validityMonths: 100 * 12,
    });

    if (!deviceResult.ok) {
      if (deviceResult.error === 'DEVICE_LIMIT') {
        return { success: false, error: 'DEVICE_LIMIT' };
      }
      return {
        success: false,
        error: 'DEVICE_REGISTRATION_FAILED',
      };
    }

    await AsyncStorage.setItem('@access_code', accessCode);
    await AsyncStorage.setItem('@is_activated', 'true');

    const account = await getAccountFromSupabase(accessCode);
    if (account?.userName) {
      await AsyncStorage.setItem('@user_name', account.userName);
    }
    if (account?.avatarUrl) {
      await AsyncStorage.setItem('@user_avatar', account.avatarUrl);
    }

    // Сохраняем локальные напоминания и ПДР текущего профиля до загрузки облака
    const remindersKey = getRemindersStorageKey(accessCode);
    const localReminders = await AsyncStorage.getItem(remindersKey);
    const localPregnancyInfo = await AsyncStorage.getItem('@pregnancy_info');

    const cloudData = await getAccountDataFromSupabase(accessCode);
    if (cloudData && Object.keys(cloudData).length > 0) {
      await importAccountData(cloudData, accessCode);
      // Напоминания уже объединены в importAccountData. Дополнительно сливаем с сохранённым локальным списком, чтобы ничего не потерять.
      const cloudReminders = cloudData['@reminders'];
      const mergedReminders = mergeReminders(localReminders, cloudReminders);
      await AsyncStorage.setItem(remindersKey, mergedReminders);
      // Если в облаке пустые ПДР, а локально есть — восстанавливаем
      const cloudPregnancy = cloudData['@pregnancy_info'];
      const hasLocalPregnancy =
        localPregnancyInfo &&
        localPregnancyInfo !== '{}' &&
        localPregnancyInfo !== 'null' &&
        localPregnancyInfo.length > 2;
      if (hasLocalPregnancy && (!cloudPregnancy || cloudPregnancy === '{}')) {
        await AsyncStorage.setItem('@pregnancy_info', localPregnancyInfo);
      }
    }

    // Всегда пушим текущее состояние в БД (напоминания, ПДР и т.д.) — и после мержа, и если облако было пусто
    const pushResult = await pushAccountDataToCloud();
    if (!pushResult.ok) {
      console.warn('[AccountSync] pushAccountDataToCloud after login failed:', pushResult.error);
    }

    const currentData = await exportAccountData({
      allowPrefixes: SYNC_DATA_PREFIXES,
    });

    return {
      success: true,
      syncedData: currentData,
    };
  } catch (error) {
    console.error('Error syncing account data:', error);
    return {
      success: false,
      error: 'SYNC_FAILED',
    };
  }
}

/**
 * Сохраняет данные аккаунта при синхронизации (импорт с облака).
 * Напоминания объединяются с локальными по id (не перезаписываются), чтобы не терять ни одного.
 */
export async function importAccountData(
  data: Record<string, string>,
  accessCode?: string
): Promise<void> {
  try {
    for (const [key, value] of Object.entries(data)) {
      if (!key || typeof value !== 'string') continue;
      if (key === '@reminders' && accessCode) {
        const remindersKey = getRemindersStorageKey(accessCode);
        const existing = await AsyncStorage.getItem(remindersKey);
        const merged = mergeReminders(value, existing);
        await AsyncStorage.setItem(remindersKey, merged);
      } else {
        await AsyncStorage.setItem(key, value);
      }
    }
  } catch (error) {
    console.error('Error importing account data:', error);
    throw error;
  }
}

/**
 * Получает все данные аккаунта для синхронизации.
 */
export async function getAccountDataForSync(): Promise<Record<string, string>> {
  return await exportAccountData({
    allowPrefixes: SYNC_DATA_PREFIXES,
  });
}

const SYNC_AFTER_MS = 2500;
let syncTimer: ReturnType<typeof setTimeout> | null = null;

export function syncToCloudNow(): void {
  pushAccountDataToCloud()
    .then((res) => {
      if (!res.ok) console.warn('[AccountSync] syncToCloudNow failed:', res.error);
    })
    .catch((e) => console.warn('[AccountSync] syncToCloudNow error:', e));
}

export function scheduleSyncToCloud(): void {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    pushAccountDataToCloud().catch((e) =>
      console.warn('[AccountSync] scheduled sync failed:', e)
    );
  }, SYNC_AFTER_MS);
}

function yieldToUI(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

export type PushToCloudResult = { ok: boolean; error?: string };

const SYNC_RETRY_ATTEMPTS = 3;
const SYNC_RETRY_DELAY_MS = 1500;

async function ensureAccessCodeAndName(): Promise<string> {
  let accessCode = await AsyncStorage.getItem('@access_code');
  if (!accessCode) {
    const { generateAccessCode } = await import('@/utils/accessCode');
    accessCode = generateAccessCode();
    await AsyncStorage.setItem('@access_code', accessCode);
  }
  const existingName = await AsyncStorage.getItem('@user_name');
  if (!existingName || !existingName.trim()) {
    await AsyncStorage.setItem('@user_name', 'Пользователь');
  }
  return accessCode;
}

async function markSyncOk(): Promise<void> {
  try {
    await AsyncStorage.setItem('@last_sync_error', '');
    await AsyncStorage.setItem('@last_sync_ok_at', new Date().toISOString());
  } catch {
    // игнорируем
  }
}

async function markSyncError(error: string): Promise<void> {
  try {
    await AsyncStorage.setItem('@last_sync_error', error);
  } catch {
    // игнорируем
  }
}

/**
 * Одна попытка отправки данных в облако (без повторов).
 * Если кода доступа нет — создаём его и имя по умолчанию, чтобы все данные всегда попадали в БД.
 */
async function pushAccountDataToCloudOnce(): Promise<PushToCloudResult> {
  const accessCode = await ensureAccessCodeAndName();

  const data = await exportAccountData({
    allowPrefixes: SYNC_DATA_PREFIXES,
  });
  const remindersKey = getRemindersStorageKey(accessCode);
  const localRemindersJson = await AsyncStorage.getItem(remindersKey);
  const cloudCore = await getCoreDataFromSupabase(accessCode);
  const cloudRemindersJson = cloudCore?.['@reminders'] ?? null;
  data['@reminders'] = mergeReminders(cloudRemindersJson, localRemindersJson ?? '[]');
  await yieldToUI();

  const { saveAccountToSupabase: saveAccount, isSupabaseConfigured } = await import(
    './supabase-account'
  );
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error:
        'Supabase не настроен. Добавьте EXPO_PUBLIC_SUPABASE_URL и EXPO_PUBLIC_SUPABASE_ANON_KEY в .env и перезапустите приложение.',
    };
  }

  const dataWithPhotos =
    Object.keys(data).length > 0
      ? await uploadProjectImagesBeforeSync(accessCode, data)
      : { ...data };
  await yieldToUI();
  await new Promise((r) => setTimeout(r, 50));

  const { core, projects } = splitCoreAndProjects(dataWithPhotos);
  const userName = (core['@user_name'] ?? data['@user_name'] ?? '').trim() || 'Пользователь';
  const avatarUrl = core['@user_avatar'] ?? data['@user_avatar'] ?? null;

  const res = await saveAccount(accessCode, userName, avatarUrl || undefined);
  if (!res.success) {
    return { ok: false, error: res.error ?? 'Ошибка сохранения аккаунта' };
  }
  await yieldToUI();

  const coreResult = await pushCoreDataToSupabase(accessCode, core);
  if (!coreResult.success) {
    return { ok: false, error: coreResult.error ?? 'Ошибка записи ядра в БД' };
  }
  await yieldToUI();

  const mergedRemindersJson = core['@reminders'];
  if (mergedRemindersJson) {
    await AsyncStorage.setItem(remindersKey, mergedRemindersJson);
  }

  for (const [projectId, projectData] of Object.entries(projects)) {
    if (Object.keys(projectData).length === 0) continue;
    const projResult = await pushProjectDataToSupabase(accessCode, projectId, projectData);
    if (!projResult.success) {
      console.warn('[AccountSync] Не удалось сохранить проект:', projectId, projResult.error);
      return { ok: false, error: projResult.error ?? `Ошибка записи проекта ${projectId}` };
    }
    await yieldToUI();
  }

  const hasUserProjectsKey = Object.prototype.hasOwnProperty.call(core, '@user_projects');
  if (hasUserProjectsKey) {
    const userProjectsRaw = core['@user_projects'] ?? '';
    let keepProjectIds: string[] = [];
    try {
      const list = userProjectsRaw ? JSON.parse(userProjectsRaw) : [];
      if (Array.isArray(list)) {
        keepProjectIds = list
          .map((p: { id?: string }) => p?.id)
          .filter((id): id is string => Boolean(id));
      }
    } catch {
      // игнорируем
    }
    await deleteProjectDataNotInList(accessCode, keepProjectIds);
  }

  return { ok: true };
}

/**
 * Быстро сохраняет в Supabase только ядро (имя, аватар, напоминания, ПДР, проекты-список)
 * без загрузки фото и без записи данных по каждому проекту.
 * Использовать при сохранении даты/напоминаний по кнопке «Сохранить», чтобы ответ был как у имени/фото.
 */
/**
 * Объединяет два списка напоминаний по id (второй аргумент имеет приоритет при совпадении id).
 * Все напоминания сохраняются, независимо от активности (enabled). Не фильтрует по количеству.
 */
export function mergeReminders(
  baseJson: string | null,
  priorityJson: string | null
): string {
  let base: Array<{ id?: string }> = [];
  let priority: Array<{ id?: string }> = [];
  try {
    base = baseJson ? JSON.parse(baseJson) : [];
    if (!Array.isArray(base)) base = [];
  } catch {
    base = [];
  }
  try {
    priority = priorityJson ? JSON.parse(priorityJson) : [];
    if (!Array.isArray(priority)) priority = [];
  } catch {
    priority = [];
  }
  const byId = new Map<string, unknown>();
  for (const r of base) {
    if (r && r.id != null) byId.set(String(r.id), r);
  }
  for (const r of priority) {
    if (r && r.id != null) byId.set(String(r.id), r);
  }
  return JSON.stringify(Array.from(byId.values()));
}

export async function pushCoreOnlyToCloud(): Promise<PushToCloudResult> {
  try {
    const accessCode = await ensureAccessCodeAndName();
    const data = await exportAccountData({
      allowPrefixes: SYNC_DATA_PREFIXES,
    });
    const remindersKey = getRemindersStorageKey(accessCode);
    const localRemindersJson = await AsyncStorage.getItem(remindersKey);
    const cloudCore = await getCoreDataFromSupabase(accessCode);
    const cloudRemindersJson = cloudCore?.['@reminders'] ?? null;
    data['@reminders'] = mergeReminders(cloudRemindersJson, localRemindersJson ?? '[]');
    const pregnancyJson = await AsyncStorage.getItem('@pregnancy_info');
    if (pregnancyJson) data['@pregnancy_info'] = pregnancyJson;
    const kidsJson = await AsyncStorage.getItem('@kids_info');
    if (kidsJson) data['@kids_info'] = kidsJson;

    const { saveAccountToSupabase: saveAccount, isSupabaseConfigured, pushCoreDataToSupabase } =
      await import('./supabase-account');
    if (!isSupabaseConfigured()) {
      return {
        ok: false,
        error:
          'Supabase не настроен. Добавьте EXPO_PUBLIC_SUPABASE_URL и EXPO_PUBLIC_SUPABASE_ANON_KEY в .env и перезапустите приложение.',
      };
    }

    const { core } = splitCoreAndProjects(data);
    const userName = (core['@user_name'] ?? '').trim() || 'Пользователь';
    const avatarUrl = core['@user_avatar'] ?? null;

    const res = await saveAccount(accessCode, userName, avatarUrl || undefined);
    if (!res.success) {
      return { ok: false, error: res.error ?? 'Ошибка сохранения аккаунта' };
    }

    const coreResult = await pushCoreDataToSupabase(accessCode, core);
    if (!coreResult.success) {
      return { ok: false, error: coreResult.error ?? 'Ошибка записи в облако' };
    }

    // Сохраняем объединённый список обратно в AsyncStorage, чтобы локально тоже были все напоминания
    const mergedJson = core['@reminders'];
    if (mergedJson) {
      await AsyncStorage.setItem(remindersKey, mergedJson);
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

export async function pushCoreKeysToCloud(keys: string[]): Promise<PushToCloudResult> {
  try {
    const accessCode = await ensureAccessCodeAndName();
    const { saveAccountToSupabase: saveAccount, isSupabaseConfigured } = await import(
      './supabase-account'
    );
    if (!isSupabaseConfigured()) {
      const msg =
        'Supabase не настроен. Добавьте EXPO_PUBLIC_SUPABASE_URL и EXPO_PUBLIC_SUPABASE_ANON_KEY в .env и перезапустите приложение.';
      await markSyncError(msg);
      return { ok: false, error: msg };
    }

    const userName = ((await AsyncStorage.getItem('@user_name')) ?? '').trim() || 'Пользователь';
    const avatarUrl = await AsyncStorage.getItem('@user_avatar');
    const res = await saveAccount(accessCode, userName, avatarUrl || undefined);
    if (!res.success) {
      const msg = res.error ?? 'Ошибка сохранения аккаунта';
      await markSyncError(msg);
      return { ok: false, error: msg };
    }

    const pairs = await AsyncStorage.multiGet(keys);
    const core: Record<string, string> = {};
    const remindersKey = getRemindersStorageKey(accessCode);
    for (const [k, v] of pairs) {
      if (!k) continue;
      if (k === '@reminders') {
        const reminderVal = await AsyncStorage.getItem(remindersKey);
        if (typeof reminderVal === 'string') core['@reminders'] = reminderVal;
      } else if (typeof v === 'string') {
        core[k] = v;
      }
    }

    const { pushCoreDataToSupabase } = await import('./supabase-account');
    const coreResult = await pushCoreDataToSupabase(accessCode, core);
    if (!coreResult.success) {
      const msg = coreResult.error ?? 'Ошибка записи ядра в БД';
      await markSyncError(msg);
      return { ok: false, error: msg };
    }

    await markSyncOk();
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await markSyncError(msg);
    return { ok: false, error: msg };
  }
}

/**
 * Отправляет все данные аккаунта в Supabase с повторами при сбое (сеть и т.д.).
 * - accounts: имя и URL аватара
 * - account_sync: ядро (напоминания, список проектов, беременность, история, флаги)
 * - account_project_data: по одной строке на каждый проект
 */
export async function pushAccountDataToCloud(): Promise<PushToCloudResult> {
  let lastError: string | undefined;
  for (let attempt = 1; attempt <= SYNC_RETRY_ATTEMPTS; attempt++) {
    try {
      const result = await pushAccountDataToCloudOnce();
      if (result.ok) {
        await markSyncOk();
        return result;
      }
      lastError = result.error;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
    if (attempt < SYNC_RETRY_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, SYNC_RETRY_DELAY_MS));
    }
  }
  const finalError = lastError ?? 'Синхронизация не удалась после нескольких попыток';
  await markSyncError(finalError);
  return { ok: false, error: finalError };
}
