import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/design-tokens';

/**
 * Legacy route — перенаправляет на form-based оглавление альбома.
 */
export default function EditAlbumRedirectScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    celebration?: string;
    coverType?: string;
    interiorType?: string;
    eventDate?: string;
  }>();

  useEffect(() => {
    router.replace({
      pathname: '/album-pages',
      params: {
        id: params.id,
        celebration: params.celebration,
        coverType: params.coverType,
        interiorType: params.interiorType,
        eventDate: params.eventDate,
      },
    } as unknown as Href);
  }, [params.id, params.celebration, params.coverType, params.interiorType, params.eventDate]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
