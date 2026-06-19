type AlbumProjectCreationParams = {
  celebration: string;
  coverType?: string;
  interiorType?: string;
  eventDate?: string;
};

let inflightCreation: {
  key: string;
  promise: Promise<string>;
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
export function runDedupedAlbumProjectCreation(
  params: AlbumProjectCreationParams,
  create: () => Promise<string>,
): Promise<string> {
  const key = buildCreationKey(params);
  if (inflightCreation?.key === key) {
    return inflightCreation.promise;
  }

  const promise = create().finally(() => {
    if (inflightCreation?.key === key) {
      inflightCreation = null;
    }
  });

  inflightCreation = { key, promise };
  return promise;
}
