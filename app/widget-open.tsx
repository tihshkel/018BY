import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator } from 'react-native';

import { AppScreen } from '@/components/ui';
import { colors } from '@/constants/design-tokens';
import { loadUserProjects } from '@/utils/userProjects';
import { readWidgetProject, syncWidgetSnapshot } from '@/utils/widgetSnapshot';

/** Resolve widget links against current storage, even after a page/album was removed. */
export default function WidgetOpenScreen() {
  const { id, mode } = useLocalSearchParams<{ id?: string; mode?: string }>();

  useEffect(() => {
    let cancelled = false;
    const open = async () => {
      let href: Href = '/all-stories';
      try {
        const name = await AsyncStorage.getItem('@user_name');
        if (!name?.trim()) {
          href = '/';
        } else {
          const projects = await loadUserProjects();
          const project = projects.find((item) => item.id === id);
          if (project) {
            const current = await readWidgetProject(project);
            const item = current.project;
            const params = { id: item.id, celebration: item.celebration, coverType: item.coverType, interiorType: item.interiorType };
            href = mode === 'continue' && current.next?.instanceId
              ? { pathname: current.next.editorPath ?? '/album-page-form', params: { ...params, instanceId: current.next.instanceId } } as Href
              : { pathname: '/album-pages', params };
          } else if (projects.length === 0) {
            href = '/my-stories';
          }
        }
      } catch {
        href = '/';
      }
      if (!cancelled) {
        router.replace(href);
        void syncWidgetSnapshot();
      }
    };
    void open();
    return () => { cancelled = true; };
  }, [id, mode]);

  return <AppScreen style={{ alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></AppScreen>;
}
