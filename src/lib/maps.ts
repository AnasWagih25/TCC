import { defaultPickupSettings } from './pickup';
export function parseGoogleMapsUrl(input: string) {
  let url = input.trim();
  try { url = decodeURIComponent(url); } catch { /* Keep malformed escapes as plain input. */ }
  const number = '(-?\\d+(?:\\.\\d+)?)';
  // The place pin is more precise than the camera position after @.
  const match = url.match(new RegExp(`!3d${number}!4d${number}`))
    || url.match(new RegExp(`(?:destination|q|query|ll)=${number}\\s*,\\s*${number}`))
    || url.match(new RegExp(`/place/${number}\\s*,\\s*${number}`))
    || url.match(new RegExp(`@${number},${number}`))
    || url.match(new RegExp(`^${number}\\s*,\\s*${number}$`));
  const lat = match ? Number(match[1]) : defaultPickupSettings.lat;
  const lng = match ? Number(match[2]) : defaultPickupSettings.lng;
  const coordinatesFound = Boolean(match) && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  return {
    lat: coordinatesFound ? lat : defaultPickupSettings.lat,
    lng: coordinatesFound ? lng : defaultPickupSettings.lng,
    coordinatesFound,
    mapUrl: /^https?:\/\//.test(input.trim()) ? input.trim() : `https://www.google.com/maps/dir/?api=1&destination=${coordinatesFound ? lat : defaultPickupSettings.lat},${coordinatesFound ? lng : defaultPickupSettings.lng}`,
  };
}
