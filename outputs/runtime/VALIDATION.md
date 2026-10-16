# Published-site repair — 16 October 2026

Target: https://www.thecookieconcept.live (Vercel).

## Confirmed causes and fixes

- Production `/api/orders` and admin health crashed before route error handling: Firebase Admin 14 → `jwks-rsa` → ESM-only `jose` could not load under Vercel’s CommonJS configuration. Node 24 alone did not solve it. Firebase Admin 13.10.0 restores compatible module loading; the regression test runs with `--no-experimental-require-module` and passed.
- Vercel had no application server environment variables. Firebase, email and retry settings are now configured; credentials/tokens are saved as Secret values. Values were compared privately to the local configuration before saving, without printing them.
- Deployed Firestore rules had no review/category write permissions, including for staff. Storage denied anonymous review-photo uploads. Complete compiled rules were published and verified with real anonymous/staff requests.
- The old blanket database read rule exposed private records. Repaired rules preserve public catalog/settings/published reviews while protecting orders, pending reviews and email jobs.
- Reviews now update through live subscriptions; definite permission errors retain content and unlock editing rather than misleadingly locking every error as an uncertain save.
- Empty/non-JSON server failures now show a useful checkout error and preserve the retry reference.
- Selecting a map-search result no longer submits the checkout form.
- Contact requests now reject malformed/oversized data, escape customer HTML, provide plain text and reply-to, bound SMTP waits and check acceptance.

## Verification

- **48 automated tests** cover checkout transactions/retries/options/stock, SMTP failures, review uploads/subscriptions/errors, contact validation/escaping, privacy guards and the exact runtime compatibility failure.
- Production build (`npx next build --webpack`), TypeScript and targeted ESLint passed. Existing social metadata warning (`metadataBase`) remains unrelated to submission handling.
- **14 live Firebase checks passed**, using temporary pending/hidden reviews, a category and a JPEG photo. They verified creation, identical retries, staff edits/moderation/category CRUD, photo upload, private pending reviews/orders, and denied anonymous publishing/catalog changes. Fixtures were cleaned up.
- Actual published browser form: customer review plus photo saved, appeared in staff moderation, was edited and hidden. A separate staff-created hidden review saved too. Neither was published.
- Actual published browser checkout: `ORD-a26abd98-1b59-41b8-8ac9-40b879a84a95`, explicitly authorized diagnostic pickup order. Normal cake plus custom writing = EGP 395.00; QUIRK discount EGP 19.75; total **EGP 375.25**. Customer contacts, notes, Arabic text, custom message, pickup snapshot and unpaid cash selection matched the saved data. It appeared automatically in admin.
- Its email job was accepted by SMTP on attempt 1 at `2026-10-16T09:06:58.818Z`. No customer email was sent; notification went to the existing bakery recipient as authorized. Inbox placement was not inspected.
- Staff payment received/unpaid, fulfilled/reopened and archive/restore actions passed on the disposable order.
- Authenticated production health passed. Anonymous order-email/manual-sale/background-retry calls were denied; malformed checkout returned JSON 400 instead of an empty 500. Authenticated cron GET and staff background retries both returned 202.
- Diagnostic order/review cleanup and atomic stock restoration are recorded in `live-order-proof.json`. Restoration increments current stock, preserving concurrent real sales.

## Retry behavior and remaining limits

New order notification starts immediately after its transaction commits. Due failures are retried every minute while a staff dashboard is visible, plus a daily Vercel Cron backup at 04:00 UTC. Vercel Hobby does not support the previously assumed five-minute unattended schedule; a frequent independent scheduler requires separate hosting/scheduler configuration. No paid services were enabled.

Dependency install reports 8 moderate and 9 high advisories remaining in dependency chains; no forced incompatible upgrades were applied. Prior local-only verification is retained in `outputs/admin/VALIDATION.md`; this production report supersedes its deployment status.

The contact email retains the documented Arial email-compatibility fallback; a file-scoped Impeccable exception records that intentional choice. Storefront/dashboard typography and layout were preserved.

## Evidence

- `live-checkout-confirmation.png`
- `live-order-in-admin.png`
- `live-order-proof.json`
- `live-review-confirmation.png`
- `live-review-in-admin.png`
- `live-staff-review-saves.png`
- `firebase-rules-before-repair.json` (rollback source, no credentials)
