import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { getSupabase } from '@/lib/supabase';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

export async function canUseNativeAppleSignIn(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  if (isExpoGo) return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function signInWithAppleNative(): Promise<{ success: boolean; error?: string }> {
  if (!(await canUseNativeAppleSignIn())) {
    return { success: false, error: 'APPLE_NATIVE_UNAVAILABLE' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'SUPABASE_NOT_CONFIGURED' };
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      return { success: false, error: 'APPLE_ID_TOKEN_MISSING' };
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });
    if (error) {
      return { success: false, error: error.message || 'APPLE_SUPABASE_FAILED' };
    }

    // Apple отдаёт имя только при первом входе — сохраняем в metadata.
    if (credential.fullName) {
      const nameParts = [
        credential.fullName.givenName,
        credential.fullName.middleName,
        credential.fullName.familyName,
      ].filter((part): part is string => Boolean(part?.trim()));
      if (nameParts.length > 0) {
        await supabase.auth.updateUser({
          data: {
            full_name: nameParts.join(' '),
            given_name: credential.fullName.givenName ?? undefined,
            family_name: credential.fullName.familyName ?? undefined,
            user_name: nameParts.join(' '),
          },
        });
      }
    }

    return { success: true };
  } catch (err) {
    const code =
      err && typeof err === 'object' && 'code' in err ? String((err as { code?: string }).code) : '';
    if (code === 'ERR_REQUEST_CANCELED' || code === 'ERR_CANCELED') {
      return { success: false, error: 'OAUTH_CANCELLED' };
    }
    const message = err instanceof Error ? err.message : String(err);
    if (__DEV__) console.warn('[apple-native-sign-in]', err);
    return { success: false, error: message || 'APPLE_SIGN_IN_FAILED' };
  }
}
