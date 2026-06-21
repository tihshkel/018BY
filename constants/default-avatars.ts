import type { ImageSource } from 'expo-image';

export type DefaultAvatar = {
  id: string;
  source: ImageSource;
};

/** Префикс значения `@user_avatar` для встроенных аватаров. */
export const PRESET_AVATAR_PREFIX = 'preset:';

export const DEFAULT_AVATARS: DefaultAvatar[] = [
  { id: 'group-2', source: require('@/Icon/avatars/Group 2.jpg') },
  { id: 'group-3', source: require('@/Icon/avatars/Group 3.jpg') },
  { id: 'group-4', source: require('@/Icon/avatars/Group 4.jpg') },
  { id: 'group-5', source: require('@/Icon/avatars/Group 5.jpg') },
  { id: 'group-6', source: require('@/Icon/avatars/Group 6.jpg') },
  { id: 'group-7', source: require('@/Icon/avatars/Group 7.jpg') },
  { id: 'clipped-2', source: require('@/Icon/avatars/Clipped-2.jpg') },
];

const avatarById = new Map(DEFAULT_AVATARS.map((avatar) => [avatar.id, avatar]));

export function isPresetAvatarValue(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PRESET_AVATAR_PREFIX);
}

export function toPresetAvatarStorageValue(id: string): string {
  return `${PRESET_AVATAR_PREFIX}${id}`;
}

export function getPresetAvatarIdFromStorage(value: string): string | null {
  if (!isPresetAvatarValue(value)) return null;
  return value.slice(PRESET_AVATAR_PREFIX.length) || null;
}

export function getPresetAvatarById(id: string): DefaultAvatar | undefined {
  return avatarById.get(id);
}

export function getPresetAvatarFromStorage(value: string): DefaultAvatar | undefined {
  const id = getPresetAvatarIdFromStorage(value);
  return id ? avatarById.get(id) : undefined;
}

export function getRandomPresetAvatar(): DefaultAvatar {
  const index = Math.floor(Math.random() * DEFAULT_AVATARS.length);
  return DEFAULT_AVATARS[index] ?? DEFAULT_AVATARS[0];
}

export function resolveAvatarImageSource(
  stored: string | null | undefined
): ImageSource | null {
  if (!stored) return null;

  const preset = getPresetAvatarFromStorage(stored);
  if (preset) return preset.source;

  return { uri: stored };
}
