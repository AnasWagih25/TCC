The storefront now uses **2GHX+38V, Second New Cairo, Cairo Governorate 4761201**.

Google Maps resolved the destination pin to **30.0277375, 31.5482969**.
Contact directions, checkout maps, new pickup orders, and delivery distance calculations use this location. Pickup hours are preserved.

Firebase rejected the settings write with `PERMISSION_DENIED`; no authenticated admin session was available. `resolvePickupSettings` migrates the two previous branch pins when loading Firebase settings or cached settings, so they cannot override the requested location. Other future admin-selected pins are preserved.

To persist the change to Firebase, sign into the website admin dashboard and save **Pickup Location Settings**. The admin form loads the new resolved address and coordinates. `pickup-location-update.json` contains the location fields for a deployment with authorized Firebase access.
