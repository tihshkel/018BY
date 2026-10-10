import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase } from '@/lib/supabase';
import type { ReferralSource } from '@/utils/auth-session';

type PostAuthRoute = '/login' | '/referral-survey' | '/name-input' | '/(tabs)';
const completionKey = (userId: string) => `@referral_survey_completed:${userId}`;
const sources = new Set<ReferralSource>(['instagram', 'physical_album', 'organic']);

/** Run after restoring this account's local profile, including OAuth callbacks. */
export async function getPostAuthRoute(): Promise<PostAuthRoute> {
  const supabase = getSupabase();
  if (!supabase) return '/login';
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const user = data.session?.user;
  if (!user) return '/login';
  const name = await AsyncStorage.getItem('@user_name');
  if (name?.trim() && name.trim() !== 'Пользователь') return '/(tabs)';
  const metadata = user.user_metadata ?? {};
  if (metadata.referral_survey_completed === true || sources.has(metadata.referral_source)) return '/name-input';
  if (await AsyncStorage.getItem(completionKey(user.id)) === 'true') return '/name-input';
  return '/referral-survey';
}

/** This optional survey updates only referral_source, never the user's name/avatar. */
export async function completeReferralSurvey(source?: ReferralSource): Promise<void> {
  if (source !== undefined && !sources.has(source)) throw new Error('INVALID_REFERRAL_SOURCE');
  const supabase = getSupabase();
  if (!supabase) throw new Error('NO_SESSION');
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const user = data.session?.user;
  if (!user) throw new Error('NO_SESSION');
  if (source) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    try {
      const result = await supabase.from('profiles')
        .update({ referral_source: source, updated_at: new Date().toISOString() })
        .eq('id', user.id).select('id').abortSignal(controller.signal).maybeSingle();
      if (result.error || !result.data) throw new Error('REFERRAL_SAVE_FAILED');
    } finally { clearTimeout(timer); }
  }
  const current = await supabase.auth.getSession();
  if (current.error || current.data.session?.user.id !== user.id) throw new Error('ACCOUNT_CHANGED');
  // Skip is immediate and independent of a network write. The marker belongs
  // to this authenticated account, so the next registered user sees the survey.
  await AsyncStorage.setItem(completionKey(user.id), 'true').catch(() => {});
  const beforeMetadata = await supabase.auth.getSession();
  if (beforeMetadata.error || beforeMetadata.data.session?.user.id !== user.id) throw new Error('ACCOUNT_CHANGED');
  void supabase.auth.updateUser({ data: {
    referral_survey_completed: true,
    ...(source ? { referral_source: source } : {}),
  } }).catch(() => {});
}
