import { router, type Href } from 'expo-router';
import { useEffect } from 'react';

/**
 * Deep link target for widget taps: app018by://my-stories
 * Opens the «Мои истории» tab with category-specific album templates.
 */
export default function MyStoriesDeepLinkScreen() {
  useEffect(() => {
    router.replace('/(tabs)/projects' as Href);
  }, []);

  return null;
}
