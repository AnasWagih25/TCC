# Admin dashboard and reliable ordering

The new dashboard matches the storefront and subscribes to saved Firestore orders. Checkout now confirms a server transaction before clearing the cart. The transaction saves the complete order, reserves stock, and creates a durable email job. Retries reuse the same reference. Prices, options, promo codes, stock and delivery charges are checked against current server data.

## One-time Firebase setup

Production was repaired on 16 October 2026 at `https://www.thecookieconcept.live`, hosted on Vercel. Server Firebase/email settings are configured in Vercel; credentials and retry tokens use Secret storage. Reviewed Firestore/Storage rules are published. An authorized browser test order saved correctly, appeared in admin and had its notification accepted by SMTP on the first attempt. See `outputs/runtime/VALIDATION.md` for evidence and cleanup. The steps below describe recreating the configuration.

1. In [Firebase Service accounts](https://console.firebase.google.com/project/thecc-1e732/settings/serviceaccounts/adminsdk), choose **Generate new private key** and download it. Never commit it, upload it to the site, or paste it into chat.
2. Sign into the website admin dashboard. Open **Store settings** and copy **Staff user ID**.
3. In the project terminal, replace the file path and user ID below, then run:

   ```sh
   node scripts/configure-firebase-admin.mjs '/absolute/path/to/downloaded-key.json' --admin-uid YOUR_STAFF_USER_ID --grant-admin
   ```

   This explicitly gives that existing staff user the admin claim, validates the Firebase project, and privately saves local server settings. It never prints the key. Sign out and back in to refresh the claim. Restart `npm run dev`.

4. In hosting environment variables, set the same `FIREBASE_SERVICE_ACCOUNT_JSON`, `FIREBASE_PROJECT_ID`, `ADMIN_UIDS`, and `ORDER_EMAIL_RETRY_SECRET` values. JSON is the credential file contents on one line; remove the outer single quotes used in `.env.local` when entering a hosting UI. Keep the existing `EMAIL_USER` and `EMAIL_PASS`. Optional `ORDER_NOTIFY_TO` defaults to the existing bakery recipient, `magdyhala906@gmail.com`.
5. Deploy/redeploy. Use the Node 24 runtime pinned in `package.json`. Firebase Admin remains on the compatible 13.x line: its 14.x authentication dependency failed in Vercel’s module loader. `tests/runtime.test.cjs` reproduces that hosting constraint.
6. On Vercel, also set `CRON_SECRET` to the retry secret. `vercel.json` registers a daily backup worker at 04:00 UTC, within the Hobby plan’s daily scheduling limit. The endpoint supports Vercel’s authenticated GET and external authenticated POST. New orders trigger their own notification immediately; while an authenticated dashboard is visible, it checks due retry jobs every minute. A frequent independent worker requires an external scheduler or a hosting plan supporting it; do not claim five-minute unattended retries on Hobby. Netlify’s optional function still supports its five-minute schedule when hosted there. Never put scheduler secrets in browser code.

The dashboard’s setup status checks server Firebase access, email variable presence and retry-secret presence. It does not prove SMTP delivery or that a host scheduler is running. The endpoint fails closed until server Firebase access is configured; the bag remains intact and the site reports ordering as unavailable instead of inventing a successful order.

## Firestore and Storage permissions

`firebase/firestore.rules` and `firebase/storage.rules` contain the complete repaired rules. Their order/review fragments remain separately documented. Server Admin SDK transactions create orders and reserve stock. Public catalog/settings reads remain available. Only staff with the admin claim can edit catalog/settings/categories, read orders or change fulfillment/payment/archive fields. Email jobs are server-only. Pending reviews stay private; customers can create valid pending reviews and repeat identical submissions, while staff can moderate them. JPEG customer review-photo creation is limited to the designated review path and size; product-image writes require staff access.

`scripts/firebase-rules.mjs` generates and compiles the full sources, backs up previous releases, and normally runs permission simulations before publishing with `--deploy`. The supplied service account can compile/release rules but lacks the separate simulator permission. `--deploy-compiled` explicitly supports that case; follow publication immediately with `scripts/verify-live-reviews.mjs`, which checks actual anonymous/staff operations and cleans disposable fixtures. No IAM permissions were expanded to work around the simulator restriction.

The application no longer fetches all customer orders into public storefront context or caches the admin order list in public localStorage. Recent confirmed orders in a customer tab are stored only in that tab’s session storage.

## Notification behavior

Order emails are rendered from the saved order, with customer contacts, actual selected sizes/flavors, box quantities, extra charges and text, notes, payment selection/status, fulfillment, map pin, subtotal, discount and total. They include escaped HTML and a plain-text version. The bakery recipient remains unchanged.

The order remains saved when SMTP fails. Its notification status shows the failure, retries use the durable job, and staff can retry from order details. “Email accepted” means the SMTP server accepted it, not proof that it reached the inbox. A crash after SMTP acceptance but before recording that result can be ambiguous; check the inbox before manually retrying a notification flagged for review. Stable Message-IDs help identification but SMTP cannot promise exactly-once inbox delivery.

Order archive preserves the original record and does not change stock. Fulfillment updates do not imply payment receipt. Staff explicitly mark payment received. Manual sales reserve stock in the same transaction and preserve their agreed total.

## Release checks requiring real credentials

- Confirm the dashboard shows **Orders connected** and server configuration is ready.
- Place one explicitly designated test order on a staging Firebase project, not a real customer order. Check its full saved data, stock reservation, live admin appearance, and received email.
- Retry the same submission after a simulated lost response: one order, one stock reservation.
- Disable SMTP temporarily in staging: order persists, notification fails visibly, scheduled retry recovers it.
- Confirm an unauthenticated browser cannot list orders or write catalog/stock/settings.
- Check Netlify scheduled-function logs and SMTP inbox/bounce handling.

No software can guarantee uninterrupted network, database, hosting, or inbox delivery. The implementation makes saved-order confirmation explicit, failures visible, and retries recoverable. `outputs/runtime/VALIDATION.md` supersedes the earlier local-only verification report for production status. SMTP acceptance was verified; inbox placement was not inspected.
