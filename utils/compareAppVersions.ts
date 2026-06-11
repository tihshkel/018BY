export function parseAppVersion(version: string): number[] {
  return version
    .trim()
    .split('.')
    .map((part) => {
      const parsed = Number.parseInt(part.replace(/[^0-9].*$/, ''), 10);
      return Number.isFinite(parsed) ? parsed : 0;
    });
}

export function compareAppVersions(current: string, latest: string): number {
  const a = parseAppVersion(current);
  const b = parseAppVersion(latest);
  const length = Math.max(a.length, b.length);

  for (let index = 0; index < length; index += 1) {
    const diff = (a[index] ?? 0) - (b[index] ?? 0);
    if (diff !== 0) return diff;
  }

  return 0;
}

export function isAppVersionOlder(current: string, latest: string): boolean {
  return compareAppVersions(current, latest) < 0;
}
