// Tiny history router shared by every page. App listens for popstate.
export function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/** Accept only same-site relative paths, so ?next= can never redirect off-site. */
export function safeNext(value: string | null | undefined, fallback = "/trips") {
  // Browsers drop tabs/newlines in URLs ("/\t/evil.com" → "//evil.com"), so reject control chars outright.
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) return fallback;
  let url: URL;
  try { url = new URL(value, window.location.origin); } catch { return fallback; }
  if (url.origin !== window.location.origin) return fallback;
  const path = url.pathname + url.search + url.hash;
  if (path.startsWith("/login") || path.startsWith("/auth/")) return fallback;
  return path;
}

export function currentPath() {
  return window.location.pathname + window.location.search;
}
