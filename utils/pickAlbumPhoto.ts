import * as ImagePicker from 'expo-image-picker';

import { launchPhotoLibrary } from '@/utils/launchPhotoLibrary';

type PickPhotoFromLibraryOptions = {
  ensurePermission?: () => Promise<boolean>;
  aspect?: [number, number];
};

export async function pickPhotoFromLibrary(
  options: PickPhotoFromLibraryOptions = {},
): Promise<string | null> {
  const { ensurePermission, aspect } = options;

  if (ensurePermission) {
    const granted = await ensurePermission();
    if (!granted) return null;
  } else {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return null;
  }

  const result = await launchPhotoLibrary({
    allowsEditing: true,
    quality: 0.9,
    ...(aspect ? { aspect } : {}),
  });

  if (result.canceled || !result.assets[0]?.uri) return null;
  return result.assets[0].uri;
}
