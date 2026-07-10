/**
 * Делает русский основным языком iOS-бандла: системные меню полей ввода
 * (Вставить, Копировать, Выделить всё) следуют локализации приложения.
 */
const { withInfoPlist, withXcodeProject } = require('expo/config-plugins');

const SUPPORTED_LOCALES = ['ru', 'en'];

function withIosRussianLocalization(config) {
  config = withInfoPlist(config, (config) => {
    config.modResults.CFBundleDevelopmentRegion = 'ru';
    config.modResults.CFBundleLocalizations = SUPPORTED_LOCALES;
    return config;
  });

  config = withXcodeProject(config, (config) => {
    const project = config.modResults;
    project.project.developmentRegion = 'ru';

    const knownRegions = project.project.knownRegions ?? [];
    const nextRegions = ['ru', ...knownRegions.filter((region) => region !== 'ru')];
    project.project.knownRegions = nextRegions;

    return config;
  });

  return config;
}

module.exports = withIosRussianLocalization;
