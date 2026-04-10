/**
 * Динамический конфиг: Expo подмешивает сюда содержимое app.json в аргумент `config`.
 * @see https://docs.expo.dev/workflow/configuration/
 */
module.exports = ({ config }) => ({
  ...config,
  expo: {
    ...config.expo,
    extra: {
      ...(config.expo?.extra ?? {}),
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    },
  },
});
