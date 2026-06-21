import Constants from 'expo-constants';

export type GoogleAuthConfig = {
  webClientId: string;
  iosClientId: string;
};

function readExtraString(key: string): string {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const fromExtra = extra?.[key];
  return typeof fromExtra === 'string' ? fromExtra.trim() : '';
}

export function readGoogleAuthConfig(): GoogleAuthConfig {
  return {
    webClientId: (
      readExtraString('googleWebClientId') ||
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
      ''
    ).trim(),
    iosClientId: (
      readExtraString('googleIosClientId') ||
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
      ''
    ).trim(),
  };
}

export function isGoogleNativeSignInConfigured(): boolean {
  return readGoogleAuthConfig().webClientId.length > 0;
}

/** URL scheme для iOS из client ID вида `123-abc.apps.googleusercontent.com`. */
export function googleIosUrlSchemeFromClientId(iosClientId: string): string | null {
  const trimmed = iosClientId.trim();
  if (!trimmed.endsWith('.apps.googleusercontent.com')) {
    return null;
  }
  const prefix = trimmed.replace(/\.apps\.googleusercontent\.com$/, '');
  if (!prefix) return null;
  return `com.googleusercontent.apps.${prefix}`;
}
