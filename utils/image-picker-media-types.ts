import * as ImagePicker from 'expo-image-picker';

export function getImagePickerImagesMediaTypes() {
  // Используем новый API MediaType вместо устаревшего MediaTypeOptions
  if (ImagePicker.MediaType && ImagePicker.MediaType.Images) {
    return [ImagePicker.MediaType.Images];
  }
  
  // Если новый API недоступен, возвращаем undefined
  // expo-image-picker будет использовать значение по умолчанию
  return undefined;
}









