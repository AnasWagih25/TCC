# Customer reviews

Implemented in the existing Firebase project (`thecc-1e732`), using the `reviews` Firestore collection and `review-photos/{reviewId}/{photoId}.jpg` Storage path. No fabricated reviews are seeded.

Customers can submit their name, a 1–5 star rating, title, written review, optional product and up to three images. Images are decoded, resized to at most 1400 px, re-encoded as JPEG (discarding original file metadata), previewed and uploaded. A review starts as pending. The public website queries only published reviews. Submission failures retain the form contents and never report success.

Staff use **Staff portal → Reviews** to inspect pending submissions, add genuine reviews with permission, edit text, attach or remove photos, publish and hide. Hiding preserves the review. Removing a photo detaches it from the review; it does not erase the stored file.

## Firebase configuration before production

**Production status, 16 October 2026:** the previous deployed rules blocked review/category writes and anonymous photo uploads. The complete repaired rules in `firebase/firestore.rules` and `firebase/storage.rules` are now published. Fourteen live access checks passed, including public pending submissions/photos, staff hidden reviews/moderation/category CRUD, and denied public access to private orders/pending reviews. The actual browser photo-review form and staff add/edit/hide flows passed too. Temporary diagnostic reviews were never published and were removed after verification. Public and staff views now subscribe to changes automatically. The fragment-merging steps below are historical integration guidance; use the full reviewed rules when recreating this deployment.

The app does not deploy or overwrite the project's existing Firebase permissions. Inspect the deployed rules, then merge the supplied Firestore and Storage fragments into the appropriate existing match blocks. Broad existing allow rules also apply and must not accidentally grant public moderation access. Do not replace the full ruleset with either fragment.

1. Merge `firebase/reviews.firestore.rules` inside the existing `/databases/{database}/documents` match.
2. Merge `firebase/reviews.storage.rules` inside the existing `/b/{bucket}/o` match.
3. Using a trusted Firebase Admin environment, assign the `admin: true` custom claim to authorized existing staff accounts. Staff must sign out and back in to refresh their token. Public users must never receive this claim. Existing staff login alone is not sufficient under the supplied rules.
4. Verify in the Firebase rules simulator/emulator: anonymous users can create pending customer reviews, cannot publish/read pending reviews, may repeat an identical pending write but cannot change any field, and staff can read/edit all statuses. Confirm photo upload access on the configured bucket. Public uploads should be protected with Firebase App Check and service quotas before a public launch; this repository does not provision those services.
5. No composite index is required: public reads use a single `status == published` filter. Current views load up to 200 reviews and sort/filter that set in the browser. Add cursor pagination if the collection grows beyond that limit.

## Review lifecycle

Only a confirmed Firestore write produces the success message. Slow connections stop waiting after a deadline, preserving the form and document ID for a retry. A late write may have reached the server; the prepared document (including timestamp and uploaded photo URLs) is retained and the form is locked. Retries write that exact document without re-uploading images; the rules permit only identical public rewrites while pending, preventing duplicate reviews or substantive public updates. If moderation has already changed its state, public confirmation can be denied and the form advises contacting the team. Image attempts use unique object names; failed submissions can leave unreferenced uploads, which staff can remove later with a bucket lifecycle/cleanup job. Replacing or hiding a review does not erase its images. Download URLs should be treated as public once shared.

The app has no order-verification service, so it does not label submissions “verified purchases.” Genuine reviews can be supplemented by staff with customer permission.

## Checks

Run `npx tsc --noEmit` and `npm run build`. Public display, form validation, image preview/removal, responsive layout, menu ordering and keyboard modal behavior are checked locally. Cloud write/moderation success must be verified with authorized accounts and a test Firebase project before production; no test reviews or orders are submitted to the live bakery during UI checks.
