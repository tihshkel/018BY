export type RouteParamValue = string | string[] | undefined | null;

export function resolveRouteParam(value: RouteParamValue): string | undefined {
  if (value == null) return undefined;
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === 'string' && item.trim().length > 0);
    return first?.trim();
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Безопасная передача даты в query params (ISO ломает Android из‑за `:`). */
export function formatRouteEventDate(date: Date): string {
  return String(date.getTime());
}

/** Принимает timestamp из router или legacy ISO-строку. */
export function parseRouteEventDate(value: RouteParamValue): string | undefined {
  const raw = resolveRouteParam(value);
  if (!raw) return undefined;

  if (/^\d+$/.test(raw)) {
    const parsed = new Date(Number(raw));
    if (Number.isNaN(parsed.getTime())) return undefined;
    return parsed.toISOString();
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

export function resolveRouteParams<T extends Record<string, RouteParamValue>>(
  params: T
): Record<keyof T, string | undefined> {
  const resolved = {} as Record<keyof T, string | undefined>;
  for (const key of Object.keys(params) as (keyof T)[]) {
    resolved[key] = resolveRouteParam(params[key]);
  }
  return resolved;
}
