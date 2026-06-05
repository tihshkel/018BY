import type { GiftItem } from '@/app/(tabs)/gifts';
import { getWildberriesProductImageUrl } from '@/utils/wildberriesProductImage';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useMemo, useState } from 'react';
import {
  View,
  type ImageStyle,
  type StyleProp,
} from 'react-native';

type CatalogGiftCoverImageProps = {
  item: GiftItem;
  style: StyleProp<ImageStyle>;
  imagePriority?: 'high' | 'normal';
};

/** То же фото, что на вкладке «Каталог»: сначала Wildberries, затем локальная обложка. */
export function CatalogGiftCoverImage({
  item,
  style,
  imagePriority = 'normal',
}: CatalogGiftCoverImageProps) {
  const wbUri = useMemo(() => getWildberriesProductImageUrl(item.link), [item.link]);
  const [wbFailed, setWbFailed] = useState(false);
  const useWb = Boolean(wbUri) && !wbFailed;

  if (useWb && wbUri) {
    return (
      <Image
        source={{ uri: wbUri }}
        style={style}
        contentFit="contain"
        priority={imagePriority}
        cachePolicy="disk"
        transition={120}
        accessibilityLabel={`Фото товара ${item.title} с Wildberries`}
        recyclingKey={`wb-${item.sku}`}
        onError={() => setWbFailed(true)}
      />
    );
  }

  if (item.cover) {
    return (
      <Image
        source={item.cover}
        style={style}
        contentFit="contain"
        priority={imagePriority}
        cachePolicy="disk"
        transition={0}
        fadeDuration={0}
        accessibilityLabel={`Обложка товара ${item.title}`}
        placeholderContentFit="contain"
      />
    );
  }

  return (
    <View style={[style, { alignItems: 'center', justifyContent: 'center' }]}>
      <Ionicons name="image-outline" size={40} color="#D4C4B5" />
    </View>
  );
}
