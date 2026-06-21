import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { getSupabase } from '@/lib/supabase';
import { isGoogleNativeSignInConfigured, readGoogleAuthConfig } from '@/utils/google-auth-config';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

let configured = false;

function ensureConfigured(): void {
  if (configured) return;
  const { webClientId, iosClientId } = readGoogleAuthConfig();
  GoogleSignin.configure({
    webClientId,
    ...(Platform.OS === 'ios' && iosClientId ? { iosClientId } : {}),
  });
  configured = true;
}

export function canUseNativeGoogleSignIn(): boolean {
  if (Platform.OS === 'web') return false;
  if (isExpoGo) return false;
  return isGoogleNativeSignInConfigured();
}

export async function signInWithGoogleNative(): Promise<{ success: boolean; error?: string }> {
  if (!canUseNativeGoogleSignIn()) {
    return { success: false, error: 'GOOGLE_NATIVE_UNAVAILABLE' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'SUPABASE_NOT_CONFIGURED' };
  }

  if (!isGoogleNativeSignInConfigured()) {
    return { success: false, error: 'GOOGLE_NOT_CONFIGURED' };
  }

  try {
    ensureConfigured();

    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    const result = await GoogleSignin.signIn();
    if (result.type === 'cancelled') {
      return { success: false, error: 'OAUTH_CANCELLED' };
    }

    let idToken = result.data.idToken;
    if (!idToken) {
      const tokens = await GoogleSignin.getTokens();
      idToken = tokens.idToken;
    }
    if (!idToken) {
      return { success: false, error: 'GOOGLE_ID_TOKEN_MISSING' };
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (error) {
      return { success: false, error: error.message || 'GOOGLE_SUPABASE_FAILED' };
    }

    return { success: true };
  } catch (err) {
    if (isErrorWithCode(err)) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        return { success: false, error: 'OAUTH_CANCELLED' };
      }
      if (err.code === statusCodes.IN_PROGRESS) {
        return { success: false, error: 'GOOGLE_IN_PROGRESS' };
      }
      if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return { success: false, error: 'GOOGLE_PLAY_SERVICES_NOT_AVAILABLE' };
      }
    }
    const message = err instanceof Error ? err.message : String(err);
    if (__DEV__) console.warn('[google-native-sign-in]', err);
    if (message.includes('DEVELOPER_ERROR')) {
      return { success: false, error: 'GOOGLE_DEVELOPER_ERROR' };
    }
    return { success: false, error: message || 'GOOGLE_SIGN_IN_FAILED' };
  }
}
