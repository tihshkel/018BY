import Constants from 'expo-constants';
import * as Network from 'expo-network';

/** Unknown native state is not evidence of being offline. */
export function isNetworkDisconnected(state: Network.NetworkState): boolean {
  return state.isConnected === false || state.isInternetReachable === false;
}

export async function checkInternetConnection(): Promise<boolean> {
  try {
    if (isNetworkDisconnected(await Network.getNetworkStateAsync())) return false;
  } catch {
    // The reachability request also works when native state is unavailable.
  }
  const url = Constants.expoConfig?.extra?.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key =
    Constants.expoConfig?.extra?.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) return true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    // Any HTTP response proves connectivity; a server error is not an offline device.
    await fetch(`${url}/auth/v1/health`, {
      headers: key ? { apikey: key } : undefined,
      signal: controller.signal,
      cache: 'no-store',
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
