import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { getSupabase } from '@/lib/supabase';
import { setAccountSyncId } from '@/utils/account-identity';
import { getAccountFromSupabase, saveAccountToSupabase } from '@/utils/supabase-account';
import { ACCOUNT_SYNC_ID_KEY } from '@/utils/account-identity';

export type ReferralSource = 'physical_album' | 'instagram' | 'organic';

export type OAuthProvider = 'google' | 'apple';

const DEFAULT_USER_NAME = 'Пользователь';

WebBrowser.maybeCompleteAuthSession();

async function clearLocalDataForAccountSwitch(prevSyncId: string | null): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const toRemove: string[] = [];

    const hasAnyPrefix = (k: string, prefixes: string[]) => prefixes.some((p) => k.startsWith(p));
    const prefixes = [
      '@project_',
      '@project_images_',
      '@project_annotations_',
      '@project_cover_annotations_',
      '@project_pdf_',
      '@project_sections_',
      '@project_viewport_',
      '@project_cover_viewport_',
      '@project_last_text_style_',
      '@project_user_committed_',
      '@tutorial_shown_',
      '@export_history_',
      '@project_images_uploaded_',
    ];

    for (const k of keys) {
      if (!k) continue;
      if (k === '@user_projects') {
        toRemove.push(k);
        continue;
      }
      if (k === '@reminders' || k === '@pregnancy_info' || k === '@kids_info' || k === '@paper_albums') {
        toRemove.push(k);
        continue;
      }
      if (k === '@user_name' || k === '@user_avatar') {
        toRemove.push(k);
        continue;
      }
      if (k === '@projects_synced_to_cloud' || k === '@projects_synced_to_cloud_v2') {
        toRemove.push(k);
        continue;
      }
      if (k === '@access_code') {
        toRemove.push(k);
        continue;
      }
      if (prevSyncId && k === `@reminders_${prevSyncId}`) {
        toRemove.push(k);
        continue;
      }
      if (hasAnyPrefix(k, prefixes)) {
        toRemove.push(k);
      }
    }

    if (toRemove.length > 0) {
      await AsyncStorage.multiRemove(toRemove);
    }
  } catch (e) {
    if (__DEV__) console.warn('[auth-session] clearLocalDataForAccountSwitch:', e);
  }
}

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
    const prevSyncId = await AsyncStorage.getItem(ACCOUNT_SYNC_ID_KEY);
    const userId = data.session.user.id;
    if (prevSyncId && prevSyncId !== userId) {
      await clearLocalDataForAccountSwitch(prevSyncId);
    }
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

/** Redirect URL для OAuth (добавьте в Supabase → Authentication → URL configuration). */
export function getOAuthRedirectUrl(): string {
  return Linking.createURL('/');
}

async function completeOAuthFromRedirectUrl(url: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'SUPABASE_NOT_CONFIGURED' };
  }

  const { query, hash } = splitUrlQueryAndHash(url);
  const qParams = new URLSearchParams(query);
  const hParams = new URLSearchParams(hash);

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
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  const oauthError =
    qParams.get('error_description') ??
    hParams.get('error_description') ??
    qParams.get('error') ??
    hParams.get('error');
  if (oauthError) {
    return { success: false, error: oauthError };
  }

  return { success: false, error: 'OAUTH_CALLBACK_FAILED' };
}

export async function signInWithOAuthProvider(
  provider: OAuthProvider
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'SUPABASE_NOT_CONFIGURED' };
  }

  const redirectTo = getOAuthRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    return { success: false, error: error.message || 'OAUTH_START_FAILED' };
  }
  if (!data?.url) {
    return { success: false, error: 'OAUTH_URL_MISSING' };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { success: false, error: 'OAUTH_CANCELLED' };
  }
  if (result.type !== 'success' || !result.url) {
    return { success: false, error: 'OAUTH_FAILED' };
  }

  return completeOAuthFromRedirectUrl(result.url);
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

  const prevSyncId = await AsyncStorage.getItem(ACCOUNT_SYNC_ID_KEY);
  if (prevSyncId && prevSyncId !== userId) {
    await clearLocalDataForAccountSwitch(prevSyncId);
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

  const avatarFromProfile = account?.avatarUrl?.trim();
  if (avatarFromProfile) {
    await AsyncStorage.setItem('@user_avatar', avatarFromProfile);
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

/** Выход из аккаунта: сессия Supabase и локальные данные пользователя. */
export async function signOutFromAccount(): Promise<{ success: boolean; error?: string }> {
  try {
    const prevSyncId = await AsyncStorage.getItem(ACCOUNT_SYNC_ID_KEY);

    try {
      const supabase = getSupabase();
      await supabase?.auth.signOut();
    } catch (e) {
      if (__DEV__) console.warn('[auth-session] signOut:', e);
    }

    await clearLocalDataForAccountSwitch(prevSyncId);
    await AsyncStorage.removeItem(ACCOUNT_SYNC_ID_KEY);

    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'SIGNOUT_FAILED',
    };
  }
}

/**
 * Полный "сброс" локального состояния, чтобы заново пройти онбординг/логин.
 * Полезно для разработки (когда симулятор сохраняет сессию и флаги).
 */
export async function resetAppToOnboarding(): Promise<void> {
  // Пытаемся выйти из Supabase-сессии (если Supabase настроен)
  try {
    const supabase = getSupabase();
    await supabase?.auth.signOut();
  } catch (e) {
    if (__DEV__) console.warn('[auth-session] signOut during reset:', e);
  }

  // Чистим локальные ключи, влияющие на стартовый роут
  const keysToRemove = [
    '@has_seen_onboarding',
    '@user_name',
    '@user_avatar',
    ACCOUNT_SYNC_ID_KEY,
  ];

  await AsyncStorage.multiRemove(keysToRemove);
}
