import { isBenignNetworkError, reportNetworkFailure, reportNetworkSuccess } from '@/utils/networkReachability';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import 'react-native-url-polyfill/auto';

let supabaseClient: SupabaseClient | null = null;

function readSupabaseConfig(): { url: string; key: string } {
  const url = (Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
  const key = (Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  return { url, key };
}

function hasValidSupabaseConfig(url: string, key: string): boolean {
  if (!url || !key || key === 'your-publishable-key-here') {
    return false;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
}

/**
 * Возвращает клиент Supabase, если настроены URL и ключ.
 * Иначе возвращает null (приложение работает без облачной синхронизации).
 */
export function getSupabase(): SupabaseClient | null {
  const { url, key } = readSupabaseConfig();
  if (!hasValidSupabaseConfig(url, key)) {
    return null;
  }
  if (!supabaseClient) {
    supabaseClient = createClient(url, key, {
      auth: {
        storage: AsyncStorage,
        // Фоновый refresh каждые ~30 с без сети → AuthRetryableFetchError в консоли
        autoRefreshToken: false,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return supabaseClient;
}

/** Перед облачной синхронизацией: обновить сессию один раз, без фонового таймера. */
export async function prepareSupabaseAuthForSync(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.refresh_token) return true;

    const expiresAtMs = (session.expires_at ?? 0) * 1000;
    if (expiresAtMs - Date.now() > 120_000) {
      return true;
    }

    const { error } = await supabase.auth.refreshSession();
    if (error) {
      if (isBenignNetworkError(error)) reportNetworkFailure('cloud');
      return false;
    }
    reportNetworkSuccess('cloud');
    return true;
  } catch (error) {
    if (isBenignNetworkError(error)) reportNetworkFailure('cloud');
    return false;
  }
}

/**
 * Проверяет, настроен ли Supabase.
 */
export function isSupabaseConfigured(): boolean {
  const { url, key } = readSupabaseConfig();
  return hasValidSupabaseConfig(url, key);
}
