import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import type { SupabaseClient, User } from '@supabase/supabase-js';

import { getSupabase } from '@/lib/supabase';
import { generateAccessCode } from '@/utils/accessCode';

export type ReferralSource = 'physical_album' | 'instagram' | 'organic';

/** Раньше использовался .local — часть валидаторов Supabase его режет; оставляем только для входа у старых аккаунтов. */
const LEGACY_AUTH_EMAIL_DOMAIN = 'users.018by.local';

function getAuthEmailDomain(): string {
  const fromExtra = (Constants.expoConfig?.extra as { authEmailDomain?: string } | undefined)?.authEmailDomain;
  return (
    (typeof fromExtra === 'string' && fromExtra.length > 0 ? fromExtra : null) ??
    process.env.EXPO_PUBLIC_AUTH_EMAIL_DOMAIN ??
    'users.018by.app'
  );
}

/** Логин: только латиница и цифры (без пробелов и спецсимволов). */
export function normalizeUsername(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  return trimmed.replace(/[^a-z0-9]+/g, '');
}

export type LoginUsernameCheckState = 'empty' | 'too_short' | 'available' | 'taken' | 'error';

/** Проверка занятости логина в public.accounts (по login_username). */
export async function checkLoginUsernameAvailable(raw: string): Promise<LoginUsernameCheckState> {
  const normalized = normalizeUsername(raw);
  if (!normalized) return 'empty';
  if (normalized.length < 3) return 'too_short';

  const supabase = getSupabase();
  if (!supabase) return 'error';

  const { data, error } = await supabase
    .from('accounts')
    .select('access_code')
    .eq('login_username', normalized)
    .maybeSingle();

  if (error) {
    console.warn('[auth-session] checkLoginUsername:', error.message);
    return 'error';
  }
  return data ? 'taken' : 'available';
}

function usernameToEmail(username: string, domain: string): string {
  return `${username}@${domain}`;
}

export function getReferralSourceLabel(value: ReferralSource): string {
  switch (value) {
    case 'physical_album':
      return 'Купил физический альбом';
    case 'instagram':
      return 'Из Instagram';
    case 'organic':
      return 'Случайно нашёл приложение';
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

export async function signInWithUsernamePassword(params: {
  username: string;
  password: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'SUPABASE_NOT_CONFIGURED' };
  }

  const username = normalizeUsername(params.username);
  if (username.length < 3) {
    return { success: false, error: 'USERNAME_INVALID' };
  }

  const primaryEmail = usernameToEmail(username, getAuthEmailDomain());
  const legacyEmail = usernameToEmail(username, LEGACY_AUTH_EMAIL_DOMAIN);

  const tryPwd = async (email: string) =>
    supabase.auth.signInWithPassword({ email, password: params.password });

  let lastMessage = '';
  const attempt = await tryPwd(primaryEmail);
  if (!attempt.error) {
    return { success: true };
  }
  lastMessage = attempt.error.message ?? '';

  const retryLegacy =
    legacyEmail !== primaryEmail &&
    lastMessage.toLowerCase().includes('invalid login credentials');

  if (retryLegacy) {
    const second = await tryPwd(legacyEmail);
    if (!second.error) {
      return { success: true };
    }
    lastMessage = second.error.message ?? lastMessage;
  }

  return { success: false, error: lastMessage };
}

function isAuthDuplicateMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('already registered') ||
    m.includes('already been registered') ||
    m.includes('user already exists') ||
    m.includes('email address is already') ||
    m.includes('duplicate') ||
    m.includes('unique violation')
  );
}

