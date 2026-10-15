# Admin dashboard verification — 16 October 2026

## Result

The local dashboard is connected to the real Firebase project and uses the storefront’s typography, colors and light/dark themes. The supplied service credential remains in ignored, owner-only local environment configuration. No credential is included in this report or application client code.

| Previously | Implemented behavior |
| --- | --- |
| Checkout could report success after a failed database save | Only a confirmed server transaction returns a successful order; uncertain submissions retain their reference for recovery |
| Repeated requests could create duplicate work | Deterministic order reference, receipt check and transaction reserve inventory once |
| Order email trusted a browser payload and could disappear | Email is rendered from the saved order and backed by a durable retry job |
| Dashboard order list could become stale | Live subscription reports connection/cache/write states and supports reconnect |
| Dense admin controls did not match the storefront | Dedicated warm workspace, readable details, responsive navigation, native dialogs and visible action feedback |
| Missing historical payment/details could appear authoritative | Incomplete records remain readable and explicitly flag missing information |
| Editing a product could overwrite stock reserved during checkout | Transactions preserve newer stock or reject conflicting explicit stock edits |

## Automated checks

- `node --test tests/*.test.cjs`: **39 passed, 0 failed**. Includes transaction atomicity, concurrent retries, persistence failures, inventory aggregation, option/promo/delivery validation, receipt conflicts, response-loss recovery, email completeness/escaping, SMTP retries/ambiguous acceptance, legacy order normalization, CSV safety, stock-edit conflicts, image fallback, pickup parsing and review submission failures.
- ESLint on the changed admin, API, ordering, context, checkout and scheduled-worker files: **passed with no errors or warnings** after the final worker-export adjustment.
- `npx next build --webpack`: **passed**, including TypeScript and all 19 generated pages. The default Turbopack build hit a local process/port permission failure, including when retried outside the sandbox. The alternate production compiler completed successfully.
- Build emitted an existing missing `metadataBase` warning for social preview URLs; configure the published origin during deployment.

## Live verification

- Firebase service-account authentication and database reads passed.
- Existing staff account’s admin claim was configured and verified; authenticated dashboard access and the server readiness check passed.
- An isolated `verificationRuns` database namespace exercised the actual order transaction and realtime subscription: concurrent identical requests produced one order, one inventory reduction and one email job. Temporary verification data was cleaned up.
- Existing orders, products, categories, review moderation, settings, order details and editing forms were inspected in the signed-in browser. Real customer fulfillment, payment and archive states were not changed for testing.
- Actual crop/upload to staff image storage completed; its temporary image was removed after verification. Uploads subsequently gained cancellation and a bounded timeout; that final cancellation branch was type/lint checked rather than exercised against another live upload.
- SMTP authentication/connection passed. **No real order notification was sent**. `order-email-preview.html` and `.txt` contain fictional preview data only.
- Desktop at 1440px and phones at 390px/320px checked. All five mobile navigation items fit, the 320px document has no horizontal overflow, and both themes render. Temporary viewport overrides were cleared.
- Pickup settings use the requested Second New Cairo location. Original catalog categories were restored only where missing.

## Deployment work still required

Follow `ADMIN_SETUP.md` to configure hosting secrets, deploy the app and Netlify scheduled worker, and merge the supplied Firestore rules with the existing catalog/review rules. Production rules and scheduler were not deployed in this session. Verify an authorized staging order’s received email and scheduler logs before launch. SMTP acceptance alone does not establish inbox delivery.

Dependency audit reports **0 critical and 9 high advisories** remaining through Firebase client gRPC and development glob/braces dependencies. Direct Next.js and Nodemailer updates were applied; forced major downgrades proposed by npm were not applied. The remaining dependency chains require a separate compatible remediation review.

## Screenshots and previews

- `dashboard-desktop.png`
- `dashboard-mobile-light.png`
- `dashboard-mobile-dark.png` (captured before the final compact-navigation adjustment)
- `order-details.png`
- `settings-desktop.png`
- `order-email-preview.html`
- `order-email-preview.txt`
