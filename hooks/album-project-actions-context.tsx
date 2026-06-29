import React, { createContext, useContext, type ReactNode } from 'react';

import type { PageValues } from '@/types/album-page-schema';

export type AlbumProjectActions = {
  commitFields: (instanceId: string, fields: Record<string, string>) => void;
  commitCaption: (instanceId: string, caption: string) => void;
  commitPhotoCaptions: (instanceId: string, photoCaptions: (string | null)[]) => void;
  commitPagePatch: (instanceId: string, updater: (prev: PageValues) => PageValues) => void;
  saveNow: (instanceId: string, values: PageValues) => Promise<PageValues>;
};

const AlbumProjectActionsContext = createContext<AlbumProjectActions | null>(null);

export function AlbumProjectActionsProvider({
  actions,
  children,
}: {
  actions: AlbumProjectActions;
  children: ReactNode;
}) {
  return (
    <AlbumProjectActionsContext.Provider value={actions}>
      {children}
    </AlbumProjectActionsContext.Provider>
  );
}

export function useAlbumProjectActions(): AlbumProjectActions {
  const ctx = useContext(AlbumProjectActionsContext);
  if (!ctx) {
    throw new Error('useAlbumProjectActions must be used within AlbumProjectActionsProvider');
  }
  return ctx;
}
