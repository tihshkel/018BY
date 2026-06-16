import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAccountSyncId } from './account-identity';
import { exportAccountData } from './account-transfer';
import {
  filterProjectsByDeleted,
  isProjectDeleted,
  loadDeletedProjectIds,
} from './deleted-project-ids';
import { getStoredPushToken } from './pushToken';
import {
  getAccountDataFromSupabase,
  getCoreDataFromSupabase,
  isSupabaseUserIdKey,
  pushCoreDataToSupabase,
  pushProjectDataToSupabase,
} from './supabase-account';
import { uploadProjectImagesBeforeSync } from './supabase-storage';

const PROJECT_PREFIX = '@project_';

/** Список id проектов, которые пользователь явно сохранил (кнопка «Сохранить»). В БД отправляются только они. */
const PROJECTS_SYNCED_TO_CLOUD_KEY = '@projects_synced_to_cloud';

/** Id проектов, которые сейчас пушатся — при pull не перезаписываем их локальные данные. */
const pendingPushProjectIdsRef: { current: Set<string> } = { current: new Set() };

/** Проекты, которые нужно синхронизировать в облако (явное сохранение или правки альбома). */
export async function getProjectsSyncedToCloud(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(PROJECTS_SYNCED_TO_CLOUD_KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter(Boolean).map(String) : [];
  } catch {
    return [];
  }
}

/** Добавить проект в список «сохранённых в облако» — только такие проекты попадают в БД при синхронизации. */
export async function addProjectToSyncedList(projectId: string): Promise<void> {
  if (!projectId) return;
  const raw = await AsyncStorage.getItem(PROJECTS_SYNCED_TO_CLOUD_KEY);
  let list: string[] = [];
  try {
    if (raw) list = JSON.parse(raw);
    if (!Array.isArray(list)) list = [];
  } catch {
    list = [];
  }
  const id = String(projectId);
  if (!list.includes(id)) {
    list.push(id);
    await AsyncStorage.setItem(PROJECTS_SYNCED_TO_CLOUD_KEY, JSON.stringify(list));
  }
}

/** Ключ AsyncStorage для напоминаний профиля (по внутреннему id синхронизации). */
export function getRemindersStorageKey(syncId: string): string {
  return `@reminders_${syncId}`;
}

/**
 * Записать JSON массива напоминаний в профильный ключ и в legacy `@reminders` одинаковым содержимым.
 * Иначе после удаления старый `@reminders` снова подмешивается при миграции / фокусе.
 */
