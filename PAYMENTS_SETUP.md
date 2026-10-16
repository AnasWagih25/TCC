# InstaPay deposits

Web checkout requires a screenshot for a 50% deposit or full payment to:

https://ipn.eg/S/halamorshdy/instapay/5C7G4R

The amount uses the final total, including delivery and discounts. Half-piastre deposits round up. Deposit balances can be paid by cash on delivery/pickup or InstaPay. Telda is disabled for new payments; historical records remain readable.

## Screenshot checking

The server scans English/Arabic text with bundled Tesseract models. One readable EGP amount must match the deposit or full total. Ambiguous, unreadable, foreign-currency and incorrect amounts do not unlock checkout. The detected amount identifies deposit/full payment. Changing the total or payment option requires a matching scan.

A signed, one-hour proof binds the private screenshot and amount. The server recalculates the order and checks the proof before committing the order, stock, email job and screenshot claim together. The same screenshot cannot fund another order. An identical saved order can still be recovered after the proof expires.

JPEG/PNG/WebP files are decoded, checked and normalized. Matching screenshots are stored without public download tokens under `payment-receipts/`. Invalid scans are not stored. Public Storage rules deny access; authorized staff read screenshots through a private server route. Raw OCR text is not saved or emailed.

Scans are limited to eight per client per ten minutes. Existing Firebase server credentials and the existing order email retry secret sign proofs; `PAYMENT_PROOF_SECRET` can optionally provide a separate secret. No external OCR account is required.

**An amount match does not confirm bank settlement, receipt authenticity or the recipient’s credit. Screenshots can be edited.** Staff must compare the screenshot against money received in the bakery’s account. Checkout, email and admin distinguish the automated match from confirmed funds.

## Staff workflow

1. Open **Transfer review** in the order desk, or use the link in the notification email.
2. Open the private screenshot and check the bakery’s actual InstaPay account.
3. Confirm the deposit/full transfer, or reject it and contact the customer. Fulfillment stays disabled until transfer verification.
4. For deposit orders, record the balance only after collecting it. Deposit confirmation alone never marks the whole order paid.

Records and emails include the submitted amount, remaining balance/method and receipt reference. Staff actions record audit timestamps. Emails link to staff sign-in rather than exposing the screenshot.

## Deployment

`npm ci` installs the OCR engine and both language models. Next traces the worker, core and language files into the Node.js function. The route has a 60-second maximum duration, with browser image preparation keeping uploads below the hosting request limit. See [Tesseract local installation](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md) and [Vercel function limits](https://vercel.com/docs/functions/limitations).

`FIREBASE_STORAGE_BUCKET` defaults to `thecc-1e732.firebasestorage.app`. Keep all service-account and mail credentials in environment settings. Private access is enforced even without the explicit payment-receipts Storage rule, because existing rules allow public access only to product and review image paths.
