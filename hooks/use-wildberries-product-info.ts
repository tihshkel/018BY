import { useEffect, useState } from 'react';

import {
  getWildberriesProductInfo,
  peekWildberriesProductInfo,
  type WildberriesProductInfo,
} from '@/utils/wildberriesProductInfo';

export function useWildberriesProductInfo(link: string | undefined) {
  const [info, setInfo] = useState<WildberriesProductInfo | null>(() =>
    link ? peekWildberriesProductInfo(link) : null,
  );

  useEffect(() => {
    if (!link) {
      setInfo(null);
      return;
    }

    const cached = peekWildberriesProductInfo(link);
    if (cached) {
      setInfo((prev) => (prev?.nmId === cached.nmId ? prev : cached));
      return;
    }

    let cancelled = false;
    getWildberriesProductInfo(link)
      .then((result) => {
        if (!cancelled && result) {
          setInfo((prev) => (prev?.nmId === result.nmId ? prev : result));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [link]);

  return info;
}
