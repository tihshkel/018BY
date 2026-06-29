/** Deterministic annotation ids — stable across pageValuesToAnnotations rebuilds. */
export function stableAnnotationId(
  kind: string,
  ...parts: (string | number | undefined)[]
): string {
  const suffix = parts
    .filter((part) => part !== undefined && part !== '')
    .map(String)
    .join('-');
  return suffix ? `ann-${kind}-${suffix}` : `ann-${kind}`;
}
