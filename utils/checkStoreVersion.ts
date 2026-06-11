import { ANDROID_PACKAGE_NAME, IOS_APP_STORE_ID } from '@/constants/app-store';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { isAppVersionOlder } from '@/utils/compareAppVersions';

const STORE_LOOKUP_TIMEOUT_MS = 12_000;

type StoreVersionResult = {
  currentVersion: string;
  latestVersion: string;
};

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STORE_LOOKUP_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function getInstalledAppVersion(): string {
  return (
    Application.nativeApplicationVersion ??
    Constants.expoConfig?.version ??
    '0.0.0'
  );
}

async function fetchIosStoreVersion(): Promise<string | null> {
  const response = await fetchWithTimeout(
    `https://itunes.apple.com/lookup?id=${IOS_APP_STORE_ID}&country=ru`
  );

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    resultCount?: number;
    results?: Array<{ version?: string }>;
  };

  const version = payload.results?.[0]?.version?.trim();
  return version || null;
}

async function fetchAndroidStoreVersion(): Promise<string | null> {
  const response = await fetchWithTimeout(
    `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_NAME}&hl=ru`,
    {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      },
    }
  );

  if (!response.ok) return null;

  const html = await response.text();
  const patterns = [
    /\[\[\["([0-9]+(?:\.[0-9]+){1,3})"\]\],/,
    /itemprop="softwareVersion"[^>]*>([^<]+)</,
    /Current Version<\/span><span[^>]*><div[^>]*><span[^>]*>([^<]+)</,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const version = match?.[1]?.trim();
    if (version) return version;
  }

  return null;
}

export async function checkStoreVersionUpdate(): Promise<StoreVersionResult | null> {
  const currentVersion = getInstalledAppVersion();
  const latestVersion =
    Platform.OS === 'ios'
      ? await fetchIosStoreVersion()
      : Platform.OS === 'android'
        ? await fetchAndroidStoreVersion()
        : null;

  if (!latestVersion || !isAppVersionOlder(currentVersion, latestVersion)) {
    return null;
  }

  return {
    currentVersion,
    latestVersion,
  };
}
