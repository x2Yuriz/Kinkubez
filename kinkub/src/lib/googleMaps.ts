/// <reference types="google.maps" />
// Loads the Google Maps JavaScript API once, without an npm loader. The key is a browser key:
// restrict it to your domains in Google Cloud (HTTP referrers) and to the Maps JavaScript API.

const KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
export const isGoogleMapsConfigured = !!KEY;

export type GoogleMapsLibs = { maps: google.maps.MapsLibrary; core: google.maps.CoreLibrary };

let loading: Promise<GoogleMapsLibs> | null = null;
const authListeners = new Set<() => void>();
let authFailed = false;

declare global {
  interface Window { gm_authFailure?: () => void; __kkMapsReady?: () => void }
}

/** Google calls this when the key is invalid, not allowed on this domain, or billing is off. */
export function onMapsAuthFailure(listener: () => void) {
  if (authFailed) listener();
  authListeners.add(listener);
  return () => { authListeners.delete(listener); };
}

export function loadGoogleMaps(): Promise<GoogleMapsLibs> {
  if (!KEY) return Promise.reject(new Error("missing-key"));
  loading ??= new Promise<void>((resolve, reject) => {
    window.gm_authFailure = () => { authFailed = true; authListeners.forEach((listener) => listener()); };
    window.__kkMapsReady = () => resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(KEY)}&v=weekly&language=th&region=TH&loading=async&callback=__kkMapsReady`;
    script.async = true;
    script.onerror = () => { loading = null; script.remove(); reject(new Error("network")); };
    document.head.append(script);
  }).then(async () => {
    const [maps, core] = await Promise.all([
      google.maps.importLibrary("maps") as Promise<google.maps.MapsLibrary>,
      google.maps.importLibrary("core") as Promise<google.maps.CoreLibrary>,
    ]);
    return { maps, core };
  });
  return loading;
}
