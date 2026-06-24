/**
 * iOS executable names must not start with a digit — lipo/dsymutil fail on "018BY".
 * Display name stays "018BY" via CFBundleDisplayName in Info.plist.
 * @see https://docs.expo.dev/config-plugins/mods/#ios-name
 */
const { withXcodeProject, IOSConfig } = require('expo/config-plugins');

const IOS_PRODUCT_NAME = 'App018BY';

function withIosProductName(config) {
  return withXcodeProject(config, (projectConfig) => {
    projectConfig.modResults = IOSConfig.Name.setProductName(
      { name: IOS_PRODUCT_NAME },
      projectConfig.modResults,
    );
    return projectConfig;
  });
}

module.exports = withIosProductName;
