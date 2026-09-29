"use client";

import { useEffect, useState } from "react";

// Responses by URL, so switching back to an earlier selection is instant.
// Data changes once a day; a page reload starts fresh.
const cache = new Map<string, unknown>();
const MAX_CACHED = 100;

/**
 * Fetch JSON from an API URL (null = nothing to fetch). Requests are debounced
 * so rapid clicks send one request, and a newer URL aborts the older request,
 * so a slow response can never overwrite a newer one. While loading, the
 * previous data stays available so the UI can dim it instead of blanking.
 */
export function useApi<T>(url: string | null, { debounceMs = 150 } = {}) {
  const [data, setData] = useState<T | null>(() => (url && (cache.get(url) as T)) || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!url) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    if (cache.has(url)) {
      setData(cache.get(url) as T);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? `Request failed (HTTP ${res.status})`);
        }
        const json = (await res.json()) as T;
        if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value!);
        cache.set(url, json);
        setData(json);
        setLoading(false);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError((err as Error).message || "Request failed");
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [url, attempt, debounceMs]);

  return { data, loading, error, retry: () => setAttempt((n) => n + 1) };
}
