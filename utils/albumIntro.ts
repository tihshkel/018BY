import AsyncStorage from '@react-native-async-storage/async-storage';

import { INTRO_SEEN_KEY_PREFIX } from '@/constants/album-sections';

export function getAlbumIntroSeenKey(projectId: string): string {
  return `${INTRO_SEEN_KEY_PREFIX}${projectId}`;
}

export async function hasSeenAlbumIntro(projectId: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(getAlbumIntroSeenKey(projectId));
  return raw === '1';
}

export async function markAlbumIntroSeen(projectId: string): Promise<void> {
  await AsyncStorage.setItem(getAlbumIntroSeenKey(projectId), '1');
}

export async function resolveAlbumEntryPath(
  projectId: string
): Promise<'album-intro' | 'album-pages'> {
  const seen = await hasSeenAlbumIntro(projectId);
  return seen ? 'album-pages' : 'album-intro';
}
