import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

const DEFAULT_USER_NAME = 'Пользователь';

/** UUID пользователя Supabase Auth — допустимый ключ для таблиц profiles / user_sync / user_project_data. */
export function isSupabaseUserIdKey(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
}

async function requireSupabaseAuthUserId(
  expectedUserId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase не настроен.' };
  try {
    const { data, error } = await supabase.auth.getUser();
    const authedId = data?.user?.id ?? '';
    if (error || !authedId) {
      return {
        ok: false,
        error:
          'Для сохранения в облако нужно войти в аккаунт (email и пароль). Откройте «Профиль» → войдите / зарегистрируйтесь.',
      };
    }
    if (authedId !== expectedUserId) {
      return {
        ok: false,
        error:
          'Аккаунт Supabase не совпадает с текущим профилем на устройстве. Выйдите и войдите заново тем же аккаунтом.',
      };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error:
        'Не удалось проверить вход в Supabase. Проверьте интернет и повторите попытку.',
    };
  }
}

export type SaveProfileOptions = {
  loginUsername?: string | null;
  referralSource?: string | null;
};

/**
 * Сохраняет профиль в `profiles` (id = пользователь Supabase Auth).
 */
export async function saveAccountToSupabase(
  userId: string,
  userName: string,
  avatarUrl?: string | null,
  options?: SaveProfileOptions
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: true };
  }

  if (!isSupabaseUserIdKey(userId)) {
    return { success: false, error: 'Некорректный идентификатор пользователя для облака' };
  }

  const authCheck = await requireSupabaseAuthUserId(userId);
  if (!authCheck.ok) {
    return { success: false, error: authCheck.error };
  }

  const name = (userName || '').trim();
  if (!name || name === DEFAULT_USER_NAME) {
    const existing = await getAccountFromSupabase(userId);
    if (existing?.userName && existing.userName.trim() && existing.userName.trim() !== DEFAULT_USER_NAME) {
      return { success: true };
    }
  }

  try {
    const row: Record<string, unknown> = {
      id: userId,
      user_name: name || DEFAULT_USER_NAME,
      updated_at: new Date().toISOString(),
    };

    const login = options?.loginUsername?.trim();
    if (login) {
      row.login_username = login;
    }

    const ref = options?.referralSource?.trim();
    if (ref) {
      row.referral_source = ref;
    }

    const isHttpsAvatar =
      typeof avatarUrl === 'string' &&
      avatarUrl.length > 0 &&
      avatarUrl.toLowerCase().startsWith('https://');
    if (isHttpsAvatar) {
      row.avatar_url = avatarUrl;
    }

    const { error } = await supabase.from('profiles').upsert(row, {
      onConflict: 'id',
    });

    if (error) {
      console.warn('[Supabase] Ошибка сохранения profiles:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e) {
    console.warn('[Supabase] Ошибка сохранения profiles:', e);
    return { success: false, error: String(e) };
  }
}

/**
 * Профиль из `profiles` по id пользователя (UUID Auth).
 * Поле `accessCode` в ответе = тот же userId (совместимость со старым кодом).
 */
export async function getAccountFromSupabase(userId: string): Promise<{
  accessCode: string;
  userName: string;
  avatarUrl?: string | null;
  loginUsername?: string | null;
  referralSource?: string | null;
} | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, user_name, avatar_url, login_username, referral_source')
      .eq('id', userId)
      .single();

    if (error || !data) return null;

    return {
      accessCode: data.id,
      userName: data.user_name,
      avatarUrl: data.avatar_url ?? null,
      loginUsername: data.login_username ?? null,
      referralSource: data.referral_source ?? null,
    };
  } catch (e) {
    console.warn('[Supabase] Ошибка загрузки profiles:', e);
    return null;
  }
}

export async function isAccountInSupabase(userId: string): Promise<boolean> {
  const account = await getAccountFromSupabase(userId);
  return account !== null;
}

export { isSupabaseConfigured };

