import { getImagePickerImagesMediaTypes } from '@/utils/image-picker-media-types';
import * as ImagePicker from 'expo-image-picker';
import { InteractionManager, Keyboard, Platform } from 'react-native';

type LaunchPhotoLibraryOptions = Omit<ImagePicker.ImagePickerOptions, 'mediaTypes'> & {
  mediaTypes?: ImagePicker.MediaType | ImagePicker.MediaType[];
};

/**
 * Открывает системную галерею. Перед показом снимает фокус с TextInput и ждёт закрытия RN Modal —
 * иначе на iOS PHPicker открывается, но тапы по фото не срабатывают.
 */
export async function launchPhotoLibrary(
  options: LaunchPhotoLibraryOptions = {}
): Promise<ImagePicker.ImagePickerResult> {
  Keyboard.dismiss();

  await new Promise<void>((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      // Даём RN Modal (разрешения, диалоги) время полностью размонтироваться
      setTimeout(resolve, Platform.OS === 'ios' ? 400 : 50);
    });
  });

  return ImagePicker.launchImageLibraryAsync({
    mediaTypes: options.mediaTypes ?? getImagePickerImagesMediaTypes(),
    allowsEditing: false,
    quality: 1,
    selectionLimit: 1,
    ...(Platform.OS === 'ios'
      ? { presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN }
      : {}),
    ...options,
  });
}
