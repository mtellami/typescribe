'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/store/session';

export function useVideoLibrary() {
  const [loadError, setLoadError] = useState(false);
  const fetchLibrary = useCallback(async (signal?: AbortSignal) => {
    setLoadError(false);
    try {
      const response = await fetch('/api/videos', { signal });
      const body = await response.json();
      if (!response.ok || !Array.isArray(body.videos))
        throw new Error('Library unavailable');
      useSession.getState().setFeatured(body.videos);
    } catch {
      if (!signal?.aborted) {
        useSession.setState({ featured: [], featuredLoaded: false });
        setLoadError(true);
      }
    }
  }, []);
  useEffect(() => {
    if (useSession.getState().featuredLoaded) return;
    const controller = new AbortController();
    void fetchLibrary(controller.signal);
    return () => controller.abort();
  }, [fetchLibrary]);
  return { loadError, retry: () => void fetchLibrary() };
}