async function loadOrCreateAccountRow(
  supabase: SupabaseClient,
  userId: string,
  sessionUser: User
): Promise<{ access_code: string; user_name: string } | null> {
  const { data: existing } = await supabase
    .from('accounts')
    .select('access_code,user_name')
    .eq('auth_user_id', userId)
    .maybeSingle();

  if (existing?.access_code) {
    return { access_code: existing.access_code, user_name: existing.user_name ?? '' };
  }

  const meta = sessionUser.user_metadata as { login_username?: string; referral_source?: string } | undefined;
  const emailLocal = sessionUser.email?.split('@')[0]?.trim() || 'user';
  let loginUsername = meta?.login_username?.trim() || emailLocal;
  if (loginUsername.length < 3) {
    loginUsername = emailLocal.length >= 3 ? emailLocal : `user_${userId.slice(0, 8)}`;
  }
  const referral = meta?.referral_source ?? 'organic';

  const accessCode = generateAccessCode();

  const row = {
    access_code: accessCode,
    user_name: loginUsername,
    auth_user_id: userId,
    login_username: loginUsername,
    referral_source: referral,
    updated_at: new Date().toISOString(),
  };

  const { error: insErr } = await supabase.from('accounts').insert(row);

  if (!insErr) {
    return { access_code: accessCode, user_name: loginUsername };
  }

  const { data: raceRow } = await supabase
    .from('accounts')
    .select('access_code,user_name')
    .eq('auth_user_id', userId)
    .maybeSingle();
  if (raceRow?.access_code) {
    return { access_code: raceRow.access_code, user_name: raceRow.user_name ?? '' };
  }

  if (isAuthDuplicateMessage(insErr.message ?? '')) {
    const altLogin = `${loginUsername}_${userId.replace(/-/g, '').slice(0, 12)}`;
    const { error: ins2 } = await supabase.from('accounts').insert({
      ...row,
      login_username: altLogin,
    });
    if (!ins2) {
      return { access_code: accessCode, user_name: loginUsername };
    }
    const { data: race2 } = await supabase
      .from('accounts')
      .select('access_code,user_name')
      .eq('auth_user_id', userId)
      .maybeSingle();
    if (race2?.access_code) {
      return { access_code: race2.access_code, user_name: race2.user_name ?? '' };
    }
  }

  console.warn('[auth-session] accounts.insert:', insErr.message);
  return null;
}

function isAuthRateLimitedMessage(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes('rate limit') || m.includes('too many requests') || m.includes('email rate limit');
}

export async function signUpWithUsernamePassword(params: {
  username: string;
  password: string;
  referralSource: ReferralSource;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'SUPABASE_NOT_CONFIGURED' };
  }

  const username = normalizeUsername(params.username);
  if (username.length < 3) {
    return { success: false, error: 'USERNAME_INVALID' };
  }
  if (params.password.length < 6) {
    return { success: false, error: 'PASSWORD_TOO_SHORT' };
  }

  const email = usernameToEmail(username, getAuthEmailDomain());

  const signUpRes = await supabase.auth.signUp({
    email,
    password: params.password,
    options: {
      data: {
        login_username: username,
        referral_source: params.referralSource,
      },
    },
  });

  if (signUpRes.error) {
    const msg = signUpRes.error.message ?? '';
    if (isAuthRateLimitedMessage(msg)) {
      return { success: false, error: 'AUTH_RATE_LIMIT' };
    }
    if (isAuthDuplicateMessage(msg)) {
      return { success: false, error: 'LOGIN_TAKEN' };
    }
    return { success: false, error: msg || 'AUTH_SIGNUP_FAILED' };
  }

  const userId = signUpRes.data.user?.id ?? signUpRes.data.session?.user?.id;
  if (!userId) {
    return { success: false, error: 'SUPABASE_EMAIL_CONFIRM_REQUIRED' };
  }

  const accessCode = generateAccessCode();

  const { error: upsertError } = await supabase.from('accounts').upsert(
    {
      access_code: accessCode,
      user_name: username,
      auth_user_id: userId,
      login_username: username,
      referral_source: params.referralSource,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'access_code' }
  );

  if (upsertError) {
    await supabase.auth.signOut();
    const msg = upsertError.message ?? '';
    if (msg.includes('column') && msg.includes('does not exist')) {
      return {
        success: false,
        error:
          'DB_SCHEMA_OUTDATED: В Supabase выполните SQL из supabase/schema.sql (колонки auth_user_id, login_username, referral_source в accounts).',
      };
    }
    if (isAuthDuplicateMessage(msg)) {
      return { success: false, error: 'LOGIN_TAKEN' };
    }
    return { success: false, error: msg || 'ACCOUNTS_UPSERT_FAILED' };
  }

  await AsyncStorage.setItem('@access_code', accessCode);
  await AsyncStorage.setItem('@user_name', username);
  await AsyncStorage.setItem('@is_activated', 'true');

  return { success: true };
}

export async function restoreLocalAccountKeysFromSupabase(): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'SUPABASE_NOT_CONFIGURED' };
  }

  const sessionRes = await supabase.auth.getSession();
  const session = sessionRes.data.session;
  const userId = session?.user?.id;
  if (!userId || !session?.user) {
    return { success: false, error: 'NO_SESSION' };
  }

  const row = await loadOrCreateAccountRow(supabase, userId, session.user);
  if (!row) {
    return {
      success: false,
      error:
        'Не удалось создать или найти запись аккаунта в таблице accounts. Проверьте SQL-миграцию и RLS в Supabase.',
    };
  }

  await AsyncStorage.setItem('@access_code', row.access_code);
  await AsyncStorage.setItem('@user_name', row.user_name ?? '');
  await AsyncStorage.setItem('@is_activated', 'true');

  return { success: true };
}

export async function signOutEverywhere(): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    await supabase.auth.signOut();
  }
}
