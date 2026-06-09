/**
 * Динамический конфиг: Expo подмешивает `config` из app.json.
 * Важно: при `eas build` / линковке `config` иногда пустой — иначе теряется extra.eas.projectId.
 * @see https://docs.expo.dev/workflow/configuration/
 */
const appJson = require('./app.json');

const EAS_PROJECT_ID = 'cb0b872b-bcbb-450d-aee7-e2c3148df391';

const DEFAULT_SUPABASE_URL = 'https://xbjssrfenkaefudhlgks.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_fZast52ijbl0oqRyFv0UnA__cabgPkZ';

module.exports = ({ config } = {}) => {
  const base = appJson.expo;
  const fromCli = config?.expo ?? {};

  return {
    expo: {
      ...base,
      ...fromCli,
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
      },
    },
  };
};
