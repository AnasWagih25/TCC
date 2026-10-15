export type PickupSettings = {
  address: string;
  lat: number;
  lng: number;
  mapUrl: string;
  hoursNotice: string;
};

export const defaultPickupSettings: PickupSettings = {
  address: '2GHX+38V, Second New Cairo, Cairo Governorate 4761201',
  lat: 30.0277375,
  lng: 31.5482969,
  mapUrl: 'https://www.google.com/maps/dir/?api=1&destination=30.0277375,31.5482969',
  hoursNotice: 'Next day from 12:00 PM to 8:00 PM only',
};

/** Migrate the previous branch pin from older Firebase records and browser caches.
 * Other administrator-selected locations and pickup hours remain editable. */
export function resolvePickupSettings(settings: PickupSettings): PickupSettings {
  const previousBranch =
    (settings.lat === 29.9775379 && settings.lng === 31.3876624) ||
    (settings.lat === 30.045 && settings.lng === 31.48);
  if (!previousBranch) return settings;
  return {
    ...settings,
    address: defaultPickupSettings.address,
    lat: defaultPickupSettings.lat,
    lng: defaultPickupSettings.lng,
    mapUrl: defaultPickupSettings.mapUrl,
  };
}
