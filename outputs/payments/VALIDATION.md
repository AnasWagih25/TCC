# Deposit checkout verification — 16 October 2026

## Scope

Mandatory 50% InstaPay deposit or full InstaPay payment, private transaction screenshot upload, server OCR amount matching, accurate remaining balance, staff verification, order/email persistence and stable product/box dialogs.

## Local verification

- Production webpack build and TypeScript pass. OCR worker, both English/Arabic models and all six core variants are present in the function trace (approximately 85 MB). The existing metadataBase warning is unrelated.
- Automated tests cover payment calculation/rounding, signatures/expiry, incorrect/missing proofs, reused screenshots, atomic order/stock/email writes, safe retries, legacy saved-order recovery, receipt privacy, staff verification, email and CSV details, English/Arabic amount extraction, negative/foreign/ambiguous amounts, MIME spoofing, animated images and origin checks.
- Browser testing used the actual production build on port 3100. A clearly marked synthetic EGP 32.50 receipt matched a 50% deposit for a EGP 65 order. A EGP 65 receipt matched full payment and automatically selected the full-payment option. EGP 99 was rejected with the required amounts shown. A changed promo total invalidated the earlier match and blocked checkout.
- Both cash and InstaPay balance methods worked. No Telda choice remains for new checkout/manual sales.
- Payment layouts tested at 320, 390 and 1440 pixels without page or payment-panel horizontal overflow.
- Dialog sizing remains stable over repeated size, extras and quantity clicks. Mobile 390/320 and desktop interaction checks cover correct selections, limits, totals and add-to-bag behavior.
- A public download attempt for the uploaded synthetic screenshot returned HTTP 403. Matching screenshots are private; incorrect scans are never stored.
- Temporary cart entries and four synthetic screenshot objects were removed. No order, payment, stock reservation or email was created during this phase of browser testing. Fixture images explicitly say they are not real payments.

Physical iPhone/Android keyboard/safe-area behavior remains a hardware check. Screenshot OCR checks the displayed amount; only staff confirmation against the receiving account verifies real funds.

Screenshots: `deposit-mobile.png`, `full-payment-mobile.png`, and the dialog stabilization screenshots in `outputs/menu-dialogs/`.
