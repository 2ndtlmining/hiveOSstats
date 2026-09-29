/** Replace the query string without navigation or a history entry; Next.js keeps useSearchParams in sync. */
export function replaceQuery(params: Record<string, string | null | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
  if (url !== `${window.location.pathname}${window.location.search}`) {
    window.history.replaceState(window.history.state, "", url);
  }
}
