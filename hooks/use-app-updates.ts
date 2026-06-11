import { getAndroidPlayStoreUrl, getIosAppStoreUrl } from '@/constants/app-store';
import { checkStoreVersionUpdate } from '@/utils/checkStoreVersion';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as Updates from 'expo-updates';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';

const DISMISSED_STORE_VERSION_KEY = '@dismissed_store_update_version';
const LAST_STORE_CHECK_AT_KEY = '@last_store_version_check_at';
const STORE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

export type AppUpdatePrompt =
  | {
      kind: 'store';
      latestVersion: string;
      currentVersion: string;
    }
  | {
      kind: 'ota';
    };

const isExpoGo = Constants.executionEnvironment === 'storeClient';

function canCheckUpdates(): boolean {
  return !isExpoGo && !__DEV__;
}

export function useAppUpdates() {
  const [prompt, setPrompt] = useState<AppUpdatePrompt | null>(null);
  const [isApplyingOta, setIsApplyingOta] = useState(false);
  const isCheckingRef = useRef(false);
  const { isUpdateAvailable, isUpdatePending } = Updates.useUpdates();

  const dismissPrompt = useCallback(async () => {
    if (prompt?.kind === 'store') {
      await AsyncStorage.setItem(DISMISSED_STORE_VERSION_KEY, prompt.latestVersion).catch(
        () => {}
      );
    }
    setPrompt(null);
  }, [prompt]);

  const openStoreUpdate = useCallback(async () => {
    try {
      if (Platform.OS === 'ios') {
        const directUrl = getIosAppStoreUrl(true);
        const httpsUrl = getIosAppStoreUrl(false);
        const canOpenDirect = await Linking.canOpenURL(directUrl);
        await Linking.openURL(canOpenDirect ? directUrl : httpsUrl);
      } else if (Platform.OS === 'android') {
        await Linking.openURL(getAndroidPlayStoreUrl());
      }
    } catch {
      if (Platform.OS === 'ios') {
        Linking.openURL(getIosAppStoreUrl(false)).catch(() => {});
      }
    } finally {
      setPrompt(null);
    }
  }, []);

  const applyOtaUpdate = useCallback(async () => {
    if (!Updates.isEnabled || isApplyingOta) return;

    setIsApplyingOta(true);
    try {
      if (isUpdatePending) {
        await Updates.reloadAsync();
        return;
      }

      const update = await Updates.checkForUpdateAsync();
      if (!update.isAvailable) {
        setPrompt(null);
        return;
      }

      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (error) {
      console.warn('[useAppUpdates] Failed to apply OTA update:', error);
    } finally {
      setIsApplyingOta(false);
    }
  }, [isApplyingOta, isUpdatePending]);

  const checkStoreUpdate = useCallback(async (force = false) => {
    if (!canCheckUpdates() || isCheckingRef.current) return;

    const now = Date.now();
    if (!force) {
      const lastCheckRaw = await AsyncStorage.getItem(LAST_STORE_CHECK_AT_KEY).catch(
        () => null
      );
      const lastCheckAt = lastCheckRaw ? Number.parseInt(lastCheckRaw, 10) : 0;
      if (Number.isFinite(lastCheckAt) && now - lastCheckAt < STORE_CHECK_INTERVAL_MS) {
        return;
      }
    }

    isCheckingRef.current = true;
    try {
      const result = await checkStoreVersionUpdate();
      await AsyncStorage.setItem(LAST_STORE_CHECK_AT_KEY, String(now)).catch(() => {});

      if (!result) return;

      const dismissedVersion = await AsyncStorage.getItem(DISMISSED_STORE_VERSION_KEY).catch(
        () => null
      );
      if (dismissedVersion === result.latestVersion) return;

      setPrompt({
        kind: 'store',
        latestVersion: result.latestVersion,
        currentVersion: result.currentVersion,
      });
    } catch (error) {
      console.warn('[useAppUpdates] Store version check failed:', error);
    } finally {
      isCheckingRef.current = false;
    }
  }, []);

  const checkOtaUpdate = useCallback(async () => {
    if (!canCheckUpdates() || !Updates.isEnabled) return;

    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        setPrompt((current) => (current?.kind === 'store' ? current : { kind: 'ota' }));
      }
    } catch (error) {
      console.warn('[useAppUpdates] OTA version check failed:', error);
    }
  }, []);

  useEffect(() => {
    if (!canCheckUpdates()) return;

    void checkStoreUpdate();
    void checkOtaUpdate();
  }, [checkOtaUpdate, checkStoreUpdate]);

  useEffect(() => {
    if (!canCheckUpdates() || !isUpdateAvailable) return;

    setPrompt((current) => (current?.kind === 'store' ? current : { kind: 'ota' }));
  }, [isUpdateAvailable]);

  useEffect(() => {
    if (!canCheckUpdates() || !isUpdatePending) return;
    setPrompt((current) => (current?.kind === 'store' ? current : { kind: 'ota' }));
  }, [isUpdatePending]);

  useEffect(() => {
    if (!canCheckUpdates()) return;

    const handleAppStateChange = (state: AppStateStatus) => {
      if (state !== 'active') return;
      void checkStoreUpdate();
      void checkOtaUpdate();
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [checkOtaUpdate, checkStoreUpdate]);

  return {
    prompt,
    isApplyingOta,
    dismissPrompt,
    openStoreUpdate,
    applyOtaUpdate,
    checkStoreUpdate,
  };
}
