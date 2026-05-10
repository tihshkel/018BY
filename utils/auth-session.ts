import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { getSupabase } from '@/lib/supabase';
import { setAccountSyncId } from '@/utils/account-identity';
import { getAccountFromSupabase, saveAccountToSupabase } from '@/utils/supabase-account';

export type ReferralSource = 'physical_album' | 'instagram' | 'organic';

const DEFAULT_USER_NAME = 'Пользователь';

export function getReferralSourceLabel(s: ReferralSource): string {
  const labels: Record<ReferralSource, string> = {
    physical_album: 'Из фотоальбома / полиграфии',
    instagram: 'Из Instagram',
    organic: 'Другое / поиск / друзья',
  };
  return labels[s];
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Для совместимости с экраном входа: сейчас ожидается email. */
export function normalizeUsername(raw: string): string {
  return normalizeEmail(raw);
}

export function isValidEmail(raw: string): boolean {
  const e = normalizeEmail(raw);
  if (e.length < 5) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export async function signUpWithEmailPassword(params: {
  email: string;
  password: string;
  referralSource: ReferralSource;
}): Promise<{ success: boolean; error?: string }> {
  const email = normalizeEmail(params.email);
  if (!isValidEmail(email)) {
    return { success: false, error: 'EMAIL_INVALID' };
  }
  if (params.password.length < 6) {
    return { success: false, error: 'PASSWORD_TOO_SHORT' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'SUPABASE_NOT_CONFIGURED' };
  }

  // Поля совпадают с public.handle_new_user() (raw_user_meta_data) — триггер создаёт строку в profiles до клиентского upsert.
  const { data, error } = await supabase.auth.signUp({
    email,
    password: params.password,
    options: {
      data: {
        login_username: email,
        user_name: DEFAULT_USER_NAME,
        referral_source: params.referralSource,
      },
    },
  });

  if (error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('rate limit') || msg.includes('too many')) {
      return { success: false, error: 'AUTH_RATE_LIMIT' };
    }
    if (
      msg.includes('already registered') ||
      msg.includes('user already') ||
      msg.includes('already been registered')
    ) {
      return { success: false, error: 'EMAIL_TAKEN' };
    }
    return { success: false, error: error.message || 'SIGNUP_FAILED' };
  }

  if (!data.session) {
    return { success: false, error: 'SUPABASE_EMAIL_CONFIRM_REQUIRED' };
  }

  try {
    const userId = data.session.user.id;
    await setAccountSyncId(userId);

    const saveRes = await saveAccountToSupabase(userId, DEFAULT_USER_NAME, null, {
      loginUsername: email,
      referralSource: params.referralSource,
    });
    if (!saveRes.success) {
      return { success: false, error: saveRes.error ?? 'PROFILE_ROW_FAILED' };
    }

    await AsyncStorage.removeItem('@user_name');
    return { success: true };
  } catch (e) {
    console.warn('[auth-session] signUp follow-up:', e);
    return { success: false, error: e instanceof Error ? e.message : 'SIGNUP_SETUP_FAILED' };
  }
}

export async function signInWithEmailPassword(params: {
  email: string;
  password: string;
}): Promise<{ success: boolean; error?: string }> {
  const email = normalizeEmail(params.email);
  if (!isValidEmail(email)) {
    return { success: false, error: 'EMAIL_INVALID' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'SUPABASE_NOT_CONFIGURED' };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password: params.password });
  if (error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('rate limit') || msg.includes('too many')) {
      return { success: false, error: 'AUTH_RATE_LIMIT' };
    }
    return { success: false, error: error.message || 'SIGNIN_FAILED' };
  }

  return { success: true };
}

/** @deprecated Используйте signInWithEmailPassword; поле username = email. */
export async function signInWithUsernamePassword(params: {
  username: string;
  password: string;
}): Promise<{ success: boolean; error?: string }> {
  return signInWithEmailPassword({ email: params.username, password: params.password });
}

