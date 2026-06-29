import { useEffect, useRef } from 'react';

/**
 * __DEV__-only render counter for profiling album edit screens on device.
 * Enable: globalThis.__ALBUM_PERF_LOG__ = true in Metro / debugger.
 */
export function useDevRenderCount(label: string): void {
  const countRef = useRef(0);

  useEffect(() => {
    if (!__DEV__) return;
    const enabled = (globalThis as { __ALBUM_PERF_LOG__?: boolean }).__ALBUM_PERF_LOG__;
    if (!enabled) return;

    countRef.current += 1;
    console.log(`[album-perf] ${label} render #${countRef.current}`);
  });
}
