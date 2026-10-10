import { getPostAuthRoute } from '@/utils/auth-onboarding';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform } from 'react-native';
import { AuthScreenLayout } from '@/components/auth/auth-screen-layout';
import { AuthErrorBanner } from '@/components/auth/auth-error-banner';
import { AppButton, AppText } from '@/components/ui';
import { colors } from '@/constants/design-tokens';
import {
  completeOAuthFromRedirectUrl,
  mapOAuthErrorMessage,
  restoreLocalAccountKeysFromSupabase,
} from '@/utils/auth-session';
import { ensureDefaultAvatar } from '@/utils/user-avatar';

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
  }>();
  const incomingUrl = Linking.useURL();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const finish = async () => {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(params))
        if (typeof value === 'string') query.set(key, value);
      const url =
        Platform.OS === 'web'
          ? window.location.href
          : incomingUrl?.includes('auth/callback')
            ? incomingUrl
            : `${Linking.createURL('auth/callback')}?${query}`;
      try {
        const result = await completeOAuthFromRedirectUrl(url);
        if (!result.success) {
          if (active) setError(mapOAuthErrorMessage(result.error));
          return;
        }
        const restored = await restoreLocalAccountKeysFromSupabase();
        if (!restored.success) {
          if (active)
            setError(
              'Не удалось загрузить профиль. Проверьте соединение и попробуйте войти ещё раз.',
            );
          return;
        }
        await ensureDefaultAvatar();
        const nextRoute = await getPostAuthRoute();
        if (active) router.replace(nextRoute as never);
      } catch {
        if (active) setError('Не удалось завершить вход. Проверьте интернет и попробуйте снова.');
      }
    };
    void finish();
    return () => {
      active = false;
    };
    // Router params can get a new object identity without a changed callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingUrl, params.code, params.error, params.error_description]);
  return (
    <AuthScreenLayout
      title={error ? 'Попробуем ещё раз' : 'Вы почти дома'}
      subtitle="Возвращаемся к вашим альбомам."
    >
      {error ? (
        <>
          <AuthErrorBanner message={error} />
          <AppButton title="Вернуться ко входу" onPress={() => router.replace('/login')} />
        </>
      ) : (
        <>
          <ActivityIndicator color={colors.primary} />
          <AppText style={{ textAlign: 'center' }}>Завершаем вход…</AppText>
        </>
      )}
    </AuthScreenLayout>
  );
}
