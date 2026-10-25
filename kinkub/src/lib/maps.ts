// Google Maps meeting-point links. Same rules as the trips_meeting_point_url_google check and
// public.maps_url_coords() in the database, which has the final say.

const GOOGLE_MAPS = /^https:\/\/((www\.)?google\.(com|co\.th)\/maps([/?#]|$)|maps\.google\.(com|co\.th)([/?#]|$)|maps\.app\.goo\.gl\/[A-Za-z0-9_-]+|goo\.gl\/maps\/[A-Za-z0-9_-]+)/i;
const NUM = String.raw`(-?\d{1,3}(?:\.\d+)?)`;
const PATTERNS = [
  new RegExp(String.raw`!3d${NUM}!4d${NUM}`),
  new RegExp(String.raw`[?&](?:q|query|ll|destination|center|daddr|sll)=${NUM}(?:,|%2C)(?:\+|%20)?${NUM}`, "i"),
  new RegExp(String.raw`/(?:place|search|dir)/${NUM}(?:,|%2C)(?:\+|%20)?${NUM}`, "i"),
  new RegExp(String.raw`@${NUM},${NUM}`),
];

/** Trim and add https:// when the user pasted a link without a scheme. */
export function normalizeMapsUrl(value: string) {
  const url = value.trim();
  if (!url) return "";
  return /^[a-z]+:\/\//i.test(url) ? url : `https://${url}`;
}

export const isGoogleMapsUrl = (url: string) => url.length <= 500 && !/\s/.test(url) && GOOGLE_MAPS.test(url);

/** Coordinates written in the link itself, inside Thailand. Short links have none: returns null, never a guess. */
export function parseMapsCoords(url: string): { lat: number; lon: number } | null {
  for (const pattern of PATTERNS) {
    const match = url.match(pattern);
    if (!match) continue;
    const lat = Number(match[1]);
    const lon = Number(match[2]);
    return lat >= 5.5 && lat <= 20.5 && lon >= 97.3 && lon <= 105.7 ? { lat, lon } : null;
  }
  return null;
}
