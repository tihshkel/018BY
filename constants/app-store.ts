export const IOS_APP_STORE_ID = '6761551531';

export const ANDROID_PACKAGE_NAME = 'com.tihshkel.app018by';

export function getIosAppStoreUrl(useDirectScheme = true): string {
  const https = `https://apps.apple.com/app/id${IOS_APP_STORE_ID}`;
  if (!useDirectScheme) return https;
  return `itms-apps://apps.apple.com/app/id${IOS_APP_STORE_ID}`;
}

export function getAndroidPlayStoreUrl(): string {
  return `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_NAME}`;
}
