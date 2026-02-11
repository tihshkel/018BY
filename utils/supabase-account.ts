import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

const PROJECT_KEY_PREFIX = '@project_';

const DEFAULT_USER_NAME = 'Пользователь';

/**
 * Сохраняет код доступа, имя и (опционально) URL аватара в Supabase.
 * Не создаёт/не обновляет запись, если имя не задано или осталось по умолчанию «Пользователь» —
 * так в таблице не появляются строки с дефолтным именем.
 */
export async function saveAccountToSupabase(
  accessCode: string,
  userName: string,
  avatarUrl?: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: true };
  }

  const name = (userName || '').trim();
  if (!name || name === DEFAULT_USER_NAME) {
    return { success: true };
  }

  try {
    const row: Record<string, unknown> = {
      access_code: accessCode,
      user_name: name,
      updated_at: new Date().toISOString(),
    };
    // В БД пишем только валидный https-URL. file:// или пустое значение не передаём — тогда старый аватар в БД не затирается
    const isHttpsAvatar =
      typeof avatarUrl === 'string' &&
      avatarUrl.length > 0 &&
      avatarUrl.toLowerCase().startsWith('https://');
    if (isHttpsAvatar) {
      row.avatar_url = avatarUrl;
    }

    const { error } = await supabase.from('accounts').upsert(row, {
      onConflict: 'access_code',
    });

    if (error) {
      console.warn('[Supabase] Ошибка сохранения аккаунта:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e) {
    console.warn('[Supabase] Ошибка сохранения аккаунта:', e);
    return { success: false, error: String(e) };
  }
}

/**
 * Получает аккаунт по коду доступа из Supabase (имя и URL аватара).
 */
export async function getAccountFromSupabase(accessCode: string): Promise<{
  accessCode: string;
  userName: string;
  avatarUrl?: string | null;
} | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('access_code, user_name, avatar_url')
      .eq('access_code', accessCode)
      .single();

    if (error || !data) return null;

    return {
      accessCode: data.access_code,
      userName: data.user_name,
      avatarUrl: data.avatar_url ?? null,
    };
  } catch (e) {
    console.warn('[Supabase] Ошибка загрузки аккаунта:', e);
    return null;
  }
}

/**
 * Проверяет, существует ли аккаунт с таким кодом доступа в Supabase.
 */
export async function isAccountInSupabase(accessCode: string): Promise<boolean> {
  const account = await getAccountFromSupabase(accessCode);
  return account !== null;
}

export { isSupabaseConfigured };

/**
 * Сохраняет ядро данных в account_sync (всё, кроме данных по проектам).
 */
export async function pushCoreDataToSupabase(
  accessCode: string,
  coreData: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      success: false,
      error: 'Supabase не настроен. Добавьте EXPO_PUBLIC_SUPABASE_URL и EXPO_PUBLIC_SUPABASE_ANON_KEY в .env',
    };
  }

  try {
    const { error } = await supabase.from('account_sync').upsert(
      {
        access_code: accessCode,
        data_json: coreData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'access_code' }
    );

    if (error) {
      console.warn('[Supabase] Ошибка push core данных:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e) {
    console.warn('[Supabase] Ошибка push core данных:', e);
    return { success: false, error: String(e) };
  }
}

/**
 * Сохраняет данные одного проекта в account_project_data.
 */
export async function pushProjectDataToSupabase(
  accessCode: string,
  projectId: string,
  data: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase не настроен.' };
  }

  try {
    const { error } = await supabase.from('account_project_data').upsert(
      {
        access_code: accessCode,
        project_id: projectId,
        data_json: data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'access_code,project_id' }
    );

    if (error) {
      console.warn('[Supabase] Ошибка push проекта:', projectId, error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e) {
    console.warn('[Supabase] Ошибка push проекта:', e);
    return { success: false, error: String(e) };
  }
}

/**
 * Загружает ядро данных из account_sync.
 */
export async function getCoreDataFromSupabase(
  accessCode: string
): Promise<Record<string, string> | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('account_sync')
      .select('data_json')
      .eq('access_code', accessCode)
      .single();

    if (error || !data?.data_json) return null;

    const json = data.data_json as Record<string, unknown>;
    if (!json || typeof json !== 'object') return null;

    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(json)) {
      if (typeof k === 'string') {
        result[k] = v == null ? '' : String(v);
      }
    }
    return result;
  } catch (e) {
    console.warn('[Supabase] Ошибка загрузки core данных:', e);
    return null;
  }
}

/**
 * Загружает данные всех проектов для аккаунта из account_project_data.
 */
export async function getAllProjectsDataFromSupabase(
  accessCode: string
): Promise<Record<string, Record<string, string>>> {
  const supabase = getSupabase();
  if (!supabase) return {};

  try {
    const { data, error } = await supabase
      .from('account_project_data')
      .select('project_id, data_json')
      .eq('access_code', accessCode);

    if (error || !data) return {};

    const out: Record<string, Record<string, string>> = {};
    for (const row of data) {
      const json = (row.data_json ?? {}) as Record<string, unknown>;
      if (!json || typeof json !== 'object') continue;
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(json)) {
        if (typeof k === 'string') flat[k] = v == null ? '' : String(v);
      }
      out[row.project_id] = flat;
    }
    return out;
  } catch (e) {
    console.warn('[Supabase] Ошибка загрузки данных проектов:', e);
    return {};
  }
}

/**
 * Объединяет ядро и данные проектов в один объект для importAccountData.
 */
export function mergeCoreAndProjectsData(
  core: Record<string, string> | null,
  projects: Record<string, Record<string, string>>
): Record<string, string> {
  const result: Record<string, string> = core ? { ...core } : {};
  for (const [, projectData] of Object.entries(projects)) {
    for (const [k, v] of Object.entries(projectData)) {
      if (k && typeof v === 'string') result[k] = v;
    }
  }
  return result;
}

/**
 * Загружает все данные аккаунта из Supabase (ядро + все проекты).
 */
export async function getAccountDataFromSupabase(
  accessCode: string
): Promise<Record<string, string> | null> {
  const core = await getCoreDataFromSupabase(accessCode);
  const projects = await getAllProjectsDataFromSupabase(accessCode);
  return mergeCoreAndProjectsData(core, projects);
}

/**
 * Удаляет в облаке строки проектов, которых нет в списке (чтобы не копить лишние записи).
 */
export async function deleteProjectDataNotInList(
  accessCode: string,
  keepProjectIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: true };

  try {
    const { data: rows } = await supabase
      .from('account_project_data')
      .select('project_id')
      .eq('access_code', accessCode);

    if (!rows?.length) return { success: true };

    const keepSet = new Set(keepProjectIds);
    const toDelete = rows.map((r) => r.project_id).filter((id) => !keepSet.has(id));
    for (const projectId of toDelete) {
      await supabase
        .from('account_project_data')
        .delete()
        .eq('access_code', accessCode)
        .eq('project_id', projectId);
    }
    return { success: true };
  } catch (e) {
    console.warn('[Supabase] Ошибка удаления старых проектов:', e);
    return { success: false, error: String(e) };
  }
}