export async function setLocalRemindersJsonForSyncId(syncId: string, remindersJson: string): Promise<void> {
  await AsyncStorage.setItem(getRemindersStorageKey(syncId), remindersJson);
  await AsyncStorage.setItem('@reminders', remindersJson);
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
  '@account_sync_id',
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
  'sections_',
  'page_instances_',
  'page_values_',
  'schema_version_',
  'form_migration_',
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

/** Заглушка для главного экрана (раньше — после входа по коду). */
export function setOnSyncComplete(_callback: (() => void) | null): void {}

/**
 * Сохраняет данные аккаунта при синхронизации (импорт с облака).
 * Напоминания из облака перезаписывают локальный список (полный снимок @reminders), иначе merge по id
 * никогда не удаляет записи и «удалённые» снова появляются после pull.
 * Если передан protectProjectIds — не перезаписываем ключи проектов с этими id (пуш в процессе).
 */
export async function importAccountData(
  data: Record<string, string>,
  accessCode?: string,
  protectProjectIds?: Set<string>
): Promise<void> {
  try {
    const deletedIds = await loadDeletedProjectIds();
    for (const [key, value] of Object.entries(data)) {
      if (!key || typeof value !== 'string') continue;
      if (key.startsWith(PROJECT_PREFIX)) {
        const projectId = getProjectIdFromKey(key);
        if (projectId && isProjectDeleted(projectId, deletedIds)) continue;
      }
      if (protectProjectIds?.size && key.startsWith(PROJECT_PREFIX)) {
        const projectId = getProjectIdFromKey(key);
        if (projectId && protectProjectIds.has(projectId)) continue;
      }
      if (key === '@reminders' && accessCode) {
        await setLocalRemindersJsonForSyncId(accessCode, value);
      } else if (key === '@user_projects') {
        const localRaw = await AsyncStorage.getItem('@user_projects');
        const localList: { id?: string }[] = (() => {
          if (!localRaw) return [];
          try {
            const p = JSON.parse(localRaw);
            return Array.isArray(p) ? p : [];
          } catch {
            return [];
          }
        })();
        const cloudList: { id?: string }[] = (() => {
          try {
            const p = JSON.parse(value);
            return Array.isArray(p) ? p : [];
          } catch {
            return [];
          }
        })();
        const byId = new Map<string, any>();
        for (const p of filterProjectsByDeleted(cloudList, deletedIds)) {
          const id = p?.id != null ? String(p.id) : '';
          if (id) byId.set(id, p);
        }
        for (const p of filterProjectsByDeleted(localList, deletedIds)) {
          const id = p?.id != null ? String(p.id) : '';
          if (id && !byId.has(id)) byId.set(id, p);
        }
        const merged = Array.from(byId.values());
        await AsyncStorage.setItem('@user_projects', JSON.stringify(merged));
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
let supabaseNotConfiguredAlertShown = false;

/** Ошибка «Supabase не настроен» (нет .env у разработчика) — не показывать длинный текст каждый раз */
export function isSupabaseNotConfiguredError(error: string | undefined): boolean {
  return !!error && (error.includes('Supabase не настроен') || error.includes('EXPO_PUBLIC_SUPABASE'));
}

/** Сообщение для алерта «облако не настроено» — показывать один раз за сессию, чтобы не спамить */
export function getSupabaseNotConfiguredAlertMessageOnce(): string | null {
  if (supabaseNotConfiguredAlertShown) return null;
  supabaseNotConfiguredAlertShown = true;
  return 'Облако не настроено. Данные сохраняются только на этом устройстве. Чтобы включить синхронизацию, скопируйте .env.example в .env и добавьте EXPO_PUBLIC_SUPABASE_URL и EXPO_PUBLIC_SUPABASE_ANON_KEY (см. docs/SUPABASE_SETUP.md).';
}

export function syncToCloudNow(): void {
  pushAccountDataToCloud()
    .then((res) => {
      if (!res.ok) console.warn('[AccountSync] syncToCloudNow failed:', res.error);
    })
    .catch((e) => console.warn('[AccountSync] syncToCloudNow error:', e));
}

export function scheduleSyncToCloud(): void {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    syncTimer = null;
    const { isSupabaseConfigured } = await import('./supabase-account');
    if (!isSupabaseConfigured()) return;
    pushAccountDataToCloud().catch((e) =>
      console.warn('[AccountSync] scheduled sync failed:', e)
    );
  }, SYNC_AFTER_MS);
}

/**
 * Вызывать при входе на главный экран: гарантирует строку в `profiles`,
 * чтобы при первом сохранении проекта данные ушли в `user_project_data`.
 */
export async function ensureSyncReady(): Promise<void> {
  try {
    const syncId = await getAccountSyncId();
    if (!syncId || !isSupabaseUserIdKey(syncId)) return;
    let userName = await AsyncStorage.getItem('@user_name');
    if (!userName || !userName.trim()) {
      userName = 'Пользователь';
      await AsyncStorage.setItem('@user_name', userName);
    }
    const { saveAccountToSupabase, isSupabaseConfigured } = await import('./supabase-account');
    const { ensureDefaultAvatar } = await import('./user-avatar');
    if (isSupabaseConfigured()) {
      await ensureDefaultAvatar();
      await saveAccountToSupabase(syncId, userName.trim(), null);
    }
  } catch (e) {
    console.warn('[AccountSync] ensureSyncReady:', e);
  }
}

function yieldToUI(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

export type PushToCloudResult = { ok: boolean; error?: string };

const SYNC_RETRY_ATTEMPTS = 5;
const SYNC_RETRY_DELAY_MS = 2500;

async function ensureSyncIdAndName(): Promise<string> {
  const syncId = await getAccountSyncId();
  if (!syncId || !isSupabaseUserIdKey(syncId)) return '';
  const existingName = await AsyncStorage.getItem('@user_name');
  if (!existingName || !existingName.trim()) {
    await AsyncStorage.setItem('@user_name', 'Пользователь');
  }
  return syncId;
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

function getProjectStorageKeys(projectId: string): string[] {
  return [
    `@project_${projectId}`,
    `@project_images_${projectId}`,
    `@project_annotations_${projectId}`,
    `@project_cover_annotations_${projectId}`,
    `@project_sections_${projectId}`,
    `@project_page_instances_${projectId}`,
    `@project_page_values_${projectId}`,
    `@project_schema_version_${projectId}`,
    `@project_form_migration_${projectId}`,
    `@project_pdf_${projectId}`,
    `@project_viewport_${projectId}`,
    `@project_cover_viewport_${projectId}`,
    `@project_last_text_style_${projectId}`,
  ];
}

async function persistUploadedProjectUrls(
  before: Record<string, string>,
  after: Record<string, string>
): Promise<void> {
  const projectDataPrefixes = [
    '@project_images_',
    '@project_annotations_',
    '@project_cover_annotations_',
    '@project_page_values_',
    '@project_pdf_',
  ];

  const changedPairs = Object.entries(after).filter(([key, value]) => {
    return projectDataPrefixes.some((prefix) => key.startsWith(prefix)) && before[key] !== value;
  });

  for (const [key, value] of changedPairs) {
    await AsyncStorage.setItem(key, value);
    await yieldToUI();
  }
}

/**
 * Одна попытка отправки данных в облако (без повторов).
 *
 * Логика:
 * - Если `projectIdsToSync` непусто — пушим ТОЛЬКО эти проекты (+ core данные).
 *   В `@user_projects` в облаке ДОБАВЛЯЕМ эти проекты (мерж), а не заменяем весь список.
 * - Если `projectIdsToSync` пусто — пушим ТОЛЬКО core (имя, напоминания, настройки).
 *   Проекты НЕ трогаем. Список `@user_projects` в облаке НЕ перезаписываем.
 *
 * `pushAccountDataToCloud` без forceInclude подставляет id из `@projects_synced_to_cloud`.
 */
type PushAccountDataOnceOptions = {
  /** Не мержить с облаком — иначе удалённые напоминания снова попадут в user_sync. */
  remindersAuthoritativeLocal?: boolean;
};

async function pushAccountDataToCloudOnce(
  projectIdsToSync: string[] = [],
  onceOptions?: PushAccountDataOnceOptions
): Promise<PushToCloudResult> {
  const remindersAuthoritativeLocal = onceOptions?.remindersAuthoritativeLocal === true;
  const accessCode = await ensureSyncIdAndName();
  if (!accessCode) {
    return { ok: false, error: 'NOT_ACTIVATED' };
  }
  await ensureSyncReady();

  const projectIds = new Set(projectIdsToSync.filter(Boolean));
  const syncingProjects = projectIds.size > 0;

  if (__DEV__) {
    console.log('[AccountSync] pushOnce: syncingProjects=', syncingProjects, 'ids=', [...projectIds]);
  }

  if (syncingProjects) {
    const { flushAlbumProjectPersist } = await import('./albumProjectPersist');
    for (const pid of projectIds) {
      await flushAlbumProjectPersist(pid);
    }
  }

  // --- Экспортируем все данные из AsyncStorage ---
  let data = await exportAccountData({ allowPrefixes: SYNC_DATA_PREFIXES });
  
  // Добавляем push token в данные для облака
  const pushToken = await getStoredPushToken();
  if (pushToken) {
    data['@push_token'] = pushToken;
  }
  
  const userProjectsRaw = await AsyncStorage.getItem('@user_projects');
  if (userProjectsRaw && (!data['@user_projects'] || data['@user_projects'] === '[]')) {
    data['@user_projects'] = userProjectsRaw;
  }

  // --- Если пушим проекты, гарантируем что их ключи в data ---
  if (syncingProjects) {
    for (const pid of projectIds) {
      const keysToLoad = getProjectStorageKeys(pid);
      const pairs = await AsyncStorage.multiGet(keysToLoad);
      for (const [k, v] of pairs) {
        if (k && typeof v === 'string') data[k] = v;
      }
    }
  }

  // --- Убираем ВСЕ ключи проектов, которые НЕ входят в projectIds ---
  for (const k of Object.keys(data)) {
    if (k.startsWith(PROJECT_PREFIX)) {
      if (!syncingProjects) {
        delete data[k]; // не пушим никакие проекты
      } else {
        const pid = getProjectIdFromKey(k);
        if (!projectIds.has(pid)) delete data[k];
      }
    }
  }

  // --- @user_projects: при пуше проекта мержим с облаком, при core-only — не трогаем ---
  if (!syncingProjects) {
    delete data['@user_projects'];
  }

  const remindersKey = getRemindersStorageKey(accessCode);
  const localRemindersJson = await AsyncStorage.getItem(remindersKey);
  const cloudCore = await getCoreDataFromSupabase(accessCode);
  const cloudRemindersJson = cloudCore?.['@reminders'] ?? null;
  data['@reminders'] = remindersAuthoritativeLocal
    ? (localRemindersJson ?? '[]')
    : mergeReminders(cloudRemindersJson, localRemindersJson ?? '[]');
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

  let dataWithPhotos: Record<string, string> = { ...data };
  if (syncingProjects && Object.keys(data).some((k) => k.startsWith(PROJECT_PREFIX))) {
    try {
      dataWithPhotos = await uploadProjectImagesBeforeSync(accessCode, data);
      await persistUploadedProjectUrls(data, dataWithPhotos);
    } catch (e) {
      console.warn('[AccountSync] Загрузка фото в Storage не удалась, сохраняем без неё:', e);
    }
  }
  await yieldToUI();

  const { core, projects } = splitCoreAndProjects(dataWithPhotos);

  // --- Если пушим проекты, мержим @user_projects с облаком ---
  if (syncingProjects) {
    // Получаем облачный список проектов
    const cloudUserProjects: { id?: string }[] = (() => {
      try {
        const raw = cloudCore?.['@user_projects'];
        if (raw) {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
        }
      } catch {}
      return [];
    })();

    // Получаем локальный список
    const localUserProjects: { id?: string }[] = (() => {
      try {
        const raw = userProjectsRaw;
        if (raw) {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
        }
      } catch {}
      return [];
    })();

    // Мержим: облако + локальные записи по пушимым проектам
    const byId = new Map<string, any>();
    for (const p of cloudUserProjects) {
      const pid = p?.id != null ? String(p.id) : '';
      if (pid) byId.set(pid, p);
    }
    for (const p of localUserProjects) {
      const pid = p?.id != null ? String(p.id) : '';
      if (pid && projectIds.has(pid)) byId.set(pid, p); // обновляем только пушимые
    }
    // Гарантируем что все пушимые id есть в списке
    for (const pid of projectIds) {
      if (!byId.has(pid)) byId.set(pid, { id: pid });
    }
    core['@user_projects'] = JSON.stringify(Array.from(byId.values()));
  }

  const userName = (core['@user_name'] ?? data['@user_name'] ?? '').trim() || 'Пользователь';
  const avatarUrl = core['@user_avatar'] ?? data['@user_avatar'] ?? null;

  const res = await saveAccount(accessCode, userName, avatarUrl || undefined);
  if (!res.success) {
    if (__DEV__) console.warn('[AccountSync] saveAccount failed:', res.error);
    return { ok: false, error: res.error ?? 'Ошибка сохранения аккаунта' };
  }
  await yieldToUI();

  const coreResult = await pushCoreDataToSupabase(accessCode, core);
  if (!coreResult.success) {
    if (__DEV__) console.warn('[AccountSync] pushCoreData failed:', coreResult.error);
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
    if (__DEV__) console.log('[AccountSync] Проект записан в БД:', projectId);
    await yieldToUI();
  }

  if (__DEV__) console.log('[AccountSync] Пуш успешен, проектов записано:', Object.keys(projects).length);
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

export type PushCoreOnlyOptions = {
  /** После удаления напоминаний: записать в БД ровно локальный список, без merge с облаком. */
  remindersAuthoritativeLocal?: boolean;
  /** После удаления проекта: записать в БД локальный @user_projects без merge с облаком. */
  userProjectsAuthoritativeLocal?: boolean;
};

export async function pushCoreOnlyToCloud(options?: PushCoreOnlyOptions): Promise<PushToCloudResult> {
  try {
    const accessCode = await ensureSyncIdAndName();
    if (!accessCode) {
      return { ok: false, error: 'NOT_ACTIVATED' };
    }
    const data = await exportAccountData({
      allowPrefixes: SYNC_DATA_PREFIXES,
    });
    const remindersKey = getRemindersStorageKey(accessCode);
    const localRemindersJson = await AsyncStorage.getItem(remindersKey);
    const cloudCore = await getCoreDataFromSupabase(accessCode);
    const cloudRemindersJson = cloudCore?.['@reminders'] ?? null;
    const authLocal = options?.remindersAuthoritativeLocal === true;
    data['@reminders'] = authLocal
      ? (localRemindersJson ?? '[]')
      : mergeReminders(cloudRemindersJson, localRemindersJson ?? '[]');

    if (options?.userProjectsAuthoritativeLocal === true) {
      const localProjectsRaw = await AsyncStorage.getItem('@user_projects');
      if (localProjectsRaw) {
        data['@user_projects'] = localProjectsRaw;
      }
    }

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

    // Сохраняем список напоминаний в профильный ключ и в `@reminders` одинаково (иначе legacy снова «оживляет» записи).
    const mergedJson = core['@reminders'];
    if (mergedJson && accessCode) {
      await setLocalRemindersJsonForSyncId(accessCode, mergedJson);
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

export async function pushCoreKeysToCloud(keys: string[]): Promise<PushToCloudResult> {
  try {
    const accessCode = await ensureSyncIdAndName();
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
 * Подтягивает последние данные из облака (Supabase) в локальное хранилище.
 * Полезно при открытии приложения / фокусе главного экрана — гарантирует,
 * что проекты, сохранённые на другом устройстве, появятся в списке.
 *
 * Возвращает `true`, если в AsyncStorage попали новые данные (нужно перезагрузить проекты).
 */
export async function pullLatestFromCloud(): Promise<boolean> {
  try {
    const accessCode = await getAccountSyncId();
    if (!accessCode || !isSupabaseUserIdKey(accessCode)) {
      if (__DEV__) console.log('[AccountSync] pullLatestFromCloud: no auth user id, skip');
      return false;
    }

    const { isSupabaseConfigured, getCoreDataFromSupabase, getAllProjectsDataFromSupabase, mergeCoreAndProjectsData } = await import(
      './supabase-account'
    );
    if (!isSupabaseConfigured()) {
      if (__DEV__) console.log('[AccountSync] pullLatestFromCloud: Supabase not configured, skip');
      return false;
    }

    if (__DEV__) console.log('[AccountSync] pullLatestFromCloud: fetching data for', accessCode);

    // Загружаем core и проекты раздельно для лучшей диагностики
    const [coreData, projectsData] = await Promise.all([
      Promise.race([
        getCoreDataFromSupabase(accessCode),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 15000)),
      ]),
      Promise.race([
        getAllProjectsDataFromSupabase(accessCode),
        new Promise<Record<string, Record<string, string>>>((resolve) => setTimeout(() => resolve({}), 15000)),
      ]),
    ]);

    if (__DEV__) {
      const coreKeys = coreData ? Object.keys(coreData).length : 0;
      const projectCount = Object.keys(projectsData).length;
      const cloudUserProjects = coreData?.['@user_projects'] ?? 'null';
      const cloudProjListLen = (() => {
        try { const p = JSON.parse(cloudUserProjects); return Array.isArray(p) ? p.length : 0; } catch { return 0; }
      })();
      console.log('[AccountSync] pullLatestFromCloud: coreKeys=', coreKeys, 'projects=', projectCount, 'cloudUserProjectsCount=', cloudProjListLen);
    }

    const cloudData = mergeCoreAndProjectsData(coreData, projectsData);

    if (!cloudData || Object.keys(cloudData).length === 0) {
      if (__DEV__) console.log('[AccountSync] pullLatestFromCloud: no cloud data, skip');
      return false;
    }

    // Если в ядре (user_sync) список @user_projects пустой, но в user_project_data есть проекты —
    // собираем список из метаданных проектов (ключ @project_<id> в data_json каждого проекта)
    const cloudUserProjectsRaw = cloudData['@user_projects'];
    const cloudUserProjectsList: any[] = (() => {
      try {
        const p = cloudUserProjectsRaw ? JSON.parse(cloudUserProjectsRaw) : [];
        return Array.isArray(p) ? p : [];
      } catch {
        return [];
      }
    })();

    if (cloudUserProjectsList.length === 0 && Object.keys(projectsData).length > 0) {
      const deletedIds = await loadDeletedProjectIds();
      const builtList: any[] = [];
      for (const projectId of Object.keys(projectsData)) {
        if (isProjectDeleted(projectId, deletedIds)) continue;
        const metaStr = projectsData[projectId][`@project_${projectId}`];
        if (metaStr) {
          try {
            const meta = JSON.parse(metaStr);
            if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
              builtList.push({ ...meta, id: meta.id || projectId });
            } else {
              builtList.push({ id: projectId, title: 'Проект', category: '', albumId: '', createdAt: new Date().toISOString(), isReadyMadeAlbum: true, hasPdfTemplate: true });
            }
          } catch {
            builtList.push({ id: projectId, title: 'Проект', category: '', albumId: '', createdAt: new Date().toISOString(), isReadyMadeAlbum: true, hasPdfTemplate: true });
          }
        } else {
          builtList.push({ id: projectId, title: 'Проект', category: '', albumId: '', createdAt: new Date().toISOString(), isReadyMadeAlbum: true, hasPdfTemplate: true });
        }
      }
      cloudData['@user_projects'] = JSON.stringify(builtList);
      if (__DEV__) console.log('[AccountSync] pullLatestFromCloud: built @user_projects from user_project_data, count=', builtList.length);
    }

    const deletedIds = await loadDeletedProjectIds();
    if (deletedIds.size > 0) {
      if (cloudData['@user_projects']) {
        try {
          const list = JSON.parse(cloudData['@user_projects']);
          if (Array.isArray(list)) {
            cloudData['@user_projects'] = JSON.stringify(filterProjectsByDeleted(list, deletedIds));
          }
        } catch {
          // ignore
        }
      }
      for (const deletedId of deletedIds) {
        delete projectsData[deletedId];
      }
      for (const key of Object.keys(cloudData)) {
        if (!key.startsWith(PROJECT_PREFIX)) continue;
        const pid = getProjectIdFromKey(key);
        if (isProjectDeleted(pid, deletedIds)) {
          delete cloudData[key];
        }
      }
    }

    // Сохраняем текущий список проектов до импорта
    const localListBefore = await AsyncStorage.getItem('@user_projects');

    const protect = new Set(pendingPushProjectIdsRef.current);
    await importAccountData(cloudData, accessCode, protect);

    // Проверяем, изменился ли список проектов
    const localListAfter = await AsyncStorage.getItem('@user_projects');
    const changed = localListAfter !== localListBefore;

    // Дополнительная проверка: если в облаке есть проекты а локально нет — считаем что данные изменились
    const localListParsed: any[] = (() => {
      try { return localListAfter ? JSON.parse(localListAfter) : []; } catch { return []; }
    })();
    const hadNoProjects = !localListBefore || localListBefore === '[]' || localListBefore === 'null';
    const hasProjectsNow = localListParsed.length > 0;
    const forceChanged = hadNoProjects && hasProjectsNow;

    if (__DEV__) {
      console.log('[AccountSync] pullLatestFromCloud: changed=', changed, 'forceChanged=', forceChanged, 'localProjectsNow=', localListParsed.length);
    }

    return changed || forceChanged;
  } catch (e) {
    if (__DEV__) {
      console.warn('[AccountSync] pullLatestFromCloud error:', e);
    }
    return false;
  }
}

export type PushToCloudOptions = {
  /** Эти id проектов всегда включаются в пуш (для кнопки «Сохранить»), даже если список synced ещё не обновился. */
  forceIncludeProjectIds?: string[];
  /** Удаление напоминаний / проекта: не подмешивать старый @reminders из облака. */
  remindersAuthoritativeLocal?: boolean;
};

/**
 * Отправляет все данные аккаунта в Supabase с повторами при сбое (сеть и т.д.).
 * - profiles: имя, email (login_username), аватар, источник
 * - user_sync: ядро (напоминания, список проектов, беременность, история, флаги)
 * - user_project_data: по одной строке на каждый проект
 */
export async function pushAccountDataToCloud(
  options?: PushToCloudOptions
): Promise<PushToCloudResult> {
  const forceInclude = options?.forceIncludeProjectIds?.filter(Boolean) ?? [];
  const projectIdsToSync =
    forceInclude.length > 0 ? forceInclude : await getProjectsSyncedToCloud();
  if (projectIdsToSync.length > 0) {
    projectIdsToSync.forEach((id) => pendingPushProjectIdsRef.current.add(id));
  }
  let lastError: string | undefined;
  try {
    for (let attempt = 1; attempt <= SYNC_RETRY_ATTEMPTS; attempt++) {
      try {
        const result = await pushAccountDataToCloudOnce(projectIdsToSync, {
          remindersAuthoritativeLocal: options?.remindersAuthoritativeLocal,
        });
        if (result.ok) {
          await Promise.all(forceInclude.map((id) => addProjectToSyncedList(id)));
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
  } finally {
    projectIdsToSync.forEach((id) => pendingPushProjectIdsRef.current.delete(id));
  }
}
