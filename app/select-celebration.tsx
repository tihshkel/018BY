import { router, type Href } from 'expo-router';
import { useEffect } from 'react';

/**
 * Legacy deep link: app018by://select-celebration
 * Redirects to «Мои истории» — категории и обложки выбираются там.
 */
export default function SelectCelebrationLegacyRedirect() {
  useEffect(() => {
    router.replace('/(tabs)/projects' as Href);
  }, []);

  return null;
}
