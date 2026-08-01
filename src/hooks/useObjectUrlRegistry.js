import { useCallback, useEffect, useRef } from 'react';

export function createObjectUrlRegistry(urlApi = URL) {
  const urls = new Set();
  return {
    create(value) {
      const url = urlApi.createObjectURL(value);
      urls.add(url);
      return url;
    },
    track(url) {
      if (url) urls.add(url);
      return url;
    },
    revoke(url) {
      if (!url || !urls.delete(url)) return false;
      urlApi.revokeObjectURL(url);
      return true;
    },
    revokeAll() {
      for (const url of urls) urlApi.revokeObjectURL(url);
      urls.clear();
    },
    get size() {
      return urls.size;
    },
  };
}

export default function useObjectUrlRegistry(urlApi = URL) {
  const registryRef = useRef(null);
  if (!registryRef.current) registryRef.current = createObjectUrlRegistry(urlApi);

  useEffect(() => () => registryRef.current.revokeAll(), []);

  return {
    createObjectUrl: useCallback((value) => registryRef.current.create(value), []),
    trackObjectUrl: useCallback((url) => registryRef.current.track(url), []),
    revokeObjectUrl: useCallback((url) => registryRef.current.revoke(url), []),
    revokeAllObjectUrls: useCallback(() => registryRef.current.revokeAll(), []),
  };
}