export async function pushCoreDataToSupabase(
  userId: string,
  coreData: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      success: false,
      error: 'Supabase не настроен. Добавьте EXPO_PUBLIC_SUPABASE_URL и EXPO_PUBLIC_SUPABASE_ANON_KEY в .env',
    };
  }

  if (!isSupabaseUserIdKey(userId)) {
    return { success: false, error: 'Некорректный идентификатор пользователя' };
  }

  const authCheck = await requireSupabaseAuthUserId(userId);
  if (!authCheck.ok) {
    return { success: false, error: authCheck.error };
  }

  try {
    const { error } = await supabase.from('user_sync').upsert(
      {
        user_id: userId,
        data_json: coreData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      console.warn('[Supabase] Ошибка push user_sync:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e) {
    console.warn('[Supabase] Ошибка push user_sync:', e);
    return { success: false, error: String(e) };
  }
}

export async function pushProjectDataToSupabase(
  userId: string,
  projectId: string,
  data: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase не настроен.' };
  }

  if (!isSupabaseUserIdKey(userId)) {
    return { success: false, error: 'Некорректный идентификатор пользователя' };
  }

  const authCheck = await requireSupabaseAuthUserId(userId);
  if (!authCheck.ok) {
    return { success: false, error: authCheck.error };
  }

  try {
    const { error } = await supabase.from('user_project_data').upsert(
      {
        user_id: userId,
        project_id: projectId,
        data_json: data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,project_id' }
    );

    if (error) {
      console.warn('[Supabase] Ошибка push user_project_data:', projectId, error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e) {
    console.warn('[Supabase] Ошибка push проекта:', e);
    return { success: false, error: String(e) };
  }
}

export async function getCoreDataFromSupabase(userId: string): Promise<Record<string, string> | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  if (!isSupabaseUserIdKey(userId)) return null;

  try {
    const { data, error } = await supabase
      .from('user_sync')
      .select('data_json')
      .eq('user_id', userId)
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
    console.warn('[Supabase] Ошибка загрузки user_sync:', e);
    return null;
  }
}

export async function getAllProjectsDataFromSupabase(
  userId: string
): Promise<Record<string, Record<string, string>>> {
  const supabase = getSupabase();
  if (!supabase) return {};

  if (!isSupabaseUserIdKey(userId)) return {};

  try {
    const { data, error } = await supabase
      .from('user_project_data')
      .select('project_id, data_json')
      .eq('user_id', userId);

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
    console.warn('[Supabase] Ошибка загрузки user_project_data:', e);
    return {};
  }
}

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

export async function getAccountDataFromSupabase(userId: string): Promise<Record<string, string> | null> {
  const core = await getCoreDataFromSupabase(userId);
  const projects = await getAllProjectsDataFromSupabase(userId);
  return mergeCoreAndProjectsData(core, projects);
}

export async function deleteProjectDataNotInList(
  userId: string,
  keepProjectIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: true };

  if (!isSupabaseUserIdKey(userId)) return { success: true };

  try {
    const { data: rows } = await supabase
      .from('user_project_data')
      .select('project_id')
      .eq('user_id', userId);

    if (!rows?.length) return { success: true };

    const keepSet = new Set(keepProjectIds);
    const toDelete = rows.map((r) => r.project_id).filter((id) => !keepSet.has(id));
    for (const projectId of toDelete) {
      await supabase
        .from('user_project_data')
        .delete()
        .eq('user_id', userId)
        .eq('project_id', projectId);
    }
    return { success: true };
  } catch (e) {
    console.warn('[Supabase] Ошибка удаления старых проектов:', e);
    return { success: false, error: String(e) };
  }
}

export async function deleteProjectInSupabase(params: {
  accessCode: string;
  projectId: string;
  updatedUserProjectsJson: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: true };

  const userId = params.accessCode;
  const projectId = String(params.projectId);

  if (!isSupabaseUserIdKey(userId)) {
    return { success: false, error: 'Некорректный идентификатор пользователя' };
  }

  try {
    const core = (await getCoreDataFromSupabase(userId)) ?? {};
    core['@user_projects'] = params.updatedUserProjectsJson;
    const coreRes = await pushCoreDataToSupabase(userId, core);
    if (!coreRes.success) {
      return { success: false, error: coreRes.error ?? 'Не удалось обновить user_sync' };
    }

    const { error } = await supabase
      .from('user_project_data')
      .delete()
      .eq('user_id', userId)
      .eq('project_id', projectId);
    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
