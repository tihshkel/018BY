/**
 * Динамический конфиг: Expo подмешивает `config` из app.json.
 * Важно: при `eas build` / линковке `config` иногда пустой — иначе теряется extra.eas.projectId.
 * @see https://docs.expo.dev/workflow/configuration/
 */
const appJson = require('./app.json');

const EAS_PROJECT_ID = 'cb0b872b-bcbb-450d-aee7-e2c3148df391';

module.exports = ({ config } = {}) => {
  const base = appJson.expo;
  const fromCli = config?.expo ?? {};

  return {
    expo: {
      ...base,
      ...fromCli,
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
        supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
        supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
      },
    },
  };
};
