import * as ImagePicker from 'expo-image-picker';

import { getImagePickerImagesMediaTypes } from '@/utils/image-picker-media-types';

export async function pickPhotoFromLibrary(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: getImagePickerImagesMediaTypes(),
    allowsEditing: true,
    quality: 0.9,
  });

  if (result.canceled || !result.assets[0]?.uri) return null;
  return result.assets[0].uri;
}
