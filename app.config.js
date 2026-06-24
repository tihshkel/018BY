/**
 * Динамический конфиг: Expo подмешивает `config` из app.json.
 * Важно: при `eas build` / линковке `config` иногда пустой — иначе теряется extra.eas.projectId.
 * @see https://docs.expo.dev/workflow/configuration/
 */
const appJson = require('./app.json');

const EAS_PROJECT_ID = 'cb0b872b-bcbb-450d-aee7-e2c3148df391';

const DEFAULT_SUPABASE_URL = 'https://xbjssrfenkaefudhlgks.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_fZast52ijbl0oqRyFv0UnA__cabgPkZ';

function googleIosUrlSchemeFromClientId(iosClientId) {
  const trimmed = (iosClientId || '').trim();
  if (!trimmed.endsWith('.apps.googleusercontent.com')) {
    return null;
  }
  const prefix = trimmed.replace(/\.apps\.googleusercontent\.com$/, '');
  return prefix ? `com.googleusercontent.apps.${prefix}` : null;
}

module.exports = ({ config } = {}) => {
  const base = appJson.expo;
  const fromCli = config?.expo ?? {};

  const googleWebClientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? base.extra?.googleWebClientId ?? '';
  const googleIosClientId =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? base.extra?.googleIosClientId ?? '';
  const googleIosUrlScheme = googleIosUrlSchemeFromClientId(googleIosClientId);

  const plugins = ['./plugins/with-ios-product-name.js', ...(base.plugins ?? []), ...(fromCli.plugins ?? [])];
  if (googleIosUrlScheme) {
    plugins.push([
      '@react-native-google-signin/google-signin',
      { iosUrlScheme: googleIosUrlScheme },
    ]);
  }

  return {
    expo: {
      ...base,
      ...fromCli,
      plugins,
      // `config` от Expo CLI может содержать `newArchEnabled: false` и перезаписать app.json —
      // тогда на EAS падает pod install (Reanimated 4: assert_new_architecture_enabled).
      newArchEnabled: base.newArchEnabled,
      extra: {
        ...(base.extra ?? {}),
        ...(fromCli.extra ?? {}),
        eas: {
          ...(base.extra?.eas ?? {}),
          ...(fromCli.extra?.eas ?? {}),
          projectId:
            fromCli.extra?.eas?.projectId ??
            base.extra?.eas?.projectId ??
            EAS_PROJECT_ID,
        },
        supabaseUrl:
          process.env.EXPO_PUBLIC_SUPABASE_URL ??
          base.extra?.supabaseUrl ??
          DEFAULT_SUPABASE_URL,
        supabaseAnonKey:
          process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
          base.extra?.supabaseAnonKey ??
          DEFAULT_SUPABASE_ANON_KEY,
        showLineSlotDebug:
          process.env.EXPO_PUBLIC_SHOW_LINE_SLOT_DEBUG ??
          base.extra?.showLineSlotDebug ??
          '0',
        googleWebClientId,
        googleIosClientId,
      },
    },
  };
};
