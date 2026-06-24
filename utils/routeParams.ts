export function normalizeRouteParam(
  value?: string | string[] | null,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
