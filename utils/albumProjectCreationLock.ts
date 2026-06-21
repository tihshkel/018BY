type AlbumProjectCreationParams = {
  celebration: string;
  coverType?: string;
  interiorType?: string;
  eventDate?: string;
};

let inflightCreation: {
  key: string;
  promise: Promise<unknown>;
} | null = null;

function buildCreationKey(params: AlbumProjectCreationParams): string {
  return [
    params.celebration,
    params.coverType ?? '',
    params.interiorType ?? '',
    params.eventDate ?? '',
  ].join('|');
}

/** Prevents duplicate AsyncStorage projects from parallel mounts (e.g. React Strict Mode). */
export function runDedupedAlbumProjectCreation<T>(
  params: AlbumProjectCreationParams,
  create: () => Promise<T>,
): Promise<T> {
  const key = buildCreationKey(params);
  if (inflightCreation?.key === key) {
    return inflightCreation.promise as Promise<T>;
  }

  const promise = create().finally(() => {
    if (inflightCreation?.key === key) {
      inflightCreation = null;
    }
  });

  inflightCreation = { key, promise };
  return promise;
}
