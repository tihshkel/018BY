import { AppUpdateModal } from '@/components/app-update-modal';
import { useAppUpdates } from '@/hooks/use-app-updates';

export function AppUpdateBootstrap() {
  const {
    prompt,
    isApplyingOta,
    dismissPrompt,
    openStoreUpdate,
    applyOtaUpdate,
  } = useAppUpdates();

  return (
    <AppUpdateModal
      prompt={prompt}
      isApplyingOta={isApplyingOta}
      onDismiss={dismissPrompt}
      onOpenStore={openStoreUpdate}
      onApplyOta={applyOtaUpdate}
    />
  );
}
