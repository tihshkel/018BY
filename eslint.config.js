// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Node-скрипты: __dirname/Buffer не определены в RN-окружении ESLint
    ignores: ['dist/*', 'dist-export-test/**', 'scripts/**'],
  },
]);
