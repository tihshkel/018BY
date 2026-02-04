import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Сохраняет код доступа и имя пользователя в Supabase.
 * Вызывается при регистрации нового пользователя.
 */
export async function saveAccountToSupabase(
  accessCode: string,
  userName: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: true }; // Supabase не настроен — не ошибка
  }

  try {
    const { error } = await supabase.from('accounts').upsert(
      {
        access_code: accessCode,
        user_name: userName,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'access_code',
      }
    );

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
 * Получает аккаунт по коду доступа из Supabase.
 * Возвращает null, если Supabase не настроен или аккаунт не найден.
 */
export async function getAccountFromSupabase(accessCode: string): Promise<{
  accessCode: string;
  userName: string;
} | null> {
  const supabase = getSupabase();
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('access_code, user_name')
      .eq('access_code', accessCode)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      accessCode: data.access_code,
      userName: data.user_name,
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
 * Сохраняет все данные аккаунта в Supabase (проекты, напоминания, история и т.д.)
 */
export async function pushAccountDataToSupabase(
  accessCode: string,
  data: Record<string, string>
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
        data_json: data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'access_code' }
    );

    if (error) {
      console.warn('[Supabase] Ошибка push данных:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e) {
    console.warn('[Supabase] Ошибка push данных:', e);
    return { success: false, error: String(e) };
  }
}

/**
 * Загружает все данные аккаунта из Supabase
 */
export async function getAccountDataFromSupabase(
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
    console.warn('[Supabase] Ошибка загрузки данных:', e);
    return null;
  }
}
