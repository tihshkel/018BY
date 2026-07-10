export declare const META_MERGE_FIELDS: string[];

export declare function mergePageValuesMaps(
  ...maps: Record<string, { updatedAt?: string }>[]
): Record<string, { updatedAt?: string }>;

export declare function mergeProjectKeyFromCloud(
  key: string,
  localRaw: string | null,
  cloudRaw: string,
): string;

export declare function mergeProjectMeta(localRaw: string | null, cloudRaw: string): string;

export declare function mergeUserProjectEntry(
  cloudEntry: Record<string, unknown>,
  localEntry: Record<string, unknown>,
): Record<string, unknown>;

export declare function pickRicherJsonArray(localRaw: string | null, cloudRaw: string): string;

export declare function projectSnapshotRichness(data: Record<string, string>): number;

export declare function safeParseArray(raw: string | null): unknown[];

export declare function safeParseObject(raw: string | null): Record<string, unknown>;