export async function restoreLocalAccountKeysFromSupabase(): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'SUPABASE_NOT_CONFIGURED' };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, error: 'NO_SESSION' };
  }

  const userId = session.user.id;
  if (!userId) {
    return { success: false, error: 'NO_USER_ID' };
  }

  await setAccountSyncId(userId);

  let account = await getAccountFromSupabase(userId);
  if (!account) {
    const email = session.user.email?.trim();
    const ensured = await saveAccountToSupabase(userId, DEFAULT_USER_NAME, null, {
      loginUsername: email || undefined,
    });
    if (!ensured.success) {
      return {
        success: false,
        error: ensured.error ?? 'Не удалось создать строку в profiles',
      };
    }
    account = await getAccountFromSupabase(userId);
  }
  const rawName = account?.userName?.trim() ?? '';
  const isPlaceholder = !rawName || rawName === DEFAULT_USER_NAME;
  if (!isPlaceholder) {
    await AsyncStorage.setItem('@user_name', rawName);
  } else {
    await AsyncStorage.removeItem('@user_name');
  }

  return { success: true };
}

/** URL для письма восстановления пароля (добавьте в Supabase → Authentication → URL configuration → Redirect URLs). */
export function getPasswordRecoveryRedirectUrl(): string {
  return Linking.createURL('/reset-password');
}

/** RPC из `subd`; при ошибке возвращает null — тогда письмо всё равно можно отправить. */
export async function isAuthEmailRegistered(email: string): Promise<boolean | null> {
  const e = normalizeEmail(email);
  if (!isValidEmail(e)) return null;
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('is_auth_email_registered', { check_email: e });
  if (error) {
    if (__DEV__) console.warn('[auth-session] is_auth_email_registered:', error.message);
    return null;
  }
  return data === true;
}

export async function requestPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
  const e = normalizeEmail(email);
  if (!isValidEmail(e)) {
    return { success: false, error: 'EMAIL_INVALID' };
  }
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'SUPABASE_NOT_CONFIGURED' };
  }

  const registered = await isAuthEmailRegistered(e);
  if (registered === false) {
    return { success: false, error: 'EMAIL_NOT_REGISTERED' };
  }

  const redirectTo = getPasswordRecoveryRedirectUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(e, { redirectTo });
  if (error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('rate limit')) {
      return { success: false, error: 'AUTH_RATE_LIMIT' };
    }
    return { success: false, error: error.message || 'RESET_EMAIL_FAILED' };
  }
  return { success: true };
}

function splitUrlQueryAndHash(url: string): { query: string; hash: string } {
  const hashIdx = url.indexOf('#');
  const hash = hashIdx >= 0 ? url.slice(hashIdx + 1) : '';
  const base = hashIdx >= 0 ? url.slice(0, hashIdx) : url;
  const qIdx = base.indexOf('?');
  const query = qIdx >= 0 ? base.slice(qIdx + 1) : '';
  return { query, hash };
}

export async function applyRecoverySessionFromUrl(url: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'SUPABASE_NOT_CONFIGURED' };
  }

  const { query, hash } = splitUrlQueryAndHash(url);
  const qParams = new URLSearchParams(query);
  const hParams = new URLSearchParams(hash);
  const type = hParams.get('type') ?? qParams.get('type');
  if (type && type !== 'recovery') {
    return { success: false, error: 'NOT_RECOVERY_LINK' };
  }

  const code = qParams.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  const access_token = hParams.get('access_token') ?? qParams.get('access_token');
  const refresh_token = hParams.get('refresh_token') ?? qParams.get('refresh_token');
  if (!access_token || !refresh_token) {
    return { success: false, error: 'NO_TOKENS_IN_URL' };
  }
  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function updatePasswordAfterRecovery(newPassword: string): Promise<{ success: boolean; error?: string }> {
  if (newPassword.length < 6) {
    return { success: false, error: 'PASSWORD_TOO_SHORT' };
  }
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'SUPABASE_NOT_CONFIGURED' };
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    return { success: false, error: error.message };
  }
  await supabase.auth.signOut();
  return { success: true };
}
